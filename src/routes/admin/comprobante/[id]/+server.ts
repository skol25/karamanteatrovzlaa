import { error, redirect } from '@sveltejs/kit';
import { get } from '#lib/server/db.ts';

export const GET = async ({ params, locals }) => {
	if (!locals.admin) error(401, 'No autorizado');
	const r = await get<{ receipt_file: string | null }>('SELECT receipt_file FROM reservations WHERE id=?', [Number(params.id)]);
	if (!r?.receipt_file) error(404, 'Sin comprobante');
	redirect(302, '/archivo/' + r.receipt_file);
};
