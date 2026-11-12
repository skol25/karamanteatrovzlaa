import QRCode from 'qrcode';
import { config } from './config';
import { esc, type Attachment } from './mail';
import { bs, usd, rateFmt, fechaLarga, hora, fechaValor } from '#lib/format.ts';
import { seatsSummary } from '#lib/seatmap.ts';

/**
 * Plantillas de correo con la identidad de Karamantea (misma línea que la web:
 * fondo claro, Fraunces/Georgia para títulos, verde lima de la marca).
 * Todo va en tablas y estilos en línea para que se vea bien en Gmail, Outlook y el teléfono.
 */

const C = {
	bg: '#f3f0e9',
	card: '#ffffff',
	ink: '#151412',
	text: '#3f3b36',
	muted: '#6b665e',
	line: '#e3ded5',
	lime: '#abce26',
	accent: '#4e6b0a',
	soft: '#f7f9ec'
};
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = 'Arial,Helvetica,sans-serif';
const site = () => config.siteUrl;
const WA = 'https://wa.me/584249392784';
const IG = 'https://instagram.com/karamanteatrovzla';

/** Datos de la reserva que usan los correos */
export type MailRes = {
	token: string;
	qty: number;
	seats: string[];
	lines?: { zone: string | null; price: number; qty: number }[];
	seatZones?: Record<string, string | null>;
	total_bs: number;
	total_usd: number;
	unit_usd: number;
	rate: number;
	rate_date: string;
	buyer_name: string | null;
	buyer_doc: string | null;
	email: string | null;
	phone: string | null;
	pay_method: string | null;
	pay_bank: string | null;
	pay_ref: string | null;
	performance: {
		title: string;
		starts_at: string;
		venue: string;
		address: string;
		maps_url: string;
		poster: string | null;
	};
};

export const resCode = (r: { token: string }) => r.token.slice(0, 8).toUpperCase();
const posterUrl = (p: string | null) => (p ? site() + (p.startsWith('/') ? p : '/archivo/' + p) : null);
const firstName = (n: string | null) => esc((n ?? '').trim().split(/\s+/)[0] || '');

// ---------------------------------------------------------------- piezas

function button(href: string, label: string, dark = false) {
	const bg = dark ? C.ink : C.lime;
	const fg = dark ? '#ffffff' : C.ink;
	return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0"><tr><td style="background:${bg};border-radius:4px">
	<a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font-family:${SANS};font-size:15px;font-weight:bold;color:${fg};text-decoration:none">${label}</a>
	</td></tr></table>`;
}

function rows(items: [string, string][]) {
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line}">
	${items
		.map(
			([k, v]) => `<tr>
		<td style="padding:11px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:13px;color:${C.muted};width:38%;vertical-align:top">${k}</td>
		<td style="padding:11px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:14px;color:${C.ink};vertical-align:top">${v}</td>
	</tr>`
		)
		.join('')}
	</table>`;
}

function sectionTitle(t: string) {
	return `<p style="margin:28px 0 10px;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.accent};font-weight:bold">${t}</p>`;
}

/** Bloque con el afiche y los datos de la función */
function showBlock(r: MailRes) {
	const p = r.performance;
	const img = posterUrl(p.poster);
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ink};border-radius:8px">
	<tr>
		${img ? `<td width="96" style="padding:16px 0 16px 16px;vertical-align:top"><img src="${esc(img)}" width="80" alt="" style="display:block;width:80px;border-radius:4px;border:2px solid #ffffff"></td>` : ''}
		<td style="padding:16px 18px;vertical-align:middle">
			<p style="margin:0 0 6px;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.lime};font-weight:bold">${esc(fechaLarga(p.starts_at))} · ${esc(hora(p.starts_at))}</p>
			<p style="margin:0 0 6px;font-family:${SERIF};font-size:22px;line-height:1.2;color:#ffffff">${esc(p.title)}</p>
			<p style="margin:0;font-family:${SANS};font-size:13px;color:#d9d5cc">${esc(p.venue)}</p>
		</td>
	</tr></table>`;
}

const linesText = (r: MailRes) =>
	(r.lines?.length ? r.lines : [{ zone: null, price: r.unit_usd, qty: r.qty }])
		.map((l) => `${l.qty} ${l.zone ? esc(l.zone) : l.qty > 1 ? 'entradas' : 'entrada'} × ${usd(l.price)}`)
		.join('<br>');

function summary(r: MailRes, paid = true) {
	return rows([
		['Puestos', `<b style="font-size:15px">${esc(seatsSummary(r.seats))}</b>`],
		['Entradas', linesText(r)],
		[paid ? 'Total pagado' : 'Total', `<b style="font-family:${SERIF};font-size:20px;font-weight:normal">${bs(r.total_bs)}</b>`],
		['Tasa BCV', `${rateFmt(r.rate)} Bs/USD · fecha valor ${esc(fechaValor(r.rate_date))}`],
		['Código de reserva', `<b>${resCode(r)}</b>`]
	]);
}

function note(html: string, tone: 'info' | 'warn' = 'info') {
	const bg = tone === 'warn' ? '#fdf3e7' : C.soft;
	const bd = tone === 'warn' ? '#e9c79a' : '#d9e6a8';
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0"><tr>
	<td style="background:${bg};border:1px solid ${bd};border-radius:6px;padding:14px 16px;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.text}">${html}</td>
	</tr></table>`;
}

