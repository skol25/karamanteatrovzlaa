import { error, json } from '@sveltejs/kit';
import { appendChunk } from '#lib/server/videos.ts';

/** Recibe el video por partes: POST con el pedazo crudo y los encabezados x-upload-id / x-offset */
export const POST = async ({ request, locals }) => {
	if (!locals.admin) error(401, 'No autorizado');
	const id = request.headers.get('x-upload-id') || '';
	const offset = Number(request.headers.get('x-offset'));
	if (!Number.isFinite(offset) || offset < 0) error(400, 'offset');
	try {
		const buf = Buffer.from(await request.arrayBuffer());
		return json(await appendChunk(id, offset, buf));
	} catch (e) {
		return json({ ok: false, error: (e as Error).message }, { status: 400 });
	}
};
