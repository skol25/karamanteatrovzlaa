/**
 * Estado de venta de una función:
 *  - open:    se puede comprar
 *  - closed:  el admin cerró las ventas, o ya pasó la hora de cierre (X minutos antes de empezar)
 *  - soldout: no quedan puestos libres (se cierra sola)
 *  - past:    la función ya empezó o pasó
 */
export type SaleState = 'open' | 'closed' | 'soldout' | 'past';

export type SaleInfo = {
	starts_at: string;
	capacity: number;
	taken?: number;
	sales_status?: string | null;
	sales_close_minutes?: number | null;
};

export function saleState(p: SaleInfo, now = Date.now()): SaleState {
	const start = new Date(p.starts_at).getTime();
	if (start <= now) return 'past';
	if (p.sales_status === 'closed') return 'closed';
	if (p.sales_close_minutes != null && p.sales_close_minutes > 0 && now >= start - p.sales_close_minutes * 60000) return 'closed';
	if (p.capacity - (p.taken ?? 0) <= 0) return 'soldout';
	return 'open';
}

export const SALE_LABEL: Record<SaleState, string> = {
	open: 'En venta',
	closed: 'Ventas cerradas',
	soldout: 'Agotado',
	past: 'Realizada'
};

/** Opciones de cierre automático de ventas (minutos antes de la función) */
export const CLOSE_OPTIONS: { v: number; label: string }[] = [
	{ v: 0, label: 'Al empezar la función' },
	{ v: 60, label: '1 hora antes' },
	{ v: 120, label: '2 horas antes' },
	{ v: 180, label: '3 horas antes' },
	{ v: 360, label: '6 horas antes' },
	{ v: 1440, label: '1 día antes' }
];
