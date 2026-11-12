import crypto from 'node:crypto';
import { all, get, run, batch } from './db';
import { config } from './config';
import { currentRate } from './bcv';
import { saveFile, readFile, deleteFile } from './files';
import { allSeatIds, sortSeats } from '#lib/seats.ts';
import { sendMail } from './mail';
import { bs, fechaCorta } from '#lib/format.ts';
import { audit } from './audit';
import { adminPaymentMail, buyerReceivedMail, ticketsMail, rejectedMail, resCode } from './emails';
import { adminEmails } from './settings';

export type Performance = {
	id: number;
	show_id: number;
	starts_at: string;
	venue: string;
	address: string;
	maps_url: string;
	price_usd: number;
	capacity: number;
};

export type Reservation = {
	id: number;
	token: string;
	performance_id: number;
	qty: number;
	status: 'held' | 'submitted' | 'confirmed' | 'rejected' | 'expired';
	expire_reason: string | null;
	rate_id: number;
	rate: number;
	rate_date: string;
	unit_usd: number;
	total_usd: number;
	total_bs: number;
	expires_at: number;
	created_at: number;
	buyer_name: string | null;
	buyer_doc: string | null;
	email: string | null;
	phone: string | null;
	pay_method: string | null;
	pay_bank: string | null;
	pay_ref: string | null;
	receipt_file: string | null;
	receipt_mime: string | null;
	submitted_at: number | null;
	resolved_at: number | null;
	admin_note: string | null;
};

export class BookingError extends Error {}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Libera reservas cuyo plazo de pago venció o cuya cotización quedó vieja porque cambió la
 * tasa BCV vigente. Se ejecuta en cada consulta relevante (no hace falta un proceso aparte).
 */
export async function sweepExpired() {
	const now = Date.now();
	const rate = await currentRate();
	const [byTime, byRate] = await batch([
		{
			sql: `UPDATE reservations SET status='expired', expire_reason='tiempo' WHERE status='held' AND expires_at <= ? RETURNING id, qty, performance_id`,
			args: [now]
		},
		{
			sql: `UPDATE reservations SET status='expired', expire_reason='tasa' WHERE status='held' AND rate_id <> ? RETURNING id, qty, performance_id`,
			args: [rate?.id ?? -1]
		},
		{
			sql: `DELETE FROM reservation_seats WHERE reservation_id IN (SELECT id FROM reservations WHERE status IN ('expired','rejected'))`,
			args: []
		}
	]);
	const log = (rows: typeof byTime.rows, why: string) =>
		Promise.all(
			rows.map((r) =>
				audit(null, {
					kind: 'sistema',
					action: 'reserva_vencida',
					summary: `Reserva #${r.id} vencida ${why}: se liberaron ${r.qty} asiento${Number(r.qty) === 1 ? '' : 's'}`,
					entity: 'reserva',
					entityId: Number(r.id)
				})
			)
		);
	if (byTime.rows.length || byRate.rows.length)
		await Promise.all([log(byTime.rows, `(pasaron ${config.holdMinutes} min sin pago)`), log(byRate.rows, '(cambió la tasa BCV)')]);
}

/** Texto corto de una reserva para el registro de auditoría */
export async function describeReservation(id: number) {
	const r = await get<{ id: number; qty: number; total_bs: number; buyer_name: string | null; title: string; starts_at: string; seats: string }>(
		`SELECT r.id, r.qty, r.total_bs, r.buyer_name, s.title, p.starts_at,
		 (SELECT group_concat(seat, ', ') FROM reservation_seat_log l WHERE l.reservation_id=r.id) seats
		 FROM reservations r JOIN performances p ON p.id=r.performance_id JOIN shows s ON s.id=p.show_id WHERE r.id=?`,
		[id]
	);
	if (!r) return { text: `Reserva #${id}`, data: null };
	const text = `#${r.id} · ${r.title} (${fechaCorta(r.starts_at)}) · ${r.qty} entrada${r.qty === 1 ? '' : 's'} [${r.seats}] · ${bs(r.total_bs)}${r.buyer_name ? ' · ' + r.buyer_name : ''}`;
	return { text, data: r };
}

export type PerfFull = Performance & {
	title: string;
	slug: string;
	duration_min: number;
	age_rating: string;
	variant: number;
	poster: string | null;
};