// ---------------------------------------------------------------- plantilla base

export function brandLayout(o: { preheader: string; tag: string; kicker: string; title: string; intro: string; body: string }) {
	return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">

	<tr><td style="background:${C.ink};border-radius:10px 10px 0 0;padding:20px 28px">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
			<td style="vertical-align:middle">
				<a href="${site()}" style="text-decoration:none">
				<img src="${site()}/email-logo.png" width="44" height="44" alt="Karamantea" style="display:inline-block;vertical-align:middle;border-radius:50%;border:0">
				<span style="display:inline-block;vertical-align:middle;margin-left:12px;font-family:${SERIF};font-size:22px;color:#ffffff">Karamantea</span>
				<span style="display:inline-block;vertical-align:middle;margin-left:6px;font-family:${SANS};font-size:10px;letter-spacing:3px;color:${C.lime}">TEATRO</span>
				</a>
			</td>
			<td align="right" style="vertical-align:middle;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#bdb8ae">${esc(o.tag)}</td>
		</tr></table>
	</td></tr>
	<tr><td style="background:${C.lime};height:4px;line-height:4px;font-size:0">&nbsp;</td></tr>

	<tr><td style="background:${C.card};padding:34px 32px 30px">
		<p style="margin:0 0 10px;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.accent};font-weight:bold">${o.kicker}</p>
		<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:30px;line-height:1.15;font-weight:normal;color:${C.ink}">${o.title}</h1>
		<p style="margin:0 0 24px;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.text}">${o.intro}</p>
		${o.body}
	</td></tr>

	<tr><td style="background:#faf8f4;border-top:1px solid ${C.line};border-radius:0 0 10px 10px;padding:22px 32px">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
			<td style="font-family:${SANS};font-size:12px;line-height:1.7;color:${C.muted}">
				<b style="color:${C.ink}">Karamantea Group Producciones</b><br>
				RIF J-40722213-9 · Taquilla <a href="${WA}" style="color:${C.accent};text-decoration:none">0424 939 27 84</a><br>
				<a href="${IG}" style="color:${C.accent};text-decoration:none">@karamanteatrovzla</a> · <a href="${site()}" style="color:${C.accent};text-decoration:none">karamantea.com</a>
			</td>
		</tr></table>
	</td></tr>

</table>
<p style="margin:16px 0 0;font-family:${SANS};font-size:11px;color:#9a948a">Dos rostros, una misma escena.</p>
</td></tr></table>
</body></html>`;
}

/** Bloque grande del puesto en la entrada: "Mesa 12 / Puesto 3 / VIP" o la butaca "C7" */
function seatCell(seat: string, zone: string | null) {
	const lab = (t: string) => `<p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.muted}">${t}</p>`;
	const big = (t: string) => `<p style="margin:2px 0 8px;font-family:${SERIF};font-size:34px;line-height:1;color:${C.ink}">${t}</p>`;
	const m = seat.match(/^M(\d+)-(\d+)$/);
	const z = zone ? `<p style="margin:0;display:inline-block;background:${C.ink};color:${C.lime};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:4px 8px">${esc(zone)}</p>` : '';
	return m ? `${lab('Mesa')}${big(m[1])}${lab('Puesto')}${big(m[2])}${z}` : `${lab('Asiento')}${big(esc(seat))}${z}`;
}

// ---------------------------------------------------------------- correos

