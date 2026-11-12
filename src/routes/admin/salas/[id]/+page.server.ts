import { error, fail, redirect } from '@sveltejs/kit';
import { get, all, run } from '#lib/server/db.ts';
import { audit } from '#lib/server/audit.ts';
import { readPlano } from '#lib/server/plano.ts';
import { parseMap } from '#lib/seatmap.ts';

type Venue = { id: number; name: string; city: string; address: string; maps_url: string; layout: string | null; capacity: number; price_usd: number };

export const load = async ({ params, locals }) => {
	if (!locals.admin) redirect(303, '/admin');
	const venue = params.id === 'nueva' ? null : await get<Venue>('SELECT * FROM venues WHERE id=?', [Number(params.id)]);
	if (params.id !== 'nueva' && !venue) error(404, 'Sala no encontrada');
	return {
		venue,
		map: parseMap(venue?.layout),
		others: (await all<Venue>('SELECT * FROM venues ORDER BY name')).filter((v) => v.id !== venue?.id)
	};
};

export const actions = {
	guardar: async (event) => {
		if (!event.locals.admin) redirect(303, '/admin');
		const fd = await event.request.formData();
		const v = (k: string) => String(fd.get(k) ?? '').trim();
		if (!v('name')) return fail(400, { error: 'Ponle nombre a la sala.' });
		const r = readPlano(fd);
		if (!r.ok) return fail(400, { error: r.error });
		const isNew = event.params.id === 'nueva';
		let id = Number(event.params.id);
		if (isNew) {
			({ lastId: id } = await run(
				'INSERT INTO venues (name, city, address, maps_url, layout, capacity, price_usd, created_at) VALUES (?,?,?,?,?,?,?,?)',
				[v('name'), v('city'), v('address'), v('maps_url'), r.layout, r.capacity, r.price, Date.now()]
			));
		} else {
			await run('UPDATE venues SET name=?, city=?, address=?, maps_url=?, layout=?, capacity=?, price_usd=? WHERE id=?', [
				v('name'), v('city'), v('address'), v('maps_url'), r.layout, r.capacity, r.price, id
			]);
		}
		await audit(event, {
			kind: 'admin',
			action: isNew ? 'sala_creada' : 'sala_editada',
			summary: `${isNew ? 'Creó' : 'Editó'} la sala «${v('name')}»: ${r.summary}`,
			entity: 'sala',
			entityId: id
		});
		if (isNew) redirect(303, `/admin/salas/${id}?creada=1`);
		return { notice: 'Sala guardada. Las funciones que ya existen no cambian; el plano se usará en los próximos eventos.' };
	}
};
