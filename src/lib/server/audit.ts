import type { RequestEvent } from '@sveltejs/kit';
import { all, get, run } from './db';

/**
 * Registro de auditoría.
 *  - admin:   acciones hechas desde el panel (inicio de sesión, confirmar pagos, editar obras…)
 *  - venta:   lo que hacen los compradores (apartar asientos, reportar pagos, cancelar)
 *  - sistema: lo automático (tasa BCV nueva, reservas vencidas)
 */
export type AuditKind = 'admin' | 'venta' | 'sistema';

export type AuditEntry = {
	kind: AuditKind;
	action: string;
	summary: string;
	actor?: string;
	entity?: string;
	entityId?: string | number;
	detail?: unknown;
};

export type AuditRow = {
	id: number;
	at: number;
	kind: AuditKind;
	actor: string;
	action: string;
	summary: string;
	entity: string | null;
	entity_id: string | null;
	detail: string | null;
	ip: string | null;
	user_agent: string | null;
};

const DEFAULT_ACTOR: Record<AuditKind, string> = { admin: 'Administrador', venta: 'Comprador', sistema: 'Sistema' };

export function clientIp(ev: RequestEvent | null | undefined) {
	if (!ev) return null;
	const xf = ev.request.headers.get('x-forwarded-for') || ev.request.headers.get('x-real-ip');
	if (xf) return xf.split(',')[0].trim();
	try {
		return ev.getClientAddress();
	} catch {
		return null;
	}
}

/** Nunca rompe la operación principal: si falla el registro, solo se anota en la consola. */
export async function audit(ev: RequestEvent | null | undefined, e: AuditEntry) {
	try {
		await run(
			`INSERT INTO audit_log (at, kind, actor, action, summary, entity, entity_id, detail, ip, user_agent) VALUES (?,?,?,?,?,?,?,?,?,?)`,
			[
				Date.now(),
				e.kind,
				(e.actor || DEFAULT_ACTOR[e.kind]).slice(0, 120),
				e.action,
				e.summary.slice(0, 500),
				e.entity ?? null,
				e.entityId != null ? String(e.entityId) : null,
				e.detail !== undefined ? JSON.stringify(e.detail) : null,
				clientIp(ev),
				ev?.request.headers.get('user-agent')?.slice(0, 200) ?? null
			]
		);
	} catch (err) {
		console.error('[auditoría]', err);
	}
}

export const ACTIONS: Record<string, string> = {
	login: 'Inicio de sesión',
	login_fallido: 'Clave incorrecta',
	logout: 'Cierre de sesión',
	tasa_bcv: 'Tasa BCV',
	tasa_manual: 'Tasa manual',
	consulta_bcv: 'Consulta al BCV',
	pago_confirmado: 'Pago confirmado',
	pago_rechazado: 'Pago rechazado',
	obra_creada: 'Obra creada',
	obra_principal: 'Obra principal',
	funcion_creada: 'Función creada',
	funcion_borrada: 'Función eliminada',
	metodo_creado: 'Método de pago creado',
	metodo_editado: 'Método de pago editado',
	metodo_activado: 'Método de pago activado',
	metodo_desactivado: 'Método de pago desactivado',
	metodo_borrado: 'Método de pago eliminado',
	video_creado: 'Video agregado',
	video_editado: 'Video editado',
	video_visible: 'Video visible',
	video_oculto: 'Video oculto',
	video_movido: 'Video reordenado',
	video_borrado: 'Video eliminado',
	reserva_creada: 'Asientos apartados',
	pago_reportado: 'Pago reportado',
	reserva_cancelada: 'Reserva cancelada',
	reserva_vencida: 'Reserva vencida'
};

export type AuditFilter = { kind?: string; action?: string; q?: string; from?: string; to?: string; page?: number };

const PAGE = 50;

function where(f: AuditFilter) {
	const w: string[] = [];
	const args: (string | number)[] = [];
	if (f.kind && ['admin', 'venta', 'sistema'].includes(f.kind)) w.push('kind=?'), args.push(f.kind);
	if (f.action) w.push('action=?'), args.push(f.action);
	if (f.q) {
		w.push(`(summary LIKE ? OR actor LIKE ? OR ip LIKE ? OR detail LIKE ? OR entity_id = ?)`);
		const like = `%${f.q}%`;
		args.push(like, like, like, like, f.q);
	}
	// fechas en hora de Caracas (UTC-4)
	if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) w.push('at >= ?'), args.push(Date.parse(`${f.from}T00:00:00-04:00`));
	if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) w.push('at < ?'), args.push(Date.parse(`${f.to}T00:00:00-04:00`) + 86400000);
	return { sql: w.length ? 'WHERE ' + w.join(' AND ') : '', args };
}

export async function listAudit(f: AuditFilter) {
	const { sql, args } = where(f);
	const page = Math.max(1, f.page || 1);
	const total = (await get<{ n: number }>(`SELECT COUNT(*) n FROM audit_log ${sql}`, args))!.n;
	const rows = await all<AuditRow>(`SELECT * FROM audit_log ${sql} ORDER BY at DESC, id DESC LIMIT ? OFFSET ?`, [...args, PAGE, (page - 1) * PAGE]);
	return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE)) };
}

export async function exportAudit(f: AuditFilter) {
	const { sql, args } = where(f);
	return all<AuditRow>(`SELECT * FROM audit_log ${sql} ORDER BY at DESC, id DESC LIMIT 20000`, args);
}

export async function auditCounts() {
	const since = Date.now() - 86400000;
	return (await get<{ hoy: number; fallidos: number }>(
		`SELECT COUNT(*) hoy, SUM(CASE WHEN action='login_fallido' THEN 1 ELSE 0 END) fallidos FROM audit_log WHERE at >= ?`,
		[since]
	))!;
}