export function getPerformance(id: number) {
	return get<PerfFull>(
		`SELECT p.*, s.title, s.slug, s.duration_min, s.age_rating, s.variant, s.poster
		 FROM performances p JOIN shows s ON s.id=p.show_id WHERE p.id=?`,
		[id]
	);
}

/** Asientos ocupados (apartados esperando pago, en revisión o confirmados) */
export async function takenSeats(performanceId: number): Promise<string[]> {
	await sweepExpired();
	return (await all<{ seat: string }>('SELECT seat FROM reservation_seats WHERE performance_id=?', [performanceId])).map((r) => r.seat);
}

/** Aparta los asientos por HOLD_MINUTES y genera la cotización en bolívares con la tasa vigente */
export async function holdSeats(performanceId: number, seats: string[]): Promise<string> {
	await sweepExpired();
	const perf = await getPerformance(performanceId);
	if (!perf) throw new BookingError('La función no existe.');
	if (new Date(perf.starts_at).getTime() <= Date.now()) throw new BookingError('Esta función ya comenzó o ya pasó.');

	const unique = [...new Set(seats)];
	if (unique.length === 0) throw new BookingError('Selecciona al menos un asiento.');
	if (unique.length > config.maxTicketsPerOrder)
		throw new BookingError(`Puedes comprar hasta ${config.maxTicketsPerOrder} entradas por compra.`);
	const valid = allSeatIds(perf.capacity);
	if (unique.some((s) => !valid.has(s))) throw new BookingError('Hay asientos que no existen en esta sala.');

	const rate = await currentRate();
	if (!rate)
		throw new BookingError('Todavía no tenemos la tasa oficial BCV de hoy, así que no podemos cotizar. Intenta de nuevo en unos minutos.');

	const token = crypto.randomBytes(18).toString('base64url');
	const now = Date.now();
	const totalUsd = round2(perf.price_usd * unique.length);
	const totalBs = round2(totalUsd * rate.rate);
	const resId = `(SELECT id FROM reservations WHERE token=?)`;

	// Todo en una sola operación atómica: si algún asiento ya está tomado, no se aparta ninguno.
	try {
		await batch([
			{
				sql: `INSERT INTO reservations (token, performance_id, qty, status, rate_id, rate, rate_date, unit_usd, total_usd, total_bs, expires_at, created_at)
					  VALUES (?,?,?, 'held', ?,?,?,?,?,?,?,?)`,
				args: [token, perf.id, unique.length, rate.id, rate.rate, rate.valid_date, perf.price_usd, totalUsd, totalBs, now + config.holdMinutes * 60000, now]
			},
			...unique.flatMap((s) => [
				{ sql: `INSERT INTO reservation_seats (performance_id, seat, reservation_id) VALUES (?,?,${resId})`, args: [perf.id, s, token] },
				{ sql: `INSERT INTO reservation_seat_log (reservation_id, seat) VALUES (${resId},?)`, args: [token, s] }
			])
		]);
	} catch (e) {
		if (!/UNIQUE|constraint/i.test(String((e as Error).message))) throw e;
		const taken = new Set(await takenSeats(perf.id));
		const clash = unique.filter((s) => taken.has(s));
		throw new BookingError(
			clash.length
				? `${clash.length > 1 ? 'Los asientos' : 'El asiento'} ${clash.join(', ')} acaba${clash.length > 1 ? 'n' : ''} de ser tomado${clash.length > 1 ? 's' : ''} por otra persona. Elige otro${clash.length > 1 ? 's' : ''}.`
				: 'Uno de los asientos acaba de ser tomado. Elige otro.'
		);
	}
	return token;
}

export async function getReservation(token: string) {
	await sweepExpired();
	const r = await get<Reservation>('SELECT * FROM reservations WHERE token=?', [token]);
	if (!r) return null;
	const seats = sortSeats((await all<{ seat: string }>('SELECT seat FROM reservation_seat_log WHERE reservation_id=?', [r.id])).map((s) => s.seat));
	return { ...r, seats, performance: (await getPerformance(r.performance_id))! };
}

export async function cancelHold(token: string) {
	await batch([
		{ sql: `UPDATE reservations SET status='expired', expire_reason='cancelada' WHERE token=? AND status='held'`, args: [token] },
		{ sql: `DELETE FROM reservation_seats WHERE reservation_id IN (SELECT id FROM reservations WHERE token=? AND status='expired')`, args: [token] }
	]);
}

