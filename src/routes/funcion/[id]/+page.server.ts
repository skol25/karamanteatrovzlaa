import { error, fail, redirect } from '@sveltejs/kit';
import { getPerformance, takenSeats, holdSeats, BookingError } from '#lib/server/reservations.ts';
import { config } from '#lib/server/config.ts';

export const load = async ({ params, url, depends }) => {
	depends('app:seats');
	const perf = await getPerformance(Number(params.id));
	if (!perf) error(404, 'Función no encontrada');
	const past = new Date(perf.starts_at).getTime() <= Date.now();
	const taken = await takenSeats(perf.id);
	const left = perf.capacity - taken.length;
	const n = Math.max(1, Math.min(Number(url.searchParams.get('n')) || 1, config.maxTicketsPerOrder, Math.max(left, 1)));
	return { perf, taken, past, left, n, maxTickets: config.maxTicketsPerOrder, holdMinutes: config.holdMinutes };
};

export const actions = {
	default: async ({ request, params }) => {
		const fd = await request.formData();
		const seats = String(fd.get('seats') || '').split(',').map((s) => s.trim()).filter(Boolean);
		let token: string;
		try {
			token = await holdSeats(Number(params.id), seats);
		} catch (e) {
			if (e instanceof BookingError) return fail(400, { message: e.message });
			throw e;
		}
		redirect(303, `/reserva/${token}`);
	}
};
