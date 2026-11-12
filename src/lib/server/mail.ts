import nodemailer from 'nodemailer';
import { config } from './config';
import { run } from './db';

/**
 * Cómo se envían los correos:
 *  - SMTP_HOST definido → por SMTP (Brevo, Private Email, Gmail…)
 *  - MAIL_TRANSPORT=sendmail → con el sendmail del propio servidor (cPanel/Namecheap), sin contraseña
 *  - nada → solo se registran en /admin/correos (demo)
 */
const smtpReady = !!config.smtp.host;
const useSendmail = !smtpReady && process.env.MAIL_TRANSPORT === 'sendmail';

const transport = smtpReady
	? nodemailer.createTransport({
			host: config.smtp.host,
			port: config.smtp.port,
			secure: config.smtp.secure,
			auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined
		})
	: useSendmail
		? nodemailer.createTransport({ sendmail: true, newline: 'unix', path: process.env.SENDMAIL_PATH || '/usr/sbin/sendmail' })
		: null;
const canSend = !!transport;
const replyTo = process.env.MAIL_REPLY_TO || undefined;

/** Cómo está saliendo el correo (para mostrarlo en /admin/ajustes) */
export const mailStatus = () => ({
	mode: smtpReady ? 'smtp' : useSendmail ? 'sendmail' : 'none',
	from: config.smtp.from
});

export type Attachment = { filename: string; content: Buffer; contentType?: string; cid?: string };

/**
 * Envía el correo por SMTP (si está configurado) y siempre lo registra en la tabla outbox,
 * visible en /admin/correos. Así la demo muestra los correos aunque no haya SMTP.
 */
export async function sendMail(to: string, subject: string, html: string, attachments: Attachment[] = []) {
	let delivered = 0;
	let error: string | null = canSend ? null : 'Envío de correo no configurado (solo registrado)';
	if (transport) {
		try {
			await transport.sendMail({ from: config.smtp.from, replyTo, to, subject, html, attachments });
			delivered = 1;
		} catch (e) {
			error = (e as Error).message;
			console.error('[correo] error enviando a', to, e);
		}
	}
	await run('INSERT INTO outbox (to_addr, subject, html, attachments, delivered, error, created_at) VALUES (?,?,?,?,?,?,?)', [
		to,
		subject,
		html,
		attachments.map((a) => a.filename).join(', '),
		delivered,
		error,
		Date.now()
	]);
	return delivered === 1;
}

const esc = (s: unknown) =>
	String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Plantilla base del correo con la estética de Karamantea */
export function layout(title: string, body: string) {
	return `<!doctype html><html><body style="margin:0;background:#0b0b0b;font-family:Arial,Helvetica,sans-serif;color:#e9e9e9">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0b;padding:32px 12px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#151515;border-radius:14px;overflow:hidden;border:1px solid #2a2a2a">
<tr><td style="padding:22px 28px;border-bottom:3px solid #abce26">
<span style="font-size:13px;letter-spacing:6px;color:#fff">KARAMANTEA</span>
<span style="font-size:11px;letter-spacing:4px;color:#abce26"> TEATRO</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;color:#fff;font-weight:600">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 28px;background:#101010;color:#8a8a8a;font-size:12px">Karamantea Teatro · RIF J-40722213-9 · @karamanteatrovzla</td></tr>
</table></td></tr></table></body></html>`;
}

export { esc };