const ALLOWED: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'application/pdf': '.pdf'
};
/** Vercel acepta como máximo ~4,5 MB por petición */
export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;

export type PaymentInput = {
	buyer_name: string;
	buyer_doc: string;
	email: string;
	phone: string;
	pay_method: string;
	pay_bank: string;
	pay_ref: string;
	file: File;
};

/** Registra el comprobante, lo guarda y notifica al admin y al comprador */
export async function submitPayment(token: string, input: PaymentInput) {
	const r = await getReservation(token);
	if (!r) throw new BookingError('Reserva no encontrada.');
	if (r.status !== 'held') throw new BookingError('Esta reserva ya no está activa.');
	if (r.expires_at <= Date.now()) throw new BookingError('El tiempo para pagar se agotó.');

	const ext = ALLOWED[input.file.type];
	if (!ext) throw new BookingError('El comprobante debe ser una imagen (JPG, PNG, WEBP) o un PDF.');
	if (input.file.size > MAX_RECEIPT_BYTES) throw new BookingError('El comprobante no puede pesar más de 4 MB.');

	const buf = Buffer.from(await input.file.arrayBuffer());
	const fileId = await saveFile(buf, input.file.type, ext);

	// Se vuelve a verificar al guardar, por si venció o cambió la tasa mientras subía el archivo
	const rate = await currentRate();
	const { changes } = await run(
		`UPDATE reservations SET status='submitted', buyer_name=?, buyer_doc=?, email=?, phone=?, pay_method=?, pay_bank=?, pay_ref=?,
		 receipt_file=?, receipt_mime=?, submitted_at=? WHERE id=? AND status='held' AND expires_at > ? AND rate_id = ?`,
		[input.buyer_name, input.buyer_doc, input.email, input.phone, input.pay_method, input.pay_bank, input.pay_ref, fileId, input.file.type, Date.now(), r.id, Date.now(), rate?.id ?? -1]
	);
	if (!changes) {
		await deleteFile(fileId);
		await sweepExpired();
		throw new BookingError('La cotización venció (por tiempo o porque cambió la tasa BCV). Vuelve a elegir tus asientos.');
	}

	const full = (await getReservation(token))!;
	await Promise.all([notifyAdmin(full, buf), notifyBuyerReceived(full)]);
	return full;
}

type FullRes = NonNullable<Awaited<ReturnType<typeof getReservation>>>;

async function notifyAdmin(r: FullRes, receipt: Buffer) {
	const to = await adminEmails();
	if (!to.length) {
		console.warn('[correo] no hay correo de administración configurado: el aviso de pago solo queda en /admin');
		return;
	}
	const m = adminPaymentMail(r);
	await sendMail(to.join(', '), m.subject, m.html, [
		{ filename: `comprobante-${resCode(r)}${ALLOWED[r.receipt_mime!] ?? ''}`, content: receipt, contentType: r.receipt_mime || undefined }
	]);
}

async function notifyBuyerReceived(r: FullRes) {
	const m = buyerReceivedMail(r);
	await sendMail(r.email!, m.subject, m.html);
}

/** El admin confirma el pago: se envían las entradas al comprador */
export async function confirmReservation(id: number) {
	const r = await get<{ token: string }>(`SELECT token FROM reservations WHERE id=? AND status='submitted'`, [id]);
	if (!r) throw new BookingError('La reserva no está pendiente de revisión.');
	await run(`UPDATE reservations SET status='confirmed', resolved_at=? WHERE id=?`, [Date.now(), id]);
	const full = (await getReservation(r.token))!;
	const m = await ticketsMail(full);
	await sendMail(full.email!, m.subject, m.html, m.attachments);
	return full;
}

/** El admin rechaza el pago: se liberan los asientos y se avisa al comprador */
export async function rejectReservation(id: number, note: string) {
	const r = await get<{ token: string }>(`SELECT token FROM reservations WHERE id=? AND status='submitted'`, [id]);
	if (!r) throw new BookingError('La reserva no está pendiente de revisión.');
	await batch([
		{ sql: `UPDATE reservations SET status='rejected', resolved_at=?, admin_note=? WHERE id=?`, args: [Date.now(), note, id] },
		{ sql: 'DELETE FROM reservation_seats WHERE reservation_id=?', args: [id] }
	]);
	const full = (await getReservation(r.token))!;
	const m = rejectedMail(full, note);
	await sendMail(full.email!, m.subject, m.html);
}

export { readFile };
