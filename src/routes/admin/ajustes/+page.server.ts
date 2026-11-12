import { fail, redirect } from '@sveltejs/kit';
import { adminEmails, getSetting, setSetting, parseEmails, invalidEmails } from '#lib/server/settings.ts';
import { sendMail, layout, mailStatus } from '#lib/server/mail.ts';
import { audit } from '#lib/server/audit.ts';
import { all } from '#lib/server/db.ts';

export const load = async ({ locals }) => {
	if (!locals.admin) redirect(303, '/admin');
	return {
		emails: await adminEmails(),
		fromPanel: !!(await getSetting('admin_emails')),
		mail: mailStatus(),
		lastTests: await all<{ to_addr: string; delivered: number; error: string | null; created_at: number }>(
			`SELECT to_addr, delivered, error, created_at FROM outbox WHERE subject LIKE 'Correo de prueba%' ORDER BY id DESC LIMIT 5`
		)
	};
};

export const actions = {
	correos: async (event) => {
		if (!event.locals.admin) redirect(303, '/admin');
		const raw = String((await event.request.formData()).get('emails') ?? '');
		const list = parseEmails(raw);
		if (!list.length) return fail(400, { error: 'Escribe al menos un correo.', raw });
		const bad = invalidEmails(list);
		if (bad.length) return fail(400, { error: `Revisa ${bad.length > 1 ? 'estos correos' : 'este correo'}: ${bad.join(', ')}`, raw });
		if (list.length > 5) return fail(400, { error: 'Máximo 5 correos.', raw });
		const before = await adminEmails();
		await setSetting('admin_emails', list.join(','));
		await audit(event, {
			kind: 'admin',
			action: 'ajustes_correo',
			summary: `Cambió los correos que reciben los comprobantes: ${list.join(', ')}`,
			detail: { antes: before.join(', ') || '—', ahora: list.join(', ') }
		});
		return { notice: 'Correos guardados. Envía un correo de prueba para confirmar que llegan.' };
	},
	prueba: async (event) => {
		if (!event.locals.admin) redirect(303, '/admin');
		const to = await adminEmails();
		if (!to.length) return fail(400, { error: 'Primero guarda al menos un correo.' });
		const ok = await sendMail(
			to.join(', '),
			'Correo de prueba · Karamantea Teatro',
			layout(
				'¡Los avisos de pago te llegarán aquí!',
				`<p style="color:#cfcfcf;font-size:14px;line-height:1.6">Este es un correo de prueba enviado desde el panel de administración de karamantea.com. Cada vez que un cliente reporte un pago, recibirás en este correo el aviso con el comprobante adjunto.</p>
				<p style="color:#8a8a8a;font-size:12px">Si este correo llegó a la carpeta de spam, márcalo como "No es spam" para que los próximos lleguen a la bandeja de entrada.</p>`
			)
		);
		await audit(event, { kind: 'admin', action: 'correo_prueba', summary: `Envió un correo de prueba a ${to.join(', ')}${ok ? '' : ' (no se pudo enviar)'}` });
		return ok
			? { notice: `Correo de prueba enviado a ${to.join(', ')}. Revisa la bandeja de entrada (y spam).` }
			: fail(502, { error: 'El servidor no pudo enviar el correo. Revisa el detalle en Correos.' });
	}
};
