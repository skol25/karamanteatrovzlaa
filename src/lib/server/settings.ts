import { get, run } from './db';
import { config } from './config';

/** Ajustes editables desde /admin/ajustes (se guardan en la tabla meta) */
export async function getSetting(k: string) {
	return (await get<{ v: string }>('SELECT v FROM meta WHERE k=?', ['setting:' + k]))?.v ?? null;
}
export async function setSetting(k: string, v: string) {
	await run('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v=excluded.v', ['setting:' + k, v]);
}

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;
export const parseEmails = (s: string) => [...new Set(s.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
export const invalidEmails = (list: string[]) => list.filter((e) => !EMAIL.test(e));

/** Correos que reciben los comprobantes: los del panel; si no hay, ADMIN_EMAIL (si es real) */
export async function adminEmails(): Promise<string[]> {
	const saved = await getSetting('admin_emails');
	if (saved) return parseEmails(saved);
	return config.adminEmail && !config.adminEmail.endsWith('.test') ? [config.adminEmail] : [];
}
