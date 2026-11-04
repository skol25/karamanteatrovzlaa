import { currentRate } from '#lib/server/bcv.ts';

export const load = async ({ locals }) => {
	const r = await currentRate();
	return { rate: r ? { rate: r.rate, valid_date: r.valid_date, source: r.source } : null, admin: locals.admin };
};
