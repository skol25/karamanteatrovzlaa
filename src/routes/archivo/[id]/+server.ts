import { error } from '@sveltejs/kit';
import { readFile } from '#lib/server/files.ts';
import { get } from '#lib/server/db.ts';

/** Sirve afiches (públicos) y comprobantes (solo admin) guardados en la base de datos. */
export const GET = async ({ params, locals }) => {
	const isPoster = await get('SELECT 1 FROM shows WHERE poster=?', [params.id]);
	if (!isPoster && !locals.admin) error(401, 'No autorizado');
	const f = await readFile(params.id);
	if (!f) error(404, 'No encontrado');
	return new Response(new Uint8Array(f.data), {
		headers: {
			'Content-Type': f.mime,
			'Content-Disposition': `inline; filename="${params.id}"`,
			'Cache-Control': isPoster ? 'public, max-age=86400' : 'private, no-store'
		}
	});
};
