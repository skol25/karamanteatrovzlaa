import { fail, redirect } from '@sveltejs/kit';
import { all, get, run } from '#lib/server/db.ts';
import { audit } from '#lib/server/audit.ts';

export const load = async ({ locals }) => {
	if (!locals.admin) redirect(303, '/admin');
	return {
		venues: await all<{ id: number; name: string; city: string; address: string; layout: string | null; capacity: number; funciones: number }>(
			`SELECT v.*, (SELECT COUNT(*) FROM performances p WHERE p.venue_id=v.id) funciones FROM venues v ORDER BY v.name`
		)
	};
};

export const actions = {
	borrar: async (event) => {
		if (!event.locals.admin) redirect(303, '/admin');
		const id = Number((await event.request.formData()).get('id'));
		const v = await get<{ name: string }>('SELECT name FROM venues WHERE id=?', [id]);
		if (!v) return fail(404, { error: 'La sala no existe.' });
		await run('UPDATE performances SET venue_id=NULL WHERE venue_id=?', [id]);
		await run('DELETE FROM venues WHERE id=?', [id]);
		await audit(event, { kind: 'admin', action: 'sala_borrada', summary: `Eliminó la sala «${v.name}» (las funciones conservan su plano)`, entity: 'sala', entityId: id });
		return { notice: 'Sala eliminada. Las funciones que la usaban conservan su plano.' };
	}
};
