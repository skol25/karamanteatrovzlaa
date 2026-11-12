/**
 * Planos de sala dibujados libremente desde el admin.
 *
 * Un plano tiene:
 *  - zonas = tipos de entrada (VIP, Plata, Platea…) con su color y precio por puesto
 *  - el escenario (rectángulo que se puede mover)
 *  - elementos que se arrastran: mesas redondas con N sillas, y bloques de butacas (filas × asientos)
 *
 * Identificadores de puestos (no cambian aunque se muevan los elementos):
 *  - silla de mesa: "M12-3"  = mesa 12, puesto 3
 *  - butaca:        "C7"     = fila C, asiento 7
 */
export type Zone = { id: string; name: string; color: string; price: number };
export type Stage = { x: number; y: number; w: number; h: number; label: string };
export type MesaItem = { type: 'mesa'; key: string; n: number; x: number; y: number; seats: number; zone: string };
export type BloqueItem = {
	type: 'butacas';
	key: string;
	x: number;
	y: number;
	rows: number;
	cols: number;
	rowStart: string;
	numStart: number;
	zone: string;
};
export type PlanItem = MesaItem | BloqueItem;
export type Plan = { kind: 'libre'; w: number; zones: Zone[]; stage: Stage; items: PlanItem[] };

/** Formato anterior (filas de mesas), se convierte solo a Plan */
export type MesaRow = { zone: string; tables: number; seats: number };
export type SeatMap = Plan;
type LegacyMap = { kind: 'mesas'; zones: Zone[]; rows: MesaRow[] };

// Medidas del dibujo
export const W = 1240;
export const TABLE_R = 24;
export const CHAIR_R = 7.5;
export const CHAIR_D = 38;
export const SEAT = 18; // tamaño de la butaca
export const SEAT_PITCH = 24; // distancia entre butacas
export const ROW_PITCH = 28; // distancia entre filas

export const MAX_SEATS_PER_TABLE = 14;
export const MAX_ITEMS = 200;
export const MAX_CAPACITY = 3000;
export const ZONE_COLORS = ['#b8932c', '#7d8792', '#4e6b0a', '#8c2f39', '#2f5d8c', '#6b4f9e'];

const uid = () => Math.random().toString(36).slice(2, 9);

// ---------------------------------------------------------------- letras de fila

export function rowLetter(start: string, i: number) {
	const toNum = (s: string) => s.split('').reduce((a, c) => a * 26 + (c.charCodeAt(0) - 64), 0);
	let n = toNum(start.toUpperCase() || 'A') + i;
	let out = '';
	while (n > 0) {
		const r = (n - 1) % 26;
		out = String.fromCharCode(65 + r) + out;
		n = Math.floor((n - 1) / 26);
	}
	return out;
}

// ---------------------------------------------------------------- formatos predeterminados

/** Mesas en filas (como el Hotel Tibisay), numeradas de corrido */
export function presetMesas(zones: Zone[], rows: MesaRow[]): Plan {
	const items: PlanItem[] = [];
	let n = 1;
	let y = 150;
	let prev = '';
	for (const r of rows) {
		if (prev && r.zone !== prev) y += 24;
		prev = r.zone;
		const gap = (W - 80) / r.tables;
		for (let k = 0; k < r.tables; k++, n++) items.push({ type: 'mesa', key: uid(), n, x: Math.round(60 + gap * k + gap / 2), y, seats: r.seats, zone: r.zone });
		y += 118;
	}
	return { kind: 'libre', w: W, zones, stage: { x: W / 2 - 330, y: 30, w: 660, h: 56, label: 'Escenario' }, items };
}

const Z = {
	vip: { id: 'vip', name: 'VIP', color: '#b8932c', price: 35 },
	plata: { id: 'plata', name: 'Plata', color: '#7d8792', price: 25 },
	general: { id: 'general', name: 'General', color: '#4e6b0a', price: 20 }
};

export const TEMPLATE_TIBISAY: Plan = presetMesas(
	[Z.vip, Z.plata, Z.general],
	[
		...Array.from({ length: 5 }, () => ({ zone: 'vip', tables: 8, seats: 9 })),
		{ zone: 'plata', tables: 12, seats: 9 },
		{ zone: 'general', tables: 8, seats: 9 }
	]
);

