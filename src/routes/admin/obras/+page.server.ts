import { fail, redirect } from '@sveltejs/kit';
import { all, get, run, batch } from '#lib/server/db.ts';
import { slugify, savePoster } from '#lib/server/shows.ts';
import { perfsFor, type Show } from '#lib/server/catalog.ts';
import { audit } from '#lib/server/audit.ts';
import { fechaCorta, hora, usd } from '#lib/format.ts';
import { saleState, SALE_LABEL } from '#lib/sales.ts';

export const load = async ({ locals }) => {
	if (!locals.admin) redirect(303, '/admin');
	const shows = await all<Show>('SELECT * FROM shows ORDER BY id DESC');
	const perfs = await perfsFor();
	const sold = await all<{ performance_id: number; n: number }>(
		`SELECT performance_id, SUM(qty) n FROM reservations WHERE status='confirmed' GROUP BY performance_id`
	);
	return {
		shows: shows.map((s) => ({
			...s,
			perfs: perfs
				.filter((p) => p.show_id === s.id)
				.map((p) => {
					const state = saleState(p);
					return { ...p, sold: sold.find((x) => x.performance_id === p.id)?.n ?? 0, state, stateLabel: SALE_LABEL[state] };
				})
		}))
	};
};

export const actions = {
	obra: async (event) => {
		const { request, locals } = event;
		if (!locals.admin) redirect(303, '/admin');
		const fd = await request.formData();
		const v = (k: string) => String(fd.get(k) ?? '').trim();
		if (!v('title') || !v('synopsis')) return fail(400, { error: 'Título y sinopsis son obligatorios.' });
		let poster: string | undefined;
		try {
			poster = await savePoster(fd.get('poster'));
		} catch (e) {
			return fail(400, { error: (e as Error).message });
		}
		let slug = slugify(v('title'));
		if (await get('SELECT 1 FROM shows WHERE slug=?', [slug])) slug += '-' + Date.now().toString(36);
		const featured = fd.get('featured') ? 1 : 0;
		await batch([
			...(featured ? [{ sql: 'UPDATE shows SET featured=0', args: [] }] : []),
			{
				sql: `INSERT INTO shows (slug,title,tagline,synopsis,director,cast_list,duration_min,genre,age_rating,poster,variant,featured)
					  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
				args: [
					slug, v('title'), v('tagline'), v('synopsis'), v('director'), v('cast_list'),
					Number(v('duration_min')) || 90, v('genre'), v('age_rating') || 'Todo público',
					poster ?? null, Number(v('variant')) || 0, featured
				]
			}
		]);
		await audit(event, {
			kind: 'admin',
			action: 'obra_creada',
			summary: `Creó la obra «${v('title')}»${featured ? ' como obra principal' : ''}`,
			entity: 'obra',
			entityId: slug,
			detail: { title: v('title'), director: v('director'), cast_list: v('cast_list'), genre: v('genre'), afiche: !!poster }
		});
		return { notice: 'Obra creada. Ahora agrégale funciones.' };
	},
	funcion: async (event) => {
		const { request, locals } = event;
		if (!locals.admin) redirect(303, '/admin');
		const fd = await request.formData();
		const v = (k: string) => String(fd.get(k) ?? '').trim();
		const dt = v('starts_at'); // yyyy-mm-ddThh:mm (hora de Caracas)
		const price = Number(v('price_usd').replace(',', '.'));
		const cap = Number(v('capacity'));
		if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dt) || !(price > 0) || !(cap > 0 && cap <= 1000) || !v('venue'))
			return fail(400, { error: 'Revisa fecha, sala, precio y aforo.' });
		const { lastId } = await run(`INSERT INTO performances (show_id, starts_at, venue, address, maps_url, price_usd, capacity) VALUES (?,?,?,?,?,?,?)`, [
			Number(v('show_id')), `${dt}:00-04:00`, v('venue'), v('address'), v('maps_url'), price, cap
		]);
		const show = await get<{ title: string }>('SELECT title FROM shows WHERE id=?', [Number(v('show_id'))]);
		const iso = `${dt}:00-04:00`;
		await audit(event, {
			kind: 'admin',
			action: 'funcion_creada',
			summary: `Agregó función de «${show?.title ?? '?'}»: ${fechaCorta(iso)} ${hora(iso)} · ${v('venue')} · ${usd(price)} · ${cap} personas`,
			entity: 'funcion',
			entityId: lastId,
			detail: { starts_at: iso, venue: v('venue'), address: v('address'), price_usd: price, capacity: cap }
		});
		return { notice: 'Función agregada.' };
	},
	destacar: async (event) => {
		if (!event.locals.admin) redirect(303, '/admin');
		const id = Number((await event.request.formData()).get('id'));
		const prev = await get<{ title: string }>('SELECT title FROM shows WHERE featured=1');
		const show = await get<{ title: string; slug: string }>('SELECT title, slug FROM shows WHERE id=?', [id]);
		await batch([
			{ sql: 'UPDATE shows SET featured=0', args: [] },
			{ sql: 'UPDATE shows SET featured=1 WHERE id=?', args: [id] }
		]);
		await audit(event, {
			kind: 'admin',
			action: 'obra_principal',
			summary: `Puso «${show?.title ?? '?'}» como obra principal${prev ? ` (antes: «${prev.title}»)` : ''}`,
			entity: 'obra',
			entityId: show?.slug ?? id
		});
		return { notice: 'Obra principal actualizada.' };
	},
	ventas: async (event) => {
		if (!event.locals.admin) redirect(303, '/admin');
		const fd = await event.request.formData();
		const id = Number(fd.get('id'));
		const status = fd.get('sales_status') === 'closed' ? 'closed' : 'open';
		const p = await get<{ title: string; starts_at: string }>('SELECT s.title, p.starts_at FROM performances p JOIN shows s ON s.id=p.show_id WHERE p.id=?', [id]);
		if (!p) return fail(404, { error: 'Función no encontrada.' });
		await run('UPDATE performances SET sales_status=? WHERE id=?', [status, id]);
		await audit(event, {
			kind: 'admin',
			action: status === 'open' ? 'ventas_abiertas' : 'ventas_cerradas',
			summary: `${status === 'open' ? 'Abrió' : 'Cerró'} las ventas de «${p.title}» (${fechaCorta(p.starts_at)} ${hora(p.starts_at)})`,
			entity: 'funcion',
			entityId: id
		});
		return { notice: status === 'open' ? 'Ventas abiertas.' : 'Ventas cerradas.' };
	},
	borrarFuncion: async (event) => {
		if (!event.locals.admin) redirect(303, '/admin');
		const id = Number((await event.request.formData()).get('id'));
		if (await get('SELECT 1 FROM reservations WHERE performance_id=? LIMIT 1', [id]))
			return fail(400, { error: 'Esta función ya tiene reservas; no se puede borrar.' });
		const p = await get<any>('SELECT p.*, s.title FROM performances p JOIN shows s ON s.id=p.show_id WHERE p.id=?', [id]);
		await run('DELETE FROM performances WHERE id=?', [id]);
		if (p)
			await audit(event, {
				kind: 'admin',
				action: 'funcion_borrada',
				summary: `Eliminó la función de «${p.title}»: ${fechaCorta(p.starts_at)} ${hora(p.starts_at)} · ${p.venue}`,
				entity: 'funcion',
				entityId: id,
				detail: p
			});
		return { notice: 'Función eliminada.' };
	}
};
