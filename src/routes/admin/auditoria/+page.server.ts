import { redirect } from '@sveltejs/kit';
import { listAudit, auditCounts, ACTIONS } from '#lib/server/audit.ts';

export const load = async ({ locals, url }) => {
	if (!locals.admin) redirect(303, '/admin');
	const q = (k: string) => url.searchParams.get(k)?.trim() || '';
	const filter = { kind: q('tipo'), action: q('accion'), q: q('q'), from: q('desde'), to: q('hasta'), page: Number(q('pagina')) || 1 };
	return { ...(await listAudit(filter)), filter, counts: await auditCounts(), actions: ACTIONS };
};
