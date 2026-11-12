import { fail, redirect } from '@sveltejs/kit';
import { all } from '#lib/server/db.ts';
import { saveFile } from '#lib/server/files.ts';
import { audit } from '#lib/server/audit.ts';
import {
	listVideos,
	getVideo,
	createVideo,
	removeVideo,
	moveVideo,
	finishUpload,
	parseVideoLink,
	cleanTmp,
	MAX_VIDEO_MB,
	CHUNK_BYTES
} from '#lib/server/videos.ts';
import { run } from '#lib/server/db.ts';
import { deleteFile } from '#lib/server/files.ts';

export const load = async ({ locals }) => {
	if (!locals.admin) redirect(303, '/admin');
	cleanTmp();
	return {
		videos: await listVideos(),
		shows: await all<{ id: number; title: string }>('SELECT id, title FROM shows ORDER BY title'),
		maxMb: MAX_VIDEO_MB,
		chunk: CHUNK_BYTES
	};
};

const IMG: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

async function saveCover(f: FormDataEntryValue | null) {
	if (!(f instanceof File) || f.size === 0) return null;
	const ext = IMG[f.type];
	if (!ext || f.size > 3 * 1024 * 1024) throw new Error('La portada debe ser JPG/PNG/WEBP de máximo 3 MB.');
	return saveFile(Buffer.from(await f.arrayBuffer()), f.type, ext);
}

const guard = (locals: App.Locals) => {
	if (!locals.admin) redirect(303, '/admin');
};

const KIND_NAME = { archivo: 'archivo', youtube: 'YouTube', instagram: 'Instagram' } as const;

export const actions = {
	crear: async (event) => {
		guard(event.locals);
		const fd = await event.request.formData();
		const v = (k: string) => String(fd.get(k) ?? '').trim();
		const title = v('title');
		if (!title) return fail(400, { error: 'Ponle un título al video.' });
		let kind: 'archivo' | 'youtube' | 'instagram';
		let src: string;
		let mime: string | null = null;
		let bytes: number | null = null;
		try {
			if (v('source') === 'link') {
				const parsed = parseVideoLink(v('url'));
				if (!parsed) return fail(400, { error: 'El enlace debe ser de YouTube o de Instagram (reel o publicación).' });
				({ kind, src } = parsed);
				if (parsed.vertical) mime = 'shorts';
			} else {
				if (!v('upload_id')) return fail(400, { error: 'Elige un video para subir.' });
				const up = await finishUpload(v('upload_id'));
				kind = 'archivo';
				src = up.name;
				mime = up.mime;
				bytes = up.bytes;
			}
			const cover = await saveCover(fd.get('cover'));
			const showId = Number(v('show_id')) || null;
			const id = await createVideo({ title, caption: v('caption'), description: v('description'), kind, src, mime, bytes, cover, show_id: showId });
			await audit(event, {
				kind: 'admin',
				action: 'video_creado',
				summary: `Agregó el video «${title}» (${KIND_NAME[kind]}${bytes ? `, ${(bytes / 1048576).toFixed(1)} MB` : ''})`,
				entity: 'video',
				entityId: id,
				detail: { title, caption: v('caption'), kind, src, show_id: showId }
			});
		} catch (e) {
			return fail(400, { error: (e as Error).message });
		}
		return { notice: 'Video agregado al carrusel.' };
	},
	editar: async (event) => {
		guard(event.locals);
		const fd = await event.request.formData();
		const v = (k: string) => String(fd.get(k) ?? '').trim();
		const video = await getVideo(Number(v('id')));
		if (!video) return fail(404, { error: 'El video no existe.' });
		const title = v('title') || video.title;
		const caption = v('caption');
		const description = v('description');
		const showId = Number(v('show_id')) || null;
		let cover = video.cover;
		try {
			const nc = await saveCover(fd.get('cover'));
			if (nc) {
				if (video.cover && !video.cover.startsWith('/')) await deleteFile(video.cover);
				cover = nc;
			}
		} catch (e) {
			return fail(400, { error: (e as Error).message });
		}
		await run('UPDATE videos SET title=?, caption=?, description=?, show_id=?, cover=? WHERE id=?', [title, caption, description, showId, cover, video.id]);
		const changes: Record<string, { antes: unknown; ahora: unknown }> = {};
		if (title !== video.title) changes.titulo = { antes: video.title, ahora: title };
		if (caption !== (video.caption ?? '')) changes.descripcion = { antes: video.caption, ahora: caption };
		if (description !== (video.description ?? '')) changes.texto = { antes: video.description, ahora: description };
		if (showId !== video.show_id) changes.obra = { antes: video.show_id, ahora: showId };
		if (cover !== video.cover) changes.portada = { antes: video.cover, ahora: cover };
		await audit(event, {
			kind: 'admin',
			action: 'video_editado',
			summary: `Editó el video «${title}»${Object.keys(changes).length ? ': cambió ' + Object.keys(changes).join(', ') : ' (sin cambios)'}`,
			entity: 'video',
			entityId: video.id,
			detail: changes
		});
		return { notice: 'Video actualizado.' };
	},
	visible: async (event) => {
		guard(event.locals);
		const fd = await event.request.formData();
		const video = await getVideo(Number(fd.get('id')));
		if (!video) return fail(404, { error: 'El video no existe.' });
		const on = fd.get('enabled') === '1';
		await run('UPDATE videos SET enabled=? WHERE id=?', [on ? 1 : 0, video.id]);
		await audit(event, {
			kind: 'admin',
			action: on ? 'video_visible' : 'video_oculto',
			summary: `${on ? 'Mostró' : 'Ocultó'} el video «${video.title}» en la portada`,
			entity: 'video',
			entityId: video.id
		});
		return { notice: on ? 'El video se ve en la portada.' : 'Video oculto.' };
	},
	mover: async (event) => {
		guard(event.locals);
		const fd = await event.request.formData();
		const video = await getVideo(Number(fd.get('id')));
		if (!video) return fail(404, { error: 'El video no existe.' });
		const dir = fd.get('dir') === 'up' ? -1 : 1;
		if (await moveVideo(video.id, dir))
			await audit(event, {
				kind: 'admin',
				action: 'video_movido',
				summary: `Movió el video «${video.title}» hacia ${dir < 0 ? 'adelante' : 'atrás'} en el carrusel`,
				entity: 'video',
				entityId: video.id
			});
		return {};
	},
	borrar: async (event) => {
		guard(event.locals);
		const video = await getVideo(Number((await event.request.formData()).get('id')));
		if (!video) return fail(404, { error: 'El video no existe.' });
		await removeVideo(video);
		await audit(event, {
			kind: 'admin',
			action: 'video_borrado',
			summary: `Eliminó el video «${video.title}»`,
			entity: 'video',
			entityId: video.id,
			detail: { title: video.title, kind: video.kind, src: video.src }
		});
		return { notice: 'Video eliminado.' };
	}
};
