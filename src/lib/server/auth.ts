import crypto from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { config } from './config';

const COOKIE = 'kt_admin';
const sign = (v: string) => crypto.createHmac('sha256', config.sessionSecret).update(v).digest('base64url');

export function checkPassword(pw: string) {
	const a = Buffer.from(sign(pw)),
		b = Buffer.from(sign(config.adminPassword));
	return crypto.timingSafeEqual(a, b);
}

export function login(cookies: Cookies, secure: boolean) {
	const exp = String(Date.now() + 12 * 3600 * 1000);
	cookies.set(COOKIE, `${exp}.${sign(exp)}`, { path: '/', httpOnly: true, sameSite: 'lax', secure, maxAge: 12 * 3600 });
}

export function logout(cookies: Cookies) {
	cookies.delete(COOKIE, { path: '/' });
}

export function isAdmin(cookies: Cookies) {
	const v = cookies.get(COOKIE);
	if (!v) return false;
	const [exp, sig] = v.split('.');
	if (!exp || !sig || Number(exp) < Date.now()) return false;
	const a = Buffer.from(sig),
		b = Buffer.from(sign(exp));
	return a.length === b.length && crypto.timingSafeEqual(a, b);
}
