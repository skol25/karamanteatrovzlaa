import type { Handle } from '@sveltejs/kit/hooks';
import { isAdmin } from '#lib/server/auth.ts';
import { maybeRefreshBcv, currentRate, saveRate } from '#lib/server/bcv.ts';
import { demoMode, DEMO_RATE } from '#lib/server/config.ts';
import { todayCaracas } from '#lib/server/time.ts';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.admin = isAdmin(event.cookies);
	// Consulta la tasa BCV si ya pasó el intervalo. Si el BCV no responde, se sigue con la última tasa
	// (o la manual) y el error queda visible en /admin.
	if (event.request.method === 'GET' && !event.url.pathname.startsWith('/archivo')) {
		try {
			await maybeRefreshBcv();
			// En la demo, si el BCV no respondió, se usa una tasa de ejemplo para poder probar la compra
			if (demoMode && !(await currentRate())) await saveRate(DEMO_RATE, todayCaracas(), 'manual');
		} catch (e) {
			console.error('[BCV]', e);
		}
	}
	return resolve(event);
};