/** Teatro con pasillo central: dos bloques por zona, numeración continua de izquierda a derecha */
export function presetTeatro(): Plan {
	const cols = 10;
	const blockW = cols * SEAT_PITCH;
	const aisle = 60;
	const left = Math.round(W / 2 - aisle / 2 - blockW);
	const right = Math.round(W / 2 + aisle / 2);
	const zones = [
		{ id: 'vip', name: 'VIP', color: '#b8932c', price: 35 },
		{ id: 'platea', name: 'Platea', color: '#2f5d8c', price: 25 },
		{ id: 'general', name: 'General', color: '#4e6b0a', price: 20 }
	];
	const blocks: [string, string, number][] = [
		['vip', 'A', 3],
		['platea', 'D', 5],
		['general', 'I', 6]
	];
	const items: PlanItem[] = [];
	let y = 150;
	for (const [zone, start, rows] of blocks) {
		items.push({ type: 'butacas', key: uid(), x: left, y, rows, cols, rowStart: start, numStart: 1, zone });
		items.push({ type: 'butacas', key: uid(), x: right, y, rows, cols, rowStart: start, numStart: cols + 1, zone });
		y += rows * ROW_PITCH + 34;
	}
	return { kind: 'libre', w: W, zones, stage: { x: W / 2 - 330, y: 30, w: 660, h: 56, label: 'Escenario' }, items };
}

/** Cine: un solo bloque ancho, las filas de atrás son preferenciales */
export function presetCine(): Plan {
	const cols = 18;
	const x = Math.round(W / 2 - (cols * SEAT_PITCH) / 2);
	const zones = [
		{ id: 'general', name: 'General', color: '#4e6b0a', price: 15 },
		{ id: 'pref', name: 'Preferencial', color: '#8c2f39', price: 22 }
	];
	return {
		kind: 'libre',
		w: W,
		zones,
		stage: { x: W / 2 - 420, y: 30, w: 840, h: 40, label: 'Pantalla' },
		items: [
			{ type: 'butacas', key: uid(), x, y: 140, rows: 7, cols, rowStart: 'A', numStart: 1, zone: 'general' },
			{ type: 'butacas', key: uid(), x, y: 140 + 7 * ROW_PITCH + 34, rows: 5, cols, rowStart: 'H', numStart: 1, zone: 'pref' }
		]
	};
}

/** Butacas en filas a precio único (equivale al plano automático por aforo) */
export function presetButacas(capacity: number, price: number): Plan {
	const perRow = capacity <= 30 ? 6 : capacity <= 56 ? 8 : capacity <= 90 ? 10 : capacity <= 160 ? 12 : 16;
	const rows = Math.max(1, Math.ceil(capacity / perRow));
	return {
		kind: 'libre',
		w: W,
		zones: [{ id: 'general', name: 'General', color: '#4e6b0a', price }],
		stage: { x: W / 2 - 330, y: 30, w: 660, h: 56, label: 'Escenario' },
		items: [{ type: 'butacas', key: uid(), x: Math.round(W / 2 - (perRow * SEAT_PITCH) / 2), y: 150, rows, cols: perRow, rowStart: 'A', numStart: 1, zone: 'general' }]
	};
}

export const PRESETS: { id: string; name: string; desc: string; make: () => Plan }[] = [
	{ id: 'mesas', name: 'Mesas (tipo Hotel Tibisay)', desc: '60 mesas de 9 · VIP, Plata y General', make: () => structuredClone(TEMPLATE_TIBISAY) },
	{ id: 'teatro', name: 'Teatro con pasillo', desc: 'Butacas en dos bloques · VIP, Platea y General', make: presetTeatro },
	{ id: 'cine', name: 'Cine', desc: 'Un bloque ancho · General y Preferencial', make: presetCine },
	{ id: 'vacio', name: 'En blanco', desc: 'Solo el escenario; agrega mesas y butacas a mano', make: () => ({ ...presetTeatro(), items: [] }) }
];

// ---------------------------------------------------------------- lectura y validación

