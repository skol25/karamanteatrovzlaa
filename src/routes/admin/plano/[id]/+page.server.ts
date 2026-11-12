import { error, fail, redirect } from '@sveltejs/kit';
import { get, all, run } from '#lib/server/db.ts';
import { audit } from '#lib/server/audit.ts';
import { sweepExpired } from '#lib/server/reservations.ts';
import { parseMap, validateMap, expandMap, type SeatMap } from '#lib/seatmap.ts';
import { allSeatIds } from '#lib/seats.ts';
import { fechaCorta, hora } from '#lib/format.ts';

type Perf = { id: number; title: string; starts_at: string; venue: string; capacity: number; price_usd: number; layout: string | null };

const loadPerf = (id: number) =>
	get<Perf>('SELECT p.id, s.title, p.starts_at, p.venue, p.capacity, p.price_usd, p.layout FROM performances p JOIN shows s ON s.id=p.show_id WHERE p.id=?', [id]);

/** Puestos que no se pueden quitar del plano: apartados, en revisión o vendidos */
async function lockedSeats(perfId: number) {
	await sweepExpired();
	const rows = await all<{ seat: string }>(
		`SELECT seat FROM reservation_seats WHERE performance_id=?
		 UNION SELECT l.seat FROM reservation_seat_log l JOIN reservations r ON r.id=l.reservation_id
		 WHERE r.performance_id=? AND r.status='confirmed'`,
		[perfId, perfId]
	);
	return rows.map((r) => r.seat);
}

export const load = async ({ params, locals }) => {
	if (!locals.admin) redirect(303, '/admin');
	const perf = await loadPerf(Number(params.id));
	if (!perf) error(404, 'Función no encontrada');
	return { perf, map: parseMap(perf.layout), locked: await lockedSeats(perf.id) };
};

export const actions = {
	guardar: async (event) => {
		if (!event.locals.admin) redirect(303, '/admin');
		const perf = await loadPerf(Number(event.params.id));
		if (!perf) return fail(404, { error: 'Función no encontrada.' });
		const fd = await event.request.formData();
		const mode = String(fd.get('mode'));
		const locked = await lockedSeats(perf.id);

		let layout: string | null = null;
		let capacity: number;
		let price: number;
		let summary: string;
		if (mode === 'mesas') {
			let map: SeatMap;
			try {
				map = JSON.parse(String(fd.get('map') ?? ''));
				map.kind = 'mesas';
				map.zones = map.zones.map((z) => ({ id: String(z.id), name: String(z.name).trim().slice(0, 30), color: String(z.color), price: Math.round(Number(z.price) * 100) / 100 }));
				map.rows = map.rows.map((r) => ({ zone: String(r.zone), tables: Math.floor(Number(r.tables)), seats: Math.floor(Number(r.seats)) }));
			} catch {
				return fail(400, { error: 'El plano no es válido.' });
			}
			const err = validateMap(map);
			if (err) return fail(400, { error: err });
			const ex = expandMap(map);
			// Con puestos tomados no se puede renumerar: las filas existentes deben quedar con las mismas mesas y puestos
			const old = parseMap(perf.layout);
			if (locked.length && old) {
				const same = old.rows.every((r, i) => map.rows[i] && map.rows[i].tables === r.tables && map.rows[i].seats === r.seats);
				if (!same)
					return fail(400, {
						error: 'Ya hay puestos apartados o vendidos: puedes cambiar zonas, precios y colores, o agregar filas al final, pero no quitar ni cambiar las mesas de las filas existentes.'
					});
			}
			const missing = locked.filter((s) => !ex.byId[s]);
			if (missing.length)
				return fail(400, { error: `No se puede guardar: ${missing.length} puesto(s) ya apartados o vendidos quedarían fuera del plano (${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}).` });
			layout = JSON.stringify(map);
			capacity = ex.capacity;
			price = Math.min(...map.zones.map((z) => z.price));
			summary = `${map.rows.length} filas · ${ex.rows.reduce((a, r) => a + r.tables.length, 0)} mesas · ${capacity} puestos · ${map.zones.map((z) => `${z.name} $${z.price}`).join(', ')}`;
		} else {
			capacity = Math.floor(Number(fd.get('capacity')));
			price = Math.round(Number(String(fd.get('price_usd') ?? '').replace(',', '.')) * 100) / 100;
			if (!(capacity > 0 && capacity <= 1000) || !(price > 0)) return fail(400, { error: 'Revisa el aforo y el precio.' });
			const ids = allSeatIds(capacity);
			const missing = locked.filter((s) => !ids.has(s));
			if (missing.length) return fail(400, { error: `No se puede guardar: hay ${missing.length} puesto(s) ya apartados o vendidos en el plano actual.` });
			summary = `Butacas · ${capacity} personas · $${price}`;
		}
		await run('UPDATE performances SET layout=?, capacity=?, price_usd=? WHERE id=?', [layout, capacity, price, perf.id]);
		await audit(event, {
			kind: 'admin',
			action: 'plano_editado',
			summary: `Cambió el plano de «${perf.title}» (${fechaCorta(perf.starts_at)} ${hora(perf.starts_at)}): ${summary}`,
			entity: 'funcion',
			entityId: perf.id,
			detail: { antes: perf.layout ? JSON.parse(perf.layout) : { butacas: perf.capacity, precio: perf.price_usd }, ahora: layout ? JSON.parse(layout) : { butacas: capacity, precio: price } }
		});
		return { notice: 'Plano guardado.' };
	}
};
