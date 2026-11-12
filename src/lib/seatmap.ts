/**
 * Plano por mesas y zonas (VIP, Plata, General…), configurable desde el admin.
 * Cada función puede tener su plano; si no tiene, se usan butacas generadas por aforo (seats.ts).
 *
 * Los puestos se identifican como "M12-3" = mesa 12, puesto 3.
 * Las mesas se numeran de corrido de adelante (escenario) hacia atrás.
 */
export type Zone = { id: string; name: string; color: string; price: number };
export type MesaRow = { zone: string; tables: number; seats: number };
export type SeatMap = { kind: 'mesas'; zones: Zone[]; rows: MesaRow[] };

export type MapSeat = { id: string; table: number; chair: number; zone: string };
export type MapTable = { n: number; seats: MapSeat[] };
export type MapRow = { index: number; zone: Zone; tables: MapTable[] };
export type ExpandedMap = { rows: MapRow[]; zones: Zone[]; capacity: number; byId: Record<string, { zone: Zone; table: number; chair: number }> };

export const MAX_TABLES_PER_ROW = 24;
export const MAX_SEATS_PER_TABLE = 14;

export const ZONE_COLORS = ['#b8932c', '#7d8792', '#4e6b0a', '#8c2f39', '#2f5d8c', '#6b4f9e'];

/** Plano del Hotel Tibisay: 5 filas VIP de 8 mesas, 1 fila Plata de 12 y 1 General de 8, mesas de 9 */
export const TEMPLATE_TIBISAY: SeatMap = {
	kind: 'mesas',
	zones: [
		{ id: 'vip', name: 'VIP', color: '#b8932c', price: 35 },
		{ id: 'plata', name: 'Plata', color: '#7d8792', price: 25 },
		{ id: 'general', name: 'General', color: '#4e6b0a', price: 20 }
	],
	rows: [
		{ zone: 'vip', tables: 8, seats: 9 },
		{ zone: 'vip', tables: 8, seats: 9 },
		{ zone: 'vip', tables: 8, seats: 9 },
		{ zone: 'vip', tables: 8, seats: 9 },
		{ zone: 'vip', tables: 8, seats: 9 },
		{ zone: 'plata', tables: 12, seats: 9 },
		{ zone: 'general', tables: 8, seats: 9 }
	]
};

export function parseMap(json: string | null | undefined): SeatMap | null {
	if (!json) return null;
	try {
		const m = JSON.parse(json);
		return m && m.kind === 'mesas' && Array.isArray(m.zones) && Array.isArray(m.rows) ? (m as SeatMap) : null;
	} catch {
		return null;
	}
}

/** Revisa que el plano tenga sentido; devuelve el error o null */
export function validateMap(m: SeatMap): string | null {
	if (!m.zones.length) return 'Agrega al menos una zona.';
	if (!m.rows.length) return 'Agrega al menos una fila de mesas.';
	const ids = new Set<string>();
	for (const z of m.zones) {
		if (!z.name.trim()) return 'Todas las zonas necesitan nombre.';
		if (!(z.price > 0)) return `El precio de la zona ${z.name} debe ser mayor que cero.`;
		if (!/^#[0-9a-f]{6}$/i.test(z.color)) return `Color no válido en la zona ${z.name}.`;
		if (ids.has(z.id)) return 'Hay zonas repetidas.';
		ids.add(z.id);
	}
	for (const [i, r] of m.rows.entries()) {
		if (!ids.has(r.zone)) return `La fila ${i + 1} no tiene zona.`;
		if (!(r.tables >= 1 && r.tables <= MAX_TABLES_PER_ROW)) return `La fila ${i + 1} debe tener entre 1 y ${MAX_TABLES_PER_ROW} mesas.`;
		if (!(r.seats >= 1 && r.seats <= MAX_SEATS_PER_TABLE)) return `Las mesas de la fila ${i + 1} deben tener entre 1 y ${MAX_SEATS_PER_TABLE} puestos.`;
	}
	return null;
}

export function expandMap(m: SeatMap): ExpandedMap {
	const zones = Object.fromEntries(m.zones.map((z) => [z.id, z]));
	const byId: ExpandedMap['byId'] = {};
	let table = 1;
	let capacity = 0;
	const rows = m.rows.map((r, index) => {
		const zone = zones[r.zone];
		const tables: MapTable[] = [];
		for (let t = 0; t < r.tables; t++, table++) {
			const seats: MapSeat[] = [];
			for (let c = 1; c <= r.seats; c++) {
				const id = `M${table}-${c}`;
				seats.push({ id, table, chair: c, zone: zone.id });
				byId[id] = { zone, table, chair: c };
				capacity++;
			}
			tables.push({ n: table, seats });
		}
		return { index, zone, tables };
	});
	return { rows, zones: m.zones, capacity, byId };
}

export const isMesaSeat = (id: string) => /^M\d+-\d+$/.test(id);

/** "M12-3" → "Mesa 12 · Puesto 3"; las butacas quedan igual ("C7") */
export function seatLabel(id: string) {
	const m = id.match(/^M(\d+)-(\d+)$/);
	return m ? `Mesa ${m[1]} · Puesto ${m[2]}` : id;
}

/** Texto corto de varios puestos: "Mesa 12: puestos 3, 4 · Mesa 13: puesto 1" */
export function seatsSummary(ids: string[]) {
	if (!ids.every(isMesaSeat)) return ids.join(', ');
	const by = new Map<number, number[]>();
	for (const id of ids) {
		const [, t, c] = id.match(/^M(\d+)-(\d+)$/)!;
		by.set(+t, [...(by.get(+t) ?? []), +c]);
	}
	return [...by.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([t, cs]) => `Mesa ${t}: ${cs.length > 1 ? 'puestos' : 'puesto'} ${cs.sort((a, b) => a - b).join(', ')}`)
		.join(' · ');
}
