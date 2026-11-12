import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { all, get, run } from './db';
import { config } from './config';
import { deleteFile } from './files';

/**
 * Videos del carrusel de la portada.
 *  - archivo:   MP4/WEBM/MOV subido desde el admin. Se guarda en DATA_DIR/videos (no en la base,
 *               porque pesan mucho) y se sirve por /video/<archivo> con soporte de "Range" para poder adelantar.
 *  - youtube:   id del video (también Shorts)
 *  - instagram: código del reel o publicación
 */
export type VideoKind = 'archivo' | 'youtube' | 'instagram';
export type Video = {
	id: number;
	title: string;
	caption: string;
	kind: VideoKind;
	src: string;
	mime: string | null;
	bytes: number | null;
	cover: string | null;
	show_id: number | null;
	enabled: number;
	sort: number;
	created_at: number;
};
export type PublicVideo = {
	id: number;
	title: string;
	caption: string;
	kind: VideoKind;
	/** archivo: /video/xxx.mp4 · youtube: id · instagram: código */
	src: string;
	/** formato vertical (reels, shorts y casi todo lo grabado con el teléfono) */
	vertical: boolean;
	cover: string | null;
	show: { title: string; slug: string } | null;
};

export const videoDir = () => path.join(config.dataDir, 'videos');
const tmpDir = () => path.join(videoDir(), 'tmp');
export const MAX_VIDEO_MB = Number(process.env.VIDEO_MAX_MB || 150);
export const CHUNK_BYTES = 4 * 1024 * 1024;

const EXT: Record<string, string> = { 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };
export const VIDEO_MIME: Record<string, string> = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };

/** Reconoce enlaces de YouTube (watch, youtu.be, shorts, embed) e Instagram (reel, p, tv) */
export function parseVideoLink(url: string): { kind: 'youtube' | 'instagram'; src: string; vertical?: boolean } | null {
	const u = url.trim();
	let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
	if (m) return { kind: 'youtube', src: m[1], vertical: /\/shorts\//.test(u) };
	m = u.match(/instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(reels?|p|tv)\/([A-Za-z0-9_-]{5,})/);
	if (m) return { kind: 'instagram', src: `${m[1] === 'reels' ? 'reel' : m[1]}/${m[2]}` };
	return null;
}

const UPLOAD_ID = /^[a-f0-9]{32}$/;
const partPath = (id: string) => path.join(tmpDir(), id + '.part');

/** Recibe un pedazo del archivo (la subida va en partes de 4 MB para no chocar con límites del hosting) */
export async function appendChunk(uploadId: string, offset: number, chunk: Buffer) {
	if (!UPLOAD_ID.test(uploadId)) throw new Error('Subida no válida.');
	if (chunk.length > CHUNK_BYTES + 1024) throw new Error('Pedazo demasiado grande.');
	await fsp.mkdir(tmpDir(), { recursive: true });
	const p = partPath(uploadId);
	const size = fs.existsSync(p) ? (await fsp.stat(p)).size : 0;
	if (offset !== size) return { size, ok: false };
	if (size + chunk.length > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`El video no puede pesar más de ${MAX_VIDEO_MB} MB.`);
	await fsp.appendFile(p, chunk);
	return { size: size + chunk.length, ok: true };
}

/** Revisa los primeros bytes para confirmar que de verdad es un video */
function sniff(head: Buffer): string | null {
	if (head.length >= 12 && head.toString('latin1', 4, 8) === 'ftyp') {
		const brand = head.toString('latin1', 8, 12);
		return brand === 'qt  ' ? 'video/quicktime' : 'video/mp4';
	}
	if (head.length >= 4 && head.readUInt32BE(0) === 0x1a45dfa3) return 'video/webm';
	return null;
}

export async function finishUpload(uploadId: string) {
	if (!UPLOAD_ID.test(uploadId)) throw new Error('Subida no válida.');
	const p = partPath(uploadId);
	if (!fs.existsSync(p)) throw new Error('No se encontró el video subido. Vuelve a intentarlo.');
	const fh = await fsp.open(p, 'r');
	const head = Buffer.alloc(16);
	await fh.read(head, 0, 16, 0);
	await fh.close();
	const mime = sniff(head);
	if (!mime) {
		await fsp.rm(p, { force: true });
		throw new Error('El archivo no es un video MP4, WEBM o MOV.');
	}
	const name = crypto.randomBytes(10).toString('hex') + EXT[mime];
	await fsp.rename(p, path.join(videoDir(), name));
	const bytes = (await fsp.stat(path.join(videoDir(), name))).size;
	return { name, mime, bytes };
}

/** Borra subidas a medias de hace más de un día */
export async function cleanTmp() {
	try {
		for (const f of await fsp.readdir(tmpDir())) {
			const p = path.join(tmpDir(), f);
			if (Date.now() - (await fsp.stat(p)).mtimeMs > 86400000) await fsp.rm(p, { force: true });
		}
	} catch {
		/* no hay carpeta */
	}
}

export async function listVideos(onlyEnabled = false) {
	return all<Video & { show_title: string | null; show_slug: string | null }>(
		`SELECT v.*, s.title show_title, s.slug show_slug FROM videos v LEFT JOIN shows s ON s.id=v.show_id
		 ${onlyEnabled ? 'WHERE v.enabled=1' : ''} ORDER BY v.sort, v.id`
	);
}

export async function publicVideos(): Promise<PublicVideo[]> {
	return (await listVideos(true)).map((v) => ({
		id: v.id,
		title: v.title,
		caption: v.caption,
		kind: v.kind,
		src: v.kind === 'archivo' ? `/video/${v.src}` : v.src,
		vertical: v.kind !== 'youtube' || v.mime === 'shorts',
		cover: v.cover ? `/archivo/${v.cover}` : v.kind === 'youtube' ? `https://i.ytimg.com/vi/${v.src}/hqdefault.jpg` : null,
		show: v.show_slug ? { title: v.show_title!, slug: v.show_slug } : null
	}));
}

export const getVideo = (id: number) => get<Video>('SELECT * FROM videos WHERE id=?', [id]);

export async function createVideo(v: Omit<Video, 'id' | 'sort' | 'created_at' | 'enabled'>) {
	const max = await get<{ s: number | null }>('SELECT MAX(sort) s FROM videos');
	const { lastId } = await run(
		`INSERT INTO videos (title, caption, kind, src, mime, bytes, cover, show_id, enabled, sort, created_at) VALUES (?,?,?,?,?,?,?,?,1,?,?)`,
		[v.title, v.caption, v.kind, v.src, v.mime, v.bytes, v.cover, v.show_id, (max?.s ?? 0) + 1, Date.now()]
	);
	return lastId;
}

export async function removeVideo(v: Video) {
	await run('DELETE FROM videos WHERE id=?', [v.id]);
	if (v.kind === 'archivo') await fsp.rm(path.join(videoDir(), path.basename(v.src)), { force: true });
	if (v.cover) await deleteFile(v.cover);
}

/** Mueve un video una posición arriba o abajo */
export async function moveVideo(id: number, dir: -1 | 1) {
	const list = await all<{ id: number }>('SELECT id FROM videos ORDER BY sort, id');
	const i = list.findIndex((x) => x.id === id);
	const j = i + dir;
	if (i < 0 || j < 0 || j >= list.length) return false;
	[list[i], list[j]] = [list[j], list[i]];
	await Promise.all(list.map((x, k) => run('UPDATE videos SET sort=? WHERE id=?', [k + 1, x.id])));
	return true;
}
