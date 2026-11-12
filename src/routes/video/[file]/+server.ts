import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import { get } from '#lib/server/db.ts';
import { videoDir, VIDEO_MIME } from '#lib/server/videos.ts';

/** Sirve los videos subidos, con soporte de Range (necesario para adelantar y para Safari/iPhone). */
export const GET = async ({ params, request, locals }) => {
	const name = path.basename(params.file);
	const v = await get<{ enabled: number }>(`SELECT enabled FROM videos WHERE kind='archivo' AND src=?`, [name]);
	if (!v || (!v.enabled && !locals.admin)) error(404, 'No encontrado');
	const file = path.join(videoDir(), name);
	let size: number;
	try {
		size = fs.statSync(file).size;
	} catch {
		error(404, 'No encontrado');
	}
	const type = VIDEO_MIME[path.extname(name)] ?? 'application/octet-stream';
	const base = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=604800' };
	const range = request.headers.get('range')?.match(/bytes=(\d*)-(\d*)/);
	if (range) {
		let start = range[1] ? Number(range[1]) : NaN;
		let end = range[2] ? Number(range[2]) : NaN;
		if (isNaN(start)) (start = size - end), (end = size - 1); // bytes=-500
		if (isNaN(end) || end >= size) end = size - 1;
		if (start < 0 || start > end || start >= size)
			return new Response(null, { status: 416, headers: { ...base, 'Content-Range': `bytes */${size}` } });
		const stream = Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream;
		return new Response(stream, {
			status: 206,
			headers: { ...base, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) }
		});
	}
	const stream = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
	return new Response(stream, { headers: { ...base, 'Content-Length': String(size) } });
};
