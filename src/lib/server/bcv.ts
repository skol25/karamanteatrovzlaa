import https from 'node:https';
import tls from 'node:tls';
import fs from 'node:fs';
import { parse } from 'node-html-parser';
import { all, get, run } from './db';
import { config } from './config';
import { audit } from './audit';
import { todayCaracas, daysBetween } from './time';

export type Rate = { id: number; rate: number; valid_date: string; source: 'bcv' | 'manual'; fetched_at: string };
export type FetchStatus = { at: number; ok: boolean; message: string };

/** Extrae la tasa USD y la "Fecha Valor" del HTML de bcv.org.ve */
export function parseBcvHtml(html: string): { rate: number; valid_date: string } | null {
	const root = parse(html);
	let raw = root.querySelector('#dolar strong')?.text.trim();
	if (!raw) raw = html.match(/id="dolar"[\s\S]*?<strong>\s*([\d.,]+)\s*<\/strong>/)?.[1];
	if (!raw) return null;
	const rate = Number(raw.replace(/\./g, '').replace(',', '.'));
	if (!isFinite(rate) || rate <= 0) return null;
	const content =
		root.querySelector('span.date-display-single[content]')?.getAttribute('content') ||
		html.match(/content="(\d{4}-\d{2}-\d{2})T/)?.[1];
	if (!content) return null;
	return { rate, valid_date: content.slice(0, 10) };
}

function fetchText(url: string, timeoutMs: number): Promise<string> {
	const opts: https.RequestOptions = {
		headers: { 'User-Agent': 'Mozilla/5.0 (KaramanteaTeatro tasa BCV)' },
		timeout: timeoutMs
	};
	// El BCV envía su cadena de certificados incompleta: se agrega el certificado intermedio
	// a los certificados raíz normales (no los reemplaza).
	if (config.bcvCaFile && fs.existsSync(config.bcvCaFile))
		opts.ca = [...tls.rootCertificates, fs.readFileSync(config.bcvCaFile, 'utf8')];
	if (config.bcvInsecureTls) opts.rejectUnauthorized = false;
	return new Promise((resolve, reject) => {
		const req = https.get(url, opts, (res) => {
			if (res.statusCode && res.statusCode >= 400) return reject(new Error('HTTP ' + res.statusCode));
			let data = '';
			res.setEncoding('utf8');
			res.on('data', (c) => (data += c));
			res.on('end', () => resolve(data));
		});
		req.on('timeout', () => req.destroy(new Error('tiempo de espera agotado')));
		req.on('error', reject);
	});
}

async function setStatus(s: FetchStatus) {
	await run(`INSERT INTO meta (k, v) VALUES ('bcv_status', ?) ON CONFLICT (k) DO UPDATE SET v=excluded.v`, [JSON.stringify(s)]);
}

export async function fetchStatus(): Promise<FetchStatus> {
	const r = await get<{ v: string }>(`SELECT v FROM meta WHERE k='bcv_status'`);
	return r ? JSON.parse(r.v) : { at: 0, ok: false, message: 'Aún no se ha consultado' };
}

export async function refreshFromBcv(timeoutMs = 15000): Promise<boolean> {
	try {
		const parsed = parseBcvHtml(await fetchText(config.bcvUrl, timeoutMs));
		if (!parsed) throw new Error('No se pudo leer la tasa en la página del BCV');
		await saveRate(parsed.rate, parsed.valid_date, 'bcv');
		await setStatus({ at: Date.now(), ok: true, message: `Tasa ${parsed.rate} · fecha valor ${parsed.valid_date}` });
		return true;
	} catch (e) {
		await setStatus({ at: Date.now(), ok: false, message: (e as Error).message });
		console.warn('[BCV] no se pudo actualizar la tasa:', (e as Error).message);
		return false;
	}
}

let inflight: Promise<unknown> | null = null;

/**
 * Consulta el BCV como máximo cada BCV_REFRESH_MINUTES, disparado por las visitas.
 * No usa procesos en segundo plano, así funciona igual en Vercel (serverless) y en Namecheap.
 * El "claim" en la tabla meta evita que varias instancias consulten a la vez.
 */
export async function maybeRefreshBcv() {
	if (inflight) return inflight;
	const now = Date.now();
	const due = now - config.bcvRefreshMinutes * 60000;
	const { changes } = await run(
		`INSERT INTO meta (k, v) VALUES ('bcv_claim', ?) ON CONFLICT (k) DO UPDATE SET v=excluded.v WHERE CAST(meta.v AS INTEGER) < ?`,
		[String(now), due]
	);
	if (!changes) return;
	inflight = refreshFromBcv(8000).finally(() => (inflight = null));
	return inflight;
}

/** Nunca se modifica una tasa: si cambia se inserta otra, y así vencen las cotizaciones hechas con la anterior. */
export async function saveRate(rate: number, valid_date: string, source: 'bcv' | 'manual') {
	const last = await get<{ rate: number }>('SELECT rate FROM rates WHERE valid_date=? AND source=? ORDER BY id DESC LIMIT 1', [
		valid_date,
		source
	]);
	if (last && last.rate === rate) return false;
	await run('INSERT INTO rates (rate, valid_date, source) VALUES (?,?,?)', [rate, valid_date, source]);
	if (source === 'bcv')
		await audit(null, {
			kind: 'sistema',
			action: 'tasa_bcv',
			summary: `Nueva tasa BCV: ${rate} Bs/USD (fecha valor ${valid_date})`,
			entity: 'tasa',
			detail: { rate, valid_date, anterior: last?.rate ?? null }
		});
	return true;
}

/**
 * Tasa vigente hoy: la de "fecha valor" más reciente que no sea futura.
 * Si para la misma fecha hay varias (BCV y/o manual), gana la última registrada.
 * Si es demasiado vieja, no hay tasa vigente y no se puede cotizar.
 */
export async function currentRate(): Promise<Rate | null> {
	const today = todayCaracas();
	const r = await get<Rate>(`SELECT * FROM rates WHERE valid_date <= ? ORDER BY valid_date DESC, id DESC LIMIT 1`, [today]);
	if (!r) return null;
	if (daysBetween(r.valid_date, today) > config.maxRateAgeDays) return null;
	return r;
}

export function recentRates(limit = 10) {
	return all<Rate>('SELECT * FROM rates ORDER BY valid_date DESC, id DESC LIMIT ?', [limit]);
}
