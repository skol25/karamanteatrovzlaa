import path from 'node:path';

// Carga .env en desarrollo (en producción se usa `node --env-file-if-exists=.env build`)
try {
	(process as any).loadEnvFile?.();
} catch {
	/* sin .env */
}

const env = process.env;

const onVercel = !!env.VERCEL;
/**
 * En Vercel solo se puede escribir en /tmp. Si no hay Turso configurado (DATABASE_URL),
 * se usa una base temporal en /tmp para que el sitio arranque: sirve para mostrarlo,
 * pero los datos se pierden cuando Vercel recicla la función.
 */
export const ephemeralDb = onVercel && !env.DATABASE_URL;
const defaultDataDir = ephemeralDb ? '/tmp/karamantea' : 'data';
/** Modo demostración: sin variables de entorno en Vercel (o DEMO_MODE=1). */
export const demoMode = ephemeralDb || env.DEMO_MODE === '1';
export const DEMO_PASSWORD = 'demo1234';
/** Tasa de ejemplo que se usa en la demo solo si el BCV no responde. */
export const DEMO_RATE = Number(env.DEMO_RATE || 228.4792);

export const config = {
	dataDir: path.resolve(env.DATA_DIR || defaultDataDir),
	/** file:./data/karamantea.db (Namecheap/local) o libsql://xxx.turso.io (Vercel) */
	databaseUrl: env.DATABASE_URL || 'file:' + path.resolve(env.DATA_DIR || defaultDataDir, 'karamantea.db'),
	databaseToken: env.DATABASE_AUTH_TOKEN || undefined,
	siteUrl: (
		env.SITE_URL ||
		(env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + env.VERCEL_PROJECT_PRODUCTION_URL : 'http://localhost:5173')
	).replace(/\/$/, ''),
	holdMinutes: Number(env.HOLD_MINUTES || 20),
	maxTicketsPerOrder: Number(env.MAX_TICKETS || 20),
	/** días máximos de antigüedad de la tasa vigente (fin de semana / feriados) */
	maxRateAgeDays: Number(env.MAX_RATE_AGE_DAYS || 4),
	bcvRefreshMinutes: Number(env.BCV_REFRESH_MINUTES || 30),
	bcvUrl: env.BCV_URL || 'https://www.bcv.org.ve/',
	/** El sitio del BCV suele servir una cadena de certificados incompleta. */
	bcvCaFile: env.BCV_CA_FILE || '',
	bcvInsecureTls: env.BCV_INSECURE_TLS === '1',
	adminPassword: env.ADMIN_PASSWORD || (demoMode ? DEMO_PASSWORD : 'cambia-esta-clave'),
	adminEmail: env.ADMIN_EMAIL || 'admin@karamantea.test',
	sessionSecret: env.SESSION_SECRET || 'karamantea-demo-' + (env.VERCEL_PROJECT_ID || 'local'),
	smtp: {
		host: env.SMTP_HOST || '',
		port: Number(env.SMTP_PORT || 587),
		secure: env.SMTP_SECURE === '1',
		user: env.SMTP_USER || '',
		pass: env.SMTP_PASS || '',
		from: env.MAIL_FROM || 'Karamantea Teatro <no-reply@karamantea.test>'
	},
	payment: {
		bank: env.PAGO_BANCO || 'Banco de Venezuela (0102)',
		phone: env.PAGO_TELEFONO || '0414-000-0000',
		rif: env.PAGO_RIF || 'J-40722213-9',
		holder: env.PAGO_TITULAR || 'Karamantea Teatro',
		account: env.PAGO_CUENTA || ''
	}
};
