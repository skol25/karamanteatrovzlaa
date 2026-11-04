import { error } from '@sveltejs/kit';
import { get } from '#lib/server/db.ts';
import { perfsFor, type Show } from '#lib/server/catalog.ts';
import { config } from '#lib/server/config.ts';

export const load = async ({ params }) => {
	const show = await get<Show>('SELECT * FROM shows WHERE slug=?', [params.slug]);
	if (!show) error(404, 'Obra no encontrada');
	const now = Date.now();
	const perfs = (await perfsFor(show.id)).map((p) => ({ ...p, left: p.capacity - p.taken, past: new Date(p.starts_at).getTime() <= now }));
	return { show, perfs, maxTickets: config.maxTicketsPerOrder };
};
