import { fail, redirect } from '@sveltejs/kit';
import { all } from '#lib/server/db.ts';
import { checkPassword, login, logout } from '#lib/server/auth.ts';
import { currentRate, recentRates, refreshFromBcv, saveRate, fetchStatus } from '#lib/server/bcv.ts';
import { confirmReservation, rejectReservation, sweepExpired, BookingError } from '#lib/server/reservations.ts';
import { todayCaracas } from '#lib/server/time.ts';

export const load = async ({ locals }) => {
	if (!locals.admin) return { authed: false as const };
	await sweepExpired();
	const rows = await all<any>(
			`SELECT r.*, s.title, p.starts_at, p.venue,
			 (SELECT group_concat(seat, ', ') FROM reservation_seat_log l WHERE l.reservation_id=r.id) seats
			 FROM reservations r JOIN performances p ON p.id=r.performance_id JOIN shows s ON s.id=p.show_id
			 ORDER BY CASE r.status WHEN 'submitted' THEN 0 WHEN 'held' THEN 1 ELSE 2 END, r.created_at DESC LIMIT 200`
	);
	return {
		authed: true as const,
		rows,
		current: await currentRate(),
		rates: await recentRates(8),
		lastFetch: await fetchStatus(),
		today: todayCaracas(),
		stats: {
			pending: rows.filter((r) => r.status === 'submitted').length,
			held: rows.filter((r) => r.status === 'held').length,
			confirmedBs: rows.filter((r) => r.status === 'confirmed').reduce((a, r) => a + r.total_bs, 0),
			tickets: rows.filter((r) => r.status === 'confirmed').reduce((a, r) => a + r.qty, 0)
		}
	};
};

const guard = (locals: App.Locals) => {
	if (!locals.admin) redirect(303, '/admin');
};

export const actions = {
	login: async ({ request, cookies, url }) => {
		const pw = String((await request.formData()).get('password') || '');
		if (!checkPassword(pw)) return fail(401, { loginError: 'Clave incorrecta' });
		login(cookies, url.protocol === 'https:');
		redirect(303, '/admin');
	},
	logout: async ({ cookies }) => {
		logout(cookies);
		redirect(303, '/admin');
	},
	bcv: async ({ locals }) => {
		guard(locals);
		const ok = await refreshFromBcv();
		await sweepExpired();
		return ok ? { notice: 'Tasa consultada en el BCV.' } : fail(502, { error: 'No se pudo leer el BCV: ' + (await fetchStatus()).message });
	},
	tasa: async ({ request, locals }) => {
		guard(locals);
		const fd = await request.formData();
		const rate = Number(String(fd.get('rate') || '').replace(/\./g, '').replace(',', '.'));
		const date = String(fd.get('valid_date') || '');
		if (!(rate > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, { error: 'Tasa o fecha no válida.' });
		await saveRate(rate, date, 'manual');
		await sweepExpired();
		return { notice: 'Tasa manual registrada.' };
	},
	confirmar: async ({ request, locals }) => {
		guard(locals);
		const id = Number((await request.formData()).get('id'));
		try {
			await confirmReservation(id);
		} catch (e) {
			if (e instanceof BookingError) return fail(400, { error: e.message });
			throw e;
		}
		return { notice: 'Pago confirmado. Entradas enviadas al comprador.' };
	},
	rechazar: async ({ request, locals }) => {
		guard(locals);
		const fd = await request.formData();
		try {
			await rejectReservation(Number(fd.get('id')), String(fd.get('note') || '').trim());
		} catch (e) {
			if (e instanceof BookingError) return fail(400, { error: e.message });
			throw e;
		}
		return { notice: 'Pago rechazado. Asientos liberados y comprador notificado.' };
	}
};
