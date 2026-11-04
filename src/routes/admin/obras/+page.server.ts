import { fail, redirect } from '@sveltejs/kit';
import { all, get, run, batch } from '#lib/server/db.ts';
import { saveFile } from '#lib/server/files.ts';
import { perfsFor, type Show } from '#lib/server/catalog.ts';

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
				.map((p) => ({ ...p, sold: sold.find((x) => x.performance_id === p.id)?.n ?? 0 }))
		}))
	};
};

const slugify = (t: string) =>
	t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const POSTER_TYPES: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

async function savePoster(file: FormDataEntryValue | null) {
	if (!(file instanceof File) || file.size === 0) return undefined;
	const ext = POSTER_TYPES[file.type];
	if (!ext || file.size > 3 * 1024 * 1024) throw new Error('El afiche debe ser JPG/PNG/WEBP de máximo 3 MB.');
	return saveFile(Buffer.from(await file.arrayBuffer()), file.type, ext);
}

export const actions = {
	obra: async ({ request, locals }) => {
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
		return { notice: 'Obra creada. Ahora agrégale funciones.' };
	},
	funcion: async ({ request, locals }) => {
		if (!locals.admin) redirect(303, '/admin');
		const fd = await request.formData();
		const v = (k: string) => String(fd.get(k) ?? '').trim();
		const dt = v('starts_at'); // yyyy-mm-ddThh:mm (hora de Caracas)
		const price = Number(v('price_usd').replace(',', '.'));
		const cap = Number(v('capacity'));
		if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dt) || !(price > 0) || !(cap > 0 && cap <= 1000) || !v('venue'))
			return fail(400, { error: 'Revisa fecha, sala, precio y aforo.' });
		await run(`INSERT INTO performances (show_id, starts_at, venue, address, maps_url, price_usd, capacity) VALUES (?,?,?,?,?,?,?)`, [
			Number(v('show_id')), `${dt}:00-04:00`, v('venue'), v('address'), v('maps_url'), price, cap
		]);
		return { notice: 'Función agregada.' };
	},
	destacar: async ({ request, locals }) => {
		if (!locals.admin) redirect(303, '/admin');
		const id = Number((await request.formData()).get('id'));
		await batch([
			{ sql: 'UPDATE shows SET featured=0', args: [] },
			{ sql: 'UPDATE shows SET featured=1 WHERE id=?', args: [id] }
		]);
		return { notice: 'Obra principal actualizada.' };
	},
	borrarFuncion: async ({ request, locals }) => {
		if (!locals.admin) redirect(303, '/admin');
		const id = Number((await request.formData()).get('id'));
		if (await get('SELECT 1 FROM reservations WHERE performance_id=? LIMIT 1', [id]))
			return fail(400, { error: 'Esta función ya tiene reservas; no se puede borrar.' });
		await run('DELETE FROM performances WHERE id=?', [id]);
		return { notice: 'Función eliminada.' };
	}
};
