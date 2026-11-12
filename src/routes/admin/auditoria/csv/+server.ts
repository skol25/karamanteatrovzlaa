import { error } from '@sveltejs/kit';
import { exportAudit, ACTIONS } from '#lib/server/audit.ts';
import { fechaHora } from '#lib/format.ts';

const cell = (v: unknown) => {
	const s = v == null ? '' : String(v);
	// evita que Excel interprete fórmulas
	const safe = /^[=+\-@]/.test(s) ? "'" + s : s;
	return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const GET = async ({ locals, url }) => {
	if (!locals.admin) error(401, 'No autorizado');
	const q = (k: string) => url.searchParams.get(k)?.trim() || '';
	const rows = await exportAudit({ kind: q('tipo'), action: q('accion'), q: q('q'), from: q('desde'), to: q('hasta') });
	const head = ['Fecha', 'Tipo', 'Quién', 'Acción', 'Descripción', 'Elemento', 'ID', 'IP', 'Navegador', 'Detalle'];
	const lines = rows.map((r) =>
		[fechaHora(r.at), r.kind, r.actor, ACTIONS[r.action] ?? r.action, r.summary, r.entity, r.entity_id, r.ip, r.user_agent, r.detail]
			.map(cell)
			.join(';')
	);
	// BOM + separador ";" para que Excel en español lo abra bien
	const csv = '﻿' + [head.join(';'), ...lines].join('\r\n');
	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="auditoria-karamantea-${new Date().toISOString().slice(0, 10)}.csv"`,
			'Cache-Control': 'no-store'
		}
	});
};
