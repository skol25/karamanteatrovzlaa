import { saveFile } from './files.ts';

export const slugify = (t: string) =>
	t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const POSTER_TYPES: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

export async function savePoster(file: FormDataEntryValue | null) {
	if (!(file instanceof File) || file.size === 0) return undefined;
	const ext = POSTER_TYPES[file.type];
	if (!ext || file.size > 3 * 1024 * 1024) throw new Error('El afiche debe ser JPG/PNG/WEBP de máximo 3 MB.');
	return saveFile(Buffer.from(await file.arrayBuffer()), file.type, ext);
}