/** Al admin: llegó un comprobante */
export function adminPaymentMail(r: MailRes) {
	const body = `${showBlock(r)}
	${sectionTitle('Pago reportado')}
	${rows([
		['Monto', `<b style="font-family:${SERIF};font-size:22px;font-weight:normal">${bs(r.total_bs)}</b>`],
		['Pagó a', esc(r.pay_method)],
		['Banco de origen', esc(r.pay_bank)],
		['Referencia', `<b style="font-size:16px">${esc(r.pay_ref)}</b>`],
		['Puestos', `<b>${esc(seatsSummary(r.seats))}</b> (${r.qty})`],
		['Detalle', linesText(r)],
		['Tasa BCV', `${rateFmt(r.rate)} Bs/USD · ${esc(fechaValor(r.rate_date))}`]
	])}
	${sectionTitle('Comprador')}
	${rows([
		['Nombre', `<b>${esc(r.buyer_name)}</b>`],
		['Cédula / RIF', esc(r.buyer_doc)],
		['Correo', `<a href="mailto:${esc(r.email)}" style="color:${C.accent}">${esc(r.email)}</a>`],
		['Teléfono', `<a href="tel:${esc(r.phone)}" style="color:${C.accent}">${esc(r.phone)}</a>`]
	])}
	${note('El comprobante va <b>adjunto</b>. Verifica el pago en el banco y confírmalo en el panel: al confirmar, el comprador recibe sus entradas automáticamente.')}
	<div style="height:20px"></div>
	${button(site() + '/admin', 'Revisar y confirmar el pago', true)}`;
	return {
		subject: `Nuevo pago · ${r.performance.title} · ${r.qty} entrada${r.qty > 1 ? 's' : ''} · ${bs(r.total_bs)}`,
		html: brandLayout({
			preheader: `${r.buyer_name} reportó un pago de ${bs(r.total_bs)} · Ref. ${r.pay_ref}`,
			tag: 'Administración',
			kicker: `Reserva ${resCode(r)}`,
			title: 'Nuevo pago por verificar',
			intro: `<b>${esc(r.buyer_name)}</b> reportó un pago para <b>${esc(r.performance.title)}</b>. Sus asientos quedan apartados hasta que lo confirmes o lo rechaces.`,
			body
		})
	};
}

/** Al comprador: recibimos el comprobante */
export function buyerReceivedMail(r: MailRes) {
	const body = `${showBlock(r)}
	${sectionTitle('Tu reserva')}
	${summary(r)}
	${note('<b>¿Qué sigue?</b> Nuestro equipo verifica el pago y te enviamos las entradas a este mismo correo. Tus asientos quedan apartados mientras tanto.')}
	<div style="height:20px"></div>
	${button(`${site()}/reserva/${r.token}`, 'Ver mi reserva')}`;
	return {
		subject: `Recibimos tu pago · ${r.performance.title}`,
		html: brandLayout({
			preheader: `En unos momentos recibirás tus entradas para ${r.performance.title}.`,
			tag: 'Pago recibido',
			kicker: 'Pago registrado',
			title: `¡Gracias, ${firstName(r.buyer_name)}!`,
			intro: 'Su pago fue registrado. En unos momentos recibirá sus entradas en este mismo correo.',
			body
		})
	};
}

