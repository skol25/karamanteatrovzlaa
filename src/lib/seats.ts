/**
 * Genera el plano de la sala a partir del aforo (personas admitidas).
 * Fila A = la más cercana al escenario. Cada fila tiene un pasillo central.
 */
export type SeatCell = { id: string; col: number } | null;
export type SeatRow = { label: string; cells: SeatCell[] };

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function seatsPerRow(capacity: number) {
	if (capacity <= 30) return 6;
	if (capacity <= 56) return 8;
	if (capacity <= 90) return 10;
	if (capacity <= 160) return 12;
	return 16;
}

export function buildLayout(capacity: number): { rows: SeatRow[]; width: number } {
	const perRow = seatsPerRow(capacity);
	const half = perRow / 2;
	const width = perRow + 1; // +1 por el pasillo
	const rows: SeatRow[] = [];
	let remaining = capacity;
	let r = 0;
	while (remaining > 0) {
		const label = r < 26 ? LETTERS[r] : 'A' + LETTERS[r - 26];
		const count = Math.min(perRow, remaining);
		// fila incompleta: se centra
		const offset = Math.floor((perRow - count) / 2);
		const cells: SeatCell[] = [];
		let n = 0;
		for (let c = 0; c < perRow; c++) {
			if (c === half) cells.push(null); // pasillo
			if (c >= offset && n < count) {
				n++;
				cells.push({ id: `${label}${n}`, col: c });
			} else cells.push(null);
		}
		rows.push({ label, cells });
		remaining -= count;
		r++;
	}
	return { rows, width };
}

export function allSeatIds(capacity: number): Set<string> {
	const ids = new Set<string>();
	for (const row of buildLayout(capacity).rows)
		for (const c of row.cells) if (c) ids.add(c.id);
	return ids;
}

export function sortSeats(seats: string[]) {
	const key = (id: string): [number, number, string] => {
		const m = id.match(/^M(\d+)-(\d+)$/);
		if (m) return [+m[1], +m[2], ''];
		const b = id.match(/^([A-Z]+)(\d+)$/);
		return b ? [0, +b[2], b[1]] : [0, 0, id];
	};
	return [...seats].sort((a, b) => {
		const ka = key(a),
			kb = key(b);
		return ka[2].localeCompare(kb[2]) || ka[0] - kb[0] || ka[1] - kb[1];
	});
}
