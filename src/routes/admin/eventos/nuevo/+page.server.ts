import { fail, redirect } from '@sveltejs/kit';
import { all, get, run } from '#lib/server/db.ts';
import { audit } from '#lib/server/audit.ts';
import { readPlano } from '#lib/server/plano.ts';
import { slugify, savePoster } from '#lib/server/shows.ts';
import { CLOSE_OPTIONS } from '#lib/sales.ts';
import { fechaCorta, hora } from '#lib/format.ts';

type Venue = { id: number; name: string; city: string; address: string; maps_url: string; layout: string | null; capacity: number; price_usd: number };

export const load = async ({ locals, url }) => {
	if (!locals.admin) redirect(303, '/admin');
	return {
		shows: await all<{ id: number; title: string }>('SELECT id, title FROM shows ORDER BY id DESC'),
		venues: await all<Venue>('SELECT * FROM venues ORDER BY name'),
		closeOptions: CLOSE_OPTIONS,
		preShow: Number(url.searchParams.get('obra')) || null
	};
};

export const actions = {
	default: async (event) => {
		if (!event.locals.admin) redirect(303, '/admin');
		const fd = await event.request.formData();
		const v = (k: string) => String(fd.get(k) ?? '').trim();

		// 1. Fechas
		const dates = [...new Set(fd.getAll('starts_at').map((x) => String(x).trim()).filter(Boolean))];
		if (!dates.length) return fail(400, { error: 'Agrega al menos una fecha.' });
		if (dates.some((d) => !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d))) return fail(400, { error: 'Revisa las fechas y horas.' });
		if (dates.length > 30) return fail(400, { error: 'Máximo 30 funciones por evento.' });

		// 2. Lugar
		const venueId = Number(v('venue_id')) || null;
		const venueRow = venueId ? await get<Venue>('SELECT * FROM venues WHERE id=?', [venueId]) : null;
		const vname = v('venue_name') || venueRow?.name || '';
		if (!vname) return fail(400, { error: 'Escribe el nombre del lugar.' });
		const city = v('venue_city');
		const venueLabel = city ? `${vname} · ${city}` : vname;

		// 3. Plano
		const r = readPlano(fd);
		if (!r.ok) return fail(400, { error: r.error });

		// 4. Obra
		let showId = Number(v('show_id')) || 0;
		let title = '';
		if (v('obra_mode') === 'nueva') {
			if (!v('title') || !v('synopsis')) return fail(400, { error: 'La obra nueva necesita título y sinopsis.' });
			let poster: string | undefined;
			try {
				poster = await savePoster(fd.get('poster'));
			} catch (e) {
				return fail(400, { error: (e as Error).message });
			}
			let slug = slugify(v('title'));
			if (await get('SELECT 1 FROM shows WHERE slug=?', [slug])) slug += '-' + Date.now().toString(36);
			({ lastId: showId } = await run(
				`INSERT INTO shows (slug,title,tagline,synopsis,director,cast_list,duration_min,genre,age_rating,poster,variant,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?,0)`,
				[slug, v('title'), v('tagline'), v('synopsis'), v('director'), v('cast_list'), Number(v('duration_min')) || 90, v('genre'), v('age_rating') || 'Todo público', poster ?? null, Number(v('variant')) || 0]
			));
			title = v('title');
			await audit(event, { kind: 'admin', action: 'obra_creada', summary: `Creó la obra «${title}»`, entity: 'obra', entityId: slug });
		} else {
			const s = await get<{ title: string }>('SELECT title FROM shows WHERE id=?', [showId]);
			if (!s) return fail(400, { error: 'Elige la obra.' });
			title = s.title;
		}

		// 5. Guardar sala (nueva o actualizar su plano)
		let savedVenue = venueId;
		if (fd.get('save_venue')) {
			if (venueRow) {
				await run('UPDATE venues SET name=?, city=?, address=?, maps_url=?, layout=?, capacity=?, price_usd=? WHERE id=?', [vname, city, v('address'), v('maps_url'), r.layout, r.capacity, r.price, venueRow.id]);
				await audit(event, { kind: 'admin', action: 'sala_editada', summary: `Actualizó la sala «${vname}» desde un evento nuevo: ${r.summary}`, entity: 'sala', entityId: venueRow.id });
			} else {
				({ lastId: savedVenue } = await run(
					'INSERT INTO venues (name, city, address, maps_url, layout, capacity, price_usd, created_at) VALUES (?,?,?,?,?,?,?,?)',
					[vname, city, v('address'), v('maps_url'), r.layout, r.capacity, r.price, Date.now()]
				));
				await audit(event, { kind: 'admin', action: 'sala_creada', summary: `Creó la sala «${vname}»: ${r.summary}`, entity: 'sala', entityId: savedVenue });
			}
		}

		// 6. Funciones
		const status = v('sales_status') === 'closed' ? 'closed' : 'open';
		const close = Number(v('sales_close_minutes')) || null;
		const ids: number[] = [];
		for (const d of dates.sort()) {
			const { lastId } = await run(
				`INSERT INTO performances (show_id, starts_at, venue, address, maps_url, price_usd, capacity, layout, sales_status, sales_close_minutes, venue_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
				[showId, `${d}:00-04:00`, venueLabel, v('address'), v('maps_url'), r.price, r.capacity, r.layout, status, close, savedVenue]
			);
			ids.push(lastId);
		}
		const when = dates.sort().map((d) => `${fechaCorta(d + ':00-04:00')} ${hora(d + ':00-04:00')}`).join(', ');
		await audit(event, {
			kind: 'admin',
			action: 'evento_creado',
			summary: `Creó evento «${title}» en ${venueLabel}: ${dates.length} ${dates.length === 1 ? 'función' : 'funciones'} (${when}) · ${r.summary} · ventas ${status === 'open' ? 'abiertas' : 'cerradas'}`,
			entity: 'obra',
			entityId: showId,
			detail: { funciones: ids }
		});
		redirect(303, `/admin/obras?creado=${ids.length}`);
	}
};