export function parseMap(json: string | null | undefined): Plan | null {
	if (!json) return null;
	try {
		const m = JSON.parse(json);
		if (m?.kind === 'libre' && Array.isArray(m.items) && Array.isArray(m.zones)) return m as Plan;
		if (m?.kind === 'mesas' && Array.isArray(m.rows)) return presetMesasStable(m as LegacyMap);
		return null;
	} catch {
		return null;
	}
}

/** Convierte el formato anterior conservando posiciones estables (sin claves aleatorias) */
function presetMesasStable(m: LegacyMap): Plan {
	const p = presetMesas(m.zones, m.rows);
	p.items.forEach((it, i) => (it.key = 'k' + i));
	return p;
}

export function validatePlan(p: Plan): string | null {
	if (!p.zones.length) return 'Agrega al menos un tipo de entrada (zona).';
	const zids = new Set<string>();
	for (const z of p.zones) {
		if (!z.name.trim()) return 'Todas las zonas necesitan nombre.';
		if (!(z.price > 0)) return `El precio de la zona ${z.name} debe ser mayor que cero.`;
		if (!/^#[0-9a-f]{6}$/i.test(z.color)) return `Color no válido en la zona ${z.name}.`;
		if (zids.has(z.id)) return 'Hay zonas repetidas.';
		zids.add(z.id);
	}
	if (!p.items.length) return 'Agrega al menos una mesa o un bloque de butacas.';
	if (p.items.length > MAX_ITEMS) return `Máximo ${MAX_ITEMS} elementos por plano.`;
	const nums = new Set<number>();
	for (const it of p.items) {
		if (!zids.has(it.zone)) return 'Hay elementos sin zona.';
		if (it.type === 'mesa') {
			if (!(Number.isInteger(it.n) && it.n >= 1)) return 'Las mesas deben tener un número.';
			if (nums.has(it.n)) return `La mesa ${it.n} está repetida.`;
			nums.add(it.n);
			if (!(it.seats >= 1 && it.seats <= MAX_SEATS_PER_TABLE)) return `La mesa ${it.n} debe tener entre 1 y ${MAX_SEATS_PER_TABLE} puestos.`;
		} else {
			if (!(it.rows >= 1 && it.rows <= 40)) return 'Los bloques de butacas deben tener entre 1 y 40 filas.';
			if (!(it.cols >= 1 && it.cols <= 50)) return 'Los bloques de butacas deben tener entre 1 y 50 asientos por fila.';
			if (!/^[A-Z]{1,2}$/.test(it.rowStart)) return 'La fila inicial debe ser una letra (A, B, C…).';
			if (!(it.numStart >= 1)) return 'El número inicial de asiento debe ser 1 o mayor.';
		}
	}
	const seen = new Set<string>();
	let total = 0;
	for (const s of seatIds(p)) {
		if (seen.has(s)) return `El puesto ${seatLabel(s)} está repetido: cambia la fila inicial o el número inicial de uno de los bloques.`;
		seen.add(s);
		total++;
	}
	if (total > MAX_CAPACITY) return `Máximo ${MAX_CAPACITY} puestos por plano.`;
	return null;
}
export const validateMap = validatePlan;

function* seatIds(p: Plan) {
	for (const it of p.items)
		if (it.type === 'mesa') for (let c = 1; c <= it.seats; c++) yield `M${it.n}-${c}`;
		else for (let r = 0; r < it.rows; r++) for (let c = 0; c < it.cols; c++) yield `${rowLetter(it.rowStart, r)}${it.numStart + c}`;
}

// ---------------------------------------------------------------- dibujo

export type PSeat = { id: string; x: number; y: number; zone: string; kind: 'silla' | 'butaca'; table?: number; chair?: number; row?: string; num?: number };
export type PTable = { n: number; x: number; y: number; zone: string; seatIds: string[]; key: string };
export type PLabel = { x: number; y: number; text: string; anchor: 'start' | 'end' };
export type ExpandedMap = {
	plan: Plan;
	zones: Zone[];
	stage: Stage;
	seats: PSeat[];
	tables: PTable[];
	labels: PLabel[];
	capacity: number;
	w: number;
	h: number;
	byId: Record<string, { zone: Zone; table?: number; label: string }>;
};

/** Caja que ocupa un elemento (para arrastrar y para el alto del dibujo) */
export function itemBox(it: PlanItem) {
	if (it.type === 'mesa') {
		const r = CHAIR_D + CHAIR_R + 2;
		return { x: it.x - r, y: it.y - r, w: r * 2, h: r * 2 };
	}
	return { x: it.x - 22, y: it.y - SEAT / 2 - 4, w: it.cols * SEAT_PITCH + 44, h: it.rows * ROW_PITCH + 6 };
}

export function expandMap(p: Plan): ExpandedMap {
	const zones = Object.fromEntries(p.zones.map((z) => [z.id, z]));
	const seats: PSeat[] = [];
	const tables: PTable[] = [];
	const labels: PLabel[] = [];
	const byId: ExpandedMap['byId'] = {};
	let maxY = p.stage.y + p.stage.h;
	for (const it of p.items) {
		const zone = zones[it.zone] ?? p.zones[0];
		if (it.type === 'mesa') {
			const ids: string[] = [];
			for (let c = 1; c <= it.seats; c++) {
				const a = -Math.PI / 2 + ((c - 1) * 2 * Math.PI) / it.seats;
				const id = `M${it.n}-${c}`;
				ids.push(id);
				seats.push({ id, x: it.x + CHAIR_D * Math.cos(a), y: it.y + CHAIR_D * Math.sin(a), zone: zone.id, kind: 'silla', table: it.n, chair: c });
				byId[id] = { zone, table: it.n, label: `Mesa ${it.n} · Puesto ${c}` };
			}
			tables.push({ n: it.n, x: it.x, y: it.y, zone: zone.id, seatIds: ids, key: it.key });
		} else {
			for (let r = 0; r < it.rows; r++) {
				const row = rowLetter(it.rowStart, r);
				const y = it.y + r * ROW_PITCH;
				labels.push({ x: it.x - 12, y: y + 4, text: row, anchor: 'end' });
				labels.push({ x: it.x + it.cols * SEAT_PITCH - SEAT_PITCH + 12 + SEAT / 2, y: y + 4, text: row, anchor: 'start' });
				for (let c = 0; c < it.cols; c++) {
					const num = it.numStart + c;
					const id = `${row}${num}`;
					seats.push({ id, x: it.x + c * SEAT_PITCH, y, zone: zone.id, kind: 'butaca', row, num });
					byId[id] = { zone, label: `Fila ${row} · Asiento ${num}` };
				}
			}
		}
		const b = itemBox(it);
		maxY = Math.max(maxY, b.y + b.h);
	}
	return { plan: p, zones: p.zones, stage: p.stage, seats, tables, labels, capacity: seats.length, w: p.w || W, h: Math.ceil(maxY + 30), byId };
}

// ---------------------------------------------------------------- textos

export const isMesaSeat = (id: string) => /^M\d+-\d+$/.test(id);

/** "M12-3" → "Mesa 12 · Puesto 3"; "C7" → "Fila C · Asiento 7" */
export function seatLabel(id: string) {
	const m = id.match(/^M(\d+)-(\d+)$/);
	if (m) return `Mesa ${m[1]} · Puesto ${m[2]}`;
	const b = id.match(/^([A-Z]{1,2})(\d+)$/);
	return b ? `Fila ${b[1]} · Asiento ${b[2]}` : id;
}

/** Texto corto de varios puestos: "Mesa 12: puestos 3, 4 · Fila C: 7, 8" */
export function seatsSummary(ids: string[]) {
	const by = new Map<string, number[]>();
	for (const id of ids) {
		const m = id.match(/^M(\d+)-(\d+)$/) ?? id.match(/^([A-Z]{1,2})(\d+)$/);
		if (!m) return ids.join(', ');
		const k = id.startsWith('M') && /^M\d/.test(id) ? `Mesa ${m[1]}` : `Fila ${m[1]}`;
		by.set(k, [...(by.get(k) ?? []), +m[2]]);
	}
	return [...by.entries()]
		.sort((a, b) => a[0].localeCompare(b[0], 'es', { numeric: true }))
		.map(([k, cs]) => `${k}: ${k.startsWith('Mesa') ? (cs.length > 1 ? 'puestos ' : 'puesto ') : ''}${cs.sort((a, b) => a - b).join(', ')}`)
		.join(' · ');
}
