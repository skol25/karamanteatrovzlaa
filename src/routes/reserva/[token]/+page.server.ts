import { error, fail } from '@sveltejs/kit';
import { getReservation, submitPayment, cancelHold, describeReservation, BookingError } from '#lib/server/reservations.ts';
import { audit } from '#lib/server/audit.ts';
import { get } from '#lib/server/db.ts';
import { listPaymentMethods, getPaymentMethod } from '#lib/server/payments.ts';

export const load = async ({ params, depends }) => {
	depends('app:reserva');
	const r = await getReservation(params.token);
	if (!r) error(404, 'Reserva no encontrada');
	return {
		r: {
			code: r.token.slice(0, 8).toUpperCase(),
			status: r.status,
			expire_reason: r.expire_reason,
			qty: r.qty,
			seats: r.seats,
			lines: r.lines,
			rate: r.rate,
			rate_date: r.rate_date,
			unit_usd: r.unit_usd,
			total_usd: r.total_usd,
			total_bs: r.total_bs,
			expires_at: r.expires_at,
			created_at: r.created_at,
			email: r.email,
			buyer_name: r.buyer_name,
			perf: r.performance
		},
		serverNow: Date.now(),
		// Array de métodos de pago activos que el cliente puede elegir
		paymentMethods: r.status === 'held' ? await listPaymentMethods(true) : []
	};
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const actions = {
	pagar: async (event) => {
		const { request, params } = event;
		const fd = await request.formData();
		const v = (k: string) => String(fd.get(k) ?? '').trim();
		const values = {
			buyer_name: v('buyer_name'),
			buyer_doc: v('buyer_doc'),
			email: v('email').toLowerCase(),
			phone: v('phone'),
			pay_method_id: v('pay_method_id'),
			pay_bank: v('pay_bank'),
			pay_ref: v('pay_ref')
		};
		const file = fd.get('receipt');
		const errors: Record<string, string> = {};
		if (values.buyer_name.length < 3) errors.buyer_name = 'Escribe tu nombre completo.';
		if (!/^[VEJPG]?-?\d{5,10}$/i.test(values.buyer_doc.replace(/\./g, ''))) errors.buyer_doc = 'Cédula o RIF no válido.';
		if (!EMAIL.test(values.email)) errors.email = 'Correo no válido.';
		if (values.phone.replace(/\D/g, '').length < 10) errors.phone = 'Teléfono no válido.';
		const method = Number(values.pay_method_id) ? await getPaymentMethod(Number(values.pay_method_id)) : null;
		if (!method || !method.enabled) errors.pay_method = 'Elige el método de pago que usaste.';
		if (!values.pay_bank) errors.pay_bank = 'Indica el banco desde el que pagaste.';
		if (values.pay_ref.replace(/\D/g, '').length < 4) errors.pay_ref = 'Escribe el número de referencia.';
		if (!(file instanceof File) || file.size === 0) errors.receipt = 'Adjunta el comprobante de pago.';
		if (Object.keys(errors).length) return fail(400, { errors, values });
		let full;
		try {
			const { pay_method_id, ...rest } = values;
			full = await submitPayment(params.token, { ...rest, pay_method: method!.data.banco ? `${method!.label} (${method!.data.banco})` : method!.label, file: file as File });
		} catch (e) {
			if (e instanceof BookingError) return fail(400, { message: e.message, values, errors: {} as Record<string, string> });
			throw e;
		}
		const d = await describeReservation(full.id);
		await audit(event, {
			kind: 'venta',
			action: 'pago_reportado',
			actor: `${full.buyer_name} <${full.email}>`,
			summary: `Pago reportado: ${d.text} · Ref. ${full.pay_ref}`,
			entity: 'reserva',
			entityId: full.id,
			detail: { metodo: full.pay_method, banco_origen: full.pay_bank, referencia: full.pay_ref, cedula: full.buyer_doc, telefono: full.phone }
		});
		return { ok: true };
	},
	cancelar: async (event) => {
		const { params } = event;
		const r = await get<{ id: number; status: string }>('SELECT id, status FROM reservations WHERE token=?', [params.token]);
		await cancelHold(params.token);
		if (r?.status === 'held') {
			const d = await describeReservation(r.id);
			await audit(event, { kind: 'venta', action: 'reserva_cancelada', summary: `El comprador soltó los asientos: ${d.text}`, entity: 'reserva', entityId: r.id });
		}
		return { cancelled: true };
	}
};
