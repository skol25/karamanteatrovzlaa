import { redirect } from '@sveltejs/kit';
import { all } from '#lib/server/db.ts';

export const load = async ({ locals, url }) => {
	if (!locals.admin) redirect(303, '/admin');
	const mails = await all<{ id: number; to_addr: string; subject: string; html: string; attachments: string; delivered: number; error: string | null; created_at: number }>(
		'SELECT * FROM outbox ORDER BY id DESC LIMIT 100'
	);
	const sel = Number(url.searchParams.get('id')) || mails[0]?.id || 0;
	return { mails: mails.map(({ html, ...m }) => m), selected: mails.find((m) => m.id === sel) ?? null };
};
