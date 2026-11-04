import crypto from 'node:crypto';
import { get, run } from './db';

/** Guarda un archivo en la base de datos y devuelve su id (con extensión). */
export async function saveFile(buf: Buffer, mime: string, ext: string) {
	const id = crypto.randomBytes(12).toString('hex') + ext;
	await run('INSERT INTO files (id, mime, data, created_at) VALUES (?,?,?,?)', [id, mime, buf, Date.now()]);
	return id;
}

export async function readFile(id: string) {
	const r = await get<{ mime: string; data: ArrayBuffer | Uint8Array }>('SELECT mime, data FROM files WHERE id=?', [id]);
	if (!r) return null;
	return { mime: r.mime, data: Buffer.from(r.data as ArrayBuffer) };
}

export async function deleteFile(id: string) {
	await run('DELETE FROM files WHERE id=?', [id]);
}
