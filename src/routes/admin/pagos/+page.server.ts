import { fail, redirect } from '@sveltejs/kit';
import {
	listPaymentMethods,
	getPaymentMethod,
	cleanPaymentData,
	savePaymentMethod,
	setPaymentMethodEnabled,
	deletePaymentMethod
} from '#lib/server/payments.ts';
import { PAYMENT_TYPES } from '#lib/payments.ts';
import { audit } from '#lib/server/audit.ts';

export const load = async ({ locals }) => {
	if (!locals.admin) redirect(303, '/admin');
	return { methods: await listPaymentMethods() };
};

const guard = (locals: App.Locals) => {
	if (!locals.admin) redirect(303, '/admin');
};

export const actions = {
	guardar: async (event) => {
		const { request, locals } = event;
		guard(locals);
		const fd = await request.formData();
		const v = (k: string) => String(fd.get(k) ?? '');
		const type = v('type') || 'pago_movil';
		const id = Number(v('id')) || undefined;
		const before = id ? await getPaymentMethod(id) : null;
		if (id && !before) return fail(404, { error: 'El método no existe.' });
		const { data, error } = cleanPaymentData(type, (k) => v('f_' + k));
		if (error) return fail(400, { error });
		const label = v('label').trim() || PAYMENT_TYPES[type as keyof typeof PAYMENT_TYPES].name;
		const enabled = fd.get('enabled') === 'on';
		const newId = await savePaymentMethod({ id, type, label, data: data!, enabled });
		const changed = before
			? Object.fromEntries(
					Object.entries({ label, enabled, ...data! })
						.filter(([k, v]) => (k in before.data ? before.data[k] : (before as any)[k]) !== v)
						.map(([k, v]) => [k, { antes: k in before.data ? before.data[k] : (before as any)[k], ahora: v }])
				)
			: { label, enabled, ...data! };
		await audit(event, {
			kind: 'admin',
			action: id ? 'metodo_editado' : 'metodo_creado',
			summary: id
				? `Editó el método de pago «${label}»${Object.keys(changed).length ? ': cambió ' + Object.keys(changed).join(', ') : ' (sin cambios)'}`
				: `Creó el método de pago «${label}» (${data!.banco ?? ''} · ${data!.telefono ?? ''})`,
			entity: 'metodo_pago',
			entityId: id ?? (typeof newId === 'number' ? newId : undefined),
			detail: changed
		});
		return { notice: id ? 'Método de pago actualizado.' : 'Método de pago creado.' };
	},
	activar: async (event) => {
		guard(event.locals);
		const fd = await event.request.formData();
		const id = Number(fd.get('id'));
		const on = fd.get('enabled') === '1';
		const m = await getPaymentMethod(id);
		await setPaymentMethodEnabled(id, on);
		await audit(event, {
			kind: 'admin',
			action: on ? 'metodo_activado' : 'metodo_desactivado',
			summary: `${on ? 'Activó' : 'Desactivó'} el método de pago «${m?.label ?? id}»`,
			entity: 'metodo_pago',
			entityId: id
		});
		return { notice: 'Listo.' };
	},
	borrar: async (event) => {
		guard(event.locals);
		const id = Number((await event.request.formData()).get('id'));
		const m = await getPaymentMethod(id);
		await deletePaymentMethod(id);
		await audit(event, {
			kind: 'admin',
			action: 'metodo_borrado',
			summary: `Eliminó el método de pago «${m?.label ?? id}»`,
			entity: 'metodo_pago',
			entityId: id,
			detail: m ?? undefined
		});
		return { notice: 'Método de pago eliminado.' };
	}
};
