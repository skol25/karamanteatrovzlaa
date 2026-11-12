import { fail, redirect } from '@sveltejs/kit';
import { adminEmails, getSetting, setSetting, parseEmails, invalidEmails } from '#lib/server/settings.ts';
import { sendMail, mailStatus } from '#lib/server/mail.ts';
import { testMail } from '#lib/server/emails.ts';
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
		const m = testMail();
		const ok = await sendMail(to.join(', '), m.subject, m.html);

		await audit(event, { kind: 'admin', action: 'correo_prueba', summary: `Envió un correo de prueba a ${to.join(', ')}${ok ? '' : ' (no se pudo enviar)'}` });
		return ok
			? { notice: `Correo de prueba enviado a ${to.join(', ')}. Revisa la bandeja de entrada (y spam).` }
			: fail(502, { error: 'El servidor no pudo enviar el correo. Revisa el detalle en Correos.' });
	}
};