/** Al comprador: sus entradas (una por asiento, con código QR) */
export async function ticketsMail(r: MailRes) {
	const p = r.performance;
	const code = resCode(r);
	const attachments: Attachment[] = [];
	const cards: string[] = [];
	for (const [i, seat] of r.seats.entries()) {
		const id = `${code}-${i + 1}`;
		const cid = `qr-${id}@karamantea`;
		const png = await QRCode.toBuffer(`${site()}/reserva/${r.token}#${seat}`, {
			margin: 1,
			width: 260,
			errorCorrectionLevel: 'M',
			color: { dark: C.ink, light: '#ffffff' }
		});
		attachments.push({ filename: `entrada-${id}.png`, content: png, contentType: 'image/png', cid });
		cards.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid ${C.line};border-radius:10px;border-collapse:separate;overflow:hidden">
		<tr><td colspan="2" style="background:${C.ink};padding:14px 18px;border-radius:10px 10px 0 0">
			<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
				<td style="font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.lime};font-weight:bold">Entrada ${i + 1} de ${r.qty}</td>
				<td align="right" style="font-family:${SANS};font-size:11px;letter-spacing:1px;color:#bdb8ae">N° ${id}</td>
			</tr></table>
			<p style="margin:8px 0 0;font-family:${SERIF};font-size:21px;line-height:1.2;color:#ffffff">${esc(p.title)}</p>
		</td></tr>
		<tr>
			<td style="padding:18px;vertical-align:top;font-family:${SANS}">
				<table role="presentation" cellpadding="0" cellspacing="0"><tr>
					<td style="padding-right:22px;vertical-align:top">${seatCell(seat, r.seatZones?.[seat] ?? null)}</td>
					<td style="vertical-align:top">
						<p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.muted}">Fecha</p>
						<p style="margin:2px 0 10px;font-size:14px;color:${C.ink};font-weight:bold">${esc(fechaLarga(p.starts_at))}</p>
						<p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.muted}">Hora</p>
						<p style="margin:2px 0 0;font-size:14px;color:${C.ink};font-weight:bold">${esc(hora(p.starts_at))}</p>
					</td>
				</tr></table>
				<p style="margin:16px 0 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.muted}">Lugar</p>
				<p style="margin:2px 0 0;font-size:14px;color:${C.ink}">${esc(p.venue)}</p>
				${p.address ? `<p style="margin:2px 0 0;font-size:12px;color:${C.muted}">${esc(p.address)}</p>` : ''}
				<p style="margin:14px 0 0;font-size:12px;color:${C.muted}">A nombre de <b style="color:${C.ink}">${esc(r.buyer_name)}</b></p>
			</td>
			<td width="150" align="center" style="width:150px;padding:18px 16px;border-left:2px dashed ${C.line};vertical-align:middle;background:#faf8f4">
				<img src="cid:${cid}" width="120" height="120" alt="Código QR de la entrada ${id}" style="display:block;width:120px;height:120px;border:0">
				<p style="margin:8px 0 0;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${C.muted}">${id}</p>
			</td>
		</tr></table>`);
	}
	const body = `${cards.join('')}
	${note(`<b>En la entrada de la sala</b> muestra este correo en tu teléfono (o impreso): cada entrada tiene su código QR. Te recomendamos llegar <b>20 minutos antes</b>.`)}
	<div style="height:20px"></div>
	<table role="presentation" cellpadding="0" cellspacing="0"><tr>
		<td style="padding-right:10px">${button(`${site()}/reserva/${r.token}`, 'Ver mi reserva')}</td>
		${p.maps_url ? `<td>${button(p.maps_url, 'Cómo llegar', true)}</td>` : ''}
	</tr></table>
	${sectionTitle('Resumen de la compra')}
	${summary(r)}`;
	return {
		subject: `Tus entradas · ${p.title} · ${fechaLarga(p.starts_at)}`,
		html: brandLayout({
			preheader: `${r.qty} entrada${r.qty > 1 ? 's' : ''} · ${seatsSummary(r.seats)} · ${fechaLarga(p.starts_at)}, ${hora(p.starts_at)}`,
			tag: 'Tus entradas',
			kicker: 'Pago verificado',
			title: `¡Nos vemos en el teatro, ${firstName(r.buyer_name)}!`,
			intro: `Tu pago fue verificado. Aquí están tus ${r.qty > 1 ? `${r.qty} entradas` : 'entrada'} para <b>${esc(p.title)}</b>.`,
			body
		}),
		attachments
	};
}

/** Al comprador: el pago no se pudo verificar */
export function rejectedMail(r: MailRes, reason: string) {
	const body = `${reason ? note(`<b>Motivo:</b> ${esc(reason)}`, 'warn') + '<div style="height:20px"></div>' : ''}
	${showBlock(r)}
	${sectionTitle('Reserva')}
	${summary(r, false)}
	${note('Si crees que es un error, responde a este correo adjuntando tu comprobante o escríbenos por WhatsApp y lo revisamos contigo.')}
	<div style="height:20px"></div>
	${button(WA, 'Escribir por WhatsApp', true)}`;
	return {
		subject: `No pudimos verificar tu pago · ${r.performance.title}`,
		html: brandLayout({
			preheader: 'Tus asientos fueron liberados. Escríbenos si crees que es un error.',
			tag: 'Pago no verificado',
			kicker: `Reserva ${resCode(r)}`,
			title: 'No pudimos verificar tu pago',
			intro: `Hola ${firstName(r.buyer_name)}, revisamos tu comprobante y no pudimos confirmar el pago, por lo que los asientos quedaron libres.`,
			body
		})
	};
}

/** Prueba desde /admin/ajustes */
export function testMail() {
	return {
		subject: 'Correo de prueba · Karamantea Teatro',
		html: brandLayout({
			preheader: 'Los avisos de pago llegarán a este correo.',
			tag: 'Administración',
			kicker: 'Correo de prueba',
			title: '¡Los avisos de pago te llegarán aquí!',
			intro: 'Este correo confirma que karamantea.com puede escribirte. Cada vez que un cliente reporte un pago, recibirás aquí el aviso con el comprobante adjunto.',
			body: `${note('Si este correo llegó a <b>spam</b>, márcalo como «No es spam» para que los próximos lleguen a la bandeja de entrada.')}
			<div style="height:20px"></div>${button(site() + '/admin', 'Abrir el panel', true)}`
		})
	};
}
