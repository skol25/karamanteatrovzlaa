import { all, get, run } from './db';
import { PAYMENT_TYPES, type PaymentMethod, type PaymentType } from '#lib/payments.ts';

type Row = { id: number; type: string; label: string; data: string; enabled: number; sort: number };

const toMethod = (r: Row): PaymentMethod => ({
	id: r.id,
	type: r.type as PaymentType,
	label: r.label,
	enabled: !!r.enabled,
	data: JSON.parse(r.data || '{}')
});

export async function listPaymentMethods(onlyEnabled = false): Promise<PaymentMethod[]> {
	const rows = await all<Row>(
		`SELECT * FROM payment_methods ${onlyEnabled ? 'WHERE enabled=1' : ''} ORDER BY sort, id`
	);
	return rows.map(toMethod);
}

export async function getPaymentMethod(id: number) {
	const r = await get<Row>('SELECT * FROM payment_methods WHERE id=?', [id]);
	return r ? toMethod(r) : null;
}

/** Valida y limpia los datos según los campos del tipo */
export function cleanPaymentData(type: string, input: (k: string) => string) {
	const def = PAYMENT_TYPES[type as PaymentType];
	if (!def) return { error: 'Tipo de método no válido.' };
	const data: Record<string, string> = {};
	for (const f of def.fields) {
		const v = input(f.key).trim();
		if (f.required && !v) return { error: `Falta el campo «${f.label}».` };
		data[f.key] = v;
	}
	return { data };
}

export async function savePaymentMethod(m: { id?: number; type: string; label: string; data: Record<string, string>; enabled: boolean }) {
	if (m.id) {
		await run('UPDATE payment_methods SET type=?, label=?, data=?, enabled=? WHERE id=?', [
			m.type,
			m.label,
			JSON.stringify(m.data),
			m.enabled ? 1 : 0,
			m.id
		]);
		return m.id;
	}
	const max = await get<{ s: number | null }>('SELECT MAX(sort) s FROM payment_methods');
	const { lastId } = await run('INSERT INTO payment_methods (type,label,data,enabled,sort,created_at) VALUES (?,?,?,?,?,?)', [
		m.type,
		m.label,
		JSON.stringify(m.data),
		m.enabled ? 1 : 0,
		(max?.s ?? 0) + 1,
		Date.now()
	]);
	return lastId;
}

export async function setPaymentMethodEnabled(id: number, enabled: boolean) {
	await run('UPDATE payment_methods SET enabled=? WHERE id=?', [enabled ? 1 : 0, id]);
}

export async function deletePaymentMethod(id: number) {
	await run('DELETE FROM payment_methods WHERE id=?', [id]);
}
