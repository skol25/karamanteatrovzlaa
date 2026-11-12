import { all } from './db';
import { sweepExpired } from './reservations';
import { validatePlan, expandMap, seatLabel, W, type Plan } from '#lib/seatmap.ts';

export type PlanoResult =
	| { ok: true; layout: string | null; capacity: number; price: number; summary: string }
	| { ok: false; error: string };

/**
 * Lee el plano que deja PlanoEditor en el formulario (mode, map, capacity, price_usd) y lo valida.
 * Si se pasan puestos tomados y el plano anterior, no deja renumerar mesas ni quitar puestos ocupados.
 */
export function readPlano(fd: FormData, opts: { locked?: string[]; previous?: string | null } = {}): PlanoResult {
	const locked = opts.locked ?? [];
	let plan: Plan;
	try {
		const raw = JSON.parse(String(fd.get('map') ?? ''));
		const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : d);
		plan = {
			kind: 'libre',
			w: num(raw.w, W) || W,
			zones: raw.zones.map((z: any) => ({ id: String(z.id), name: String(z.name).trim().slice(0, 30), color: String(z.color), price: Math.round(Number(z.price) * 100) / 100 })),
			stage: { x: num(raw.stage?.x), y: num(raw.stage?.y), w: num(raw.stage?.w, 660), h: num(raw.stage?.h, 56), label: String(raw.stage?.label ?? 'Escenario').slice(0, 30) },
			items: raw.items.map((it: any) =>
				it.type === 'mesa'
					? { type: 'mesa', key: String(it.key), n: num(it.n), x: num(it.x), y: num(it.y), seats: num(it.seats), zone: String(it.zone) }
					: {
							type: 'butacas',
							key: String(it.key),
							x: num(it.x),
							y: num(it.y),
							rows: num(it.rows),
							cols: num(it.cols),
							rowStart: String(it.rowStart ?? 'A').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || 'A',
							numStart: num(it.numStart, 1),
							zone: String(it.zone)
						}
			)
		};
	} catch {
		return { ok: false, error: 'El plano no es válido.' };
	}
	const err = validatePlan(plan);
	if (err) return { ok: false, error: err };
	const ex = expandMap(plan);
	const missing = locked.filter((s) => !ex.byId[s]);
	if (missing.length)
		return {
			ok: false,
			error: `No se puede guardar: ${missing.length} puesto(s) ya apartados o vendidos quedarían fuera del plano (${missing.slice(0, 6).map(seatLabel).join(', ')}${missing.length > 6 ? '…' : ''}).`
		};
	return {
		ok: true,
		layout: JSON.stringify(plan),
		capacity: ex.capacity,
		price: Math.min(...plan.zones.map((z) => z.price)),
		summary: `${ex.tables.length ? ex.tables.length + ' mesas · ' : ''}${ex.capacity} puestos · ${plan.zones.map((z) => `${z.name} $${z.price}`).join(', ')}`
	};
}

/** Puestos que no se pueden quitar del plano: apartados, en revisión o vendidos */
export async function lockedSeats(perfId: number) {
	await sweepExpired();
	const rows = await all<{ seat: string }>(
		`SELECT seat FROM reservation_seats WHERE performance_id=?
		 UNION SELECT l.seat FROM reservation_seat_log l JOIN reservations r ON r.id=l.reservation_id
		 WHERE r.performance_id=? AND r.status='confirmed'`,
		[perfId, perfId]
	);
	return rows.map((r) => r.seat);
}
