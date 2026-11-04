import type { Handle } from '@sveltejs/kit/hooks';
import { isAdmin } from '#lib/server/auth.ts';
import { maybeRefreshBcv } from '#lib/server/bcv.ts';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.admin = isAdmin(event.cookies);
	// Consulta la tasa BCV si ya pasó el intervalo. Si el BCV no responde, se sigue con la última tasa
	// (o la manual) y el error queda visible en /admin.
	if (event.request.method === 'GET' && !event.url.pathname.startsWith('/archivo')) {
		try {
			await maybeRefreshBcv();
		} catch (e) {
			console.error('[BCV]', e);
		}
	}
	return resolve(event);
};
