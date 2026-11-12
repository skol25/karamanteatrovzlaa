import { error, fail, redirect } from '@sveltejs/kit';
import { get, all, run } from '#lib/server/db.ts';
import { audit } from '#lib/server/audit.ts';
import { readPlano, lockedSeats } from '#lib/server/plano.ts';
import { parseMap } from '#lib/seatmap.ts';
import { saleState, SALE_LABEL, CLOSE_OPTIONS } from '#lib/sales.ts';
import { fechaCorta, hora } from '#lib/format.ts';

type Perf = {
	id: number;
	show_id: number;
	title: string;
	slug: string;
	starts_at: string;
	venue: string;
	address: string;
	maps_url: string;
	capacity: number;
	price_usd: number;
	layout: string | null;
	sales_status: string;
	sales_close_minutes: number | null;
	venue_id: number | null;
};

const loadPerf = (id: number) =>
	get<Perf>(
		`SELECT p.id, p.show_id, s.title, s.slug, p.starts_at, p.venue, p.address, p.maps_url, p.capacity, p.price_usd, p.layout,
		 p.sales_status, p.sales_close_minutes, p.venue_id
		 FROM performances p JOIN shows s ON s.id=p.show_id WHERE p.id=?`,
		[id]
	);

const label = (p: Perf) => `«${p.title}» (${fechaCorta(p.starts_at)} ${hora(p.starts_at)})`;

/** "2026-11-27T20:00:00-04:00" → "2026-11-27T20:00" (hora de Caracas, para el campo de fecha) */
const toLocal = (iso: string) => new Date(new Date(iso).getTime() - 4 * 3600000).toISOString().slice(0, 16);

export const load = async ({ params, locals }) => {
	if (!locals.admin) redirect(303, '/admin');
	const perf = await loadPerf(Number(params.id));
	if (!perf) error(404, 'Función no encontrada');
	const locked = await lockedSeats(perf.id);
	const counts = (await get<{ sold: number; pending: number; held: number }>(
		`SELECT
			COALESCE(SUM(CASE WHEN status='confirmed' THEN qty END),0) sold,
			COALESCE(SUM(CASE WHEN status='submitted' THEN qty END),0) pending,
			COALESCE(SUM(CASE WHEN status='held' THEN qty END),0) held
		 FROM reservations WHERE performance_id=?`,
		[perf.id]
	))!;
	const state = saleState({ ...perf, taken: locked.length });
	return {
		perf: { ...perf, local: toLocal(perf.starts_at) },
		map: parseMap(perf.layout),
		locked,
		counts,
		state,
		stateLabel: SALE_LABEL[state],
		closeOptions: CLOSE_OPTIONS,
		venues: await all<{ id: number; name: string; city: string; address: string; maps_url: string; layout: string | null; capacity: number; price_usd: number }>(
			'SELECT * FROM venues ORDER BY name'
		)
	};
};

const guard = (locals: App.Locals) => {
	if (!locals.admin) redirect(303, '/admin');
};

export const actions = {
	/** Fecha, lugar y dirección */
	datos: async (event) => {
		guard(event.locals);
		const perf = await loadPerf(Number(event.params.id));
		if (!perf) return fail(404, { error: 'Función no encontrada.' });
		const fd = await event.request.formData();
		const v = (k: string) => String(fd.get(k) ?? '').trim();
		const dt = v('starts_at');
		if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dt)) return fail(400, { error: 'Revisa la fecha y la hora.' });
		if (!v('venue')) return fail(400, { error: 'Escribe el lugar de la función.' });
		const iso = `${dt}:00-04:00`;
		const venueId = Number(v('venue_id')) || null;
		await run('UPDATE performances SET starts_at=?, venue=?, address=?, maps_url=?, venue_id=? WHERE id=?', [iso, v('venue'), v('address'), v('maps_url'), venueId, perf.id]);
		await audit(event, {
			kind: 'admin',
			action: 'funcion_editada',
			summary: `Editó la función ${label(perf)}: ${fechaCorta(iso)} ${hora(iso)} · ${v('venue')}`,
			entity: 'funcion',
			entityId: perf.id,
			detail: { antes: { fecha: perf.starts_at, lugar: perf.venue, direccion: perf.address }, ahora: { fecha: iso, lugar: v('venue'), direccion: v('address') } }
		});
		return { notice: 'Datos de la función guardados.' };
	},
	/** Abrir o cerrar ventas, y cierre automático */
	ventas: async (event) => {
		guard(event.locals);
		const perf = await loadPerf(Number(event.params.id));
		if (!perf) return fail(404, { error: 'Función no encontrada.' });
		const fd = await event.request.formData();
		const status = fd.get('sales_status') === 'closed' ? 'closed' : 'open';
		const close = Number(fd.get('sales_close_minutes')) || 0;
		await run('UPDATE performances SET sales_status=?, sales_close_minutes=? WHERE id=?', [status, close || null, perf.id]);
		const changed = status !== perf.sales_status;
		await audit(event, {
			kind: 'admin',
			action: changed ? (status === 'open' ? 'ventas_abiertas' : 'ventas_cerradas') : 'ventas_config',
			summary: `${changed ? (status === 'open' ? 'Abrió' : 'Cerró') + ' las ventas de' : 'Configuró el cierre de ventas de'} ${label(perf)}${close ? ` · cierre automático ${CLOSE_OPTIONS.find((o) => o.v === close)?.label.toLowerCase() ?? close + ' min antes'}` : ''}`,
			entity: 'funcion',
			entityId: perf.id
		});
		return { notice: status === 'open' ? 'Ventas abiertas.' : 'Ventas cerradas: nadie más puede apartar puestos.' };
	},
	/** Plano y tipos de entrada */
	guardar: async (event) => {
		guard(event.locals);
		const perf = await loadPerf(Number(event.params.id));
		if (!perf) return fail(404, { error: 'Función no encontrada.' });
		const fd = await event.request.formData();
		const r = readPlano(fd, { locked: await lockedSeats(perf.id), previous: perf.layout });
		if (!r.ok) return fail(400, { error: r.error });
		await run('UPDATE performances SET layout=?, capacity=?, price_usd=? WHERE id=?', [r.layout, r.capacity, r.price, perf.id]);
		await audit(event, {
			kind: 'admin',
			action: 'plano_editado',
			summary: `Cambió el plano de ${label(perf)}: ${r.summary}`,
			entity: 'funcion',
			entityId: perf.id,
			detail: { antes: perf.layout ? JSON.parse(perf.layout) : { butacas: perf.capacity, precio: perf.price_usd }, ahora: r.layout ? JSON.parse(r.layout) : { butacas: r.capacity, precio: r.price } }
		});
		return { notice: 'Plano y entradas guardados.' };
	}
};
