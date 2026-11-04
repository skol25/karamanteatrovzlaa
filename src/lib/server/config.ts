import path from 'node:path';

// Carga .env en desarrollo (en producción se usa `node --env-file-if-exists=.env build`)
try {
	(process as any).loadEnvFile?.();
} catch {
	/* sin .env */
}

const env = process.env;

export const config = {
	dataDir: path.resolve(env.DATA_DIR || 'data'),
	/** file:./data/karamantea.db (Namecheap/local) o libsql://xxx.turso.io (Vercel) */
	databaseUrl: env.DATABASE_URL || 'file:' + path.resolve(env.DATA_DIR || 'data', 'karamantea.db'),
	databaseToken: env.DATABASE_AUTH_TOKEN || undefined,
	siteUrl: (
		env.SITE_URL ||
		(env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + env.VERCEL_PROJECT_PRODUCTION_URL : 'http://localhost:5173')
	).replace(/\/$/, ''),
	holdMinutes: Number(env.HOLD_MINUTES || 20),
	maxTicketsPerOrder: Number(env.MAX_TICKETS || 10),
	/** días máximos de antigüedad de la tasa vigente (fin de semana / feriados) */
	maxRateAgeDays: Number(env.MAX_RATE_AGE_DAYS || 4),
	bcvRefreshMinutes: Number(env.BCV_REFRESH_MINUTES || 30),
	bcvUrl: env.BCV_URL || 'https://www.bcv.org.ve/',
	/** El sitio del BCV suele servir una cadena de certificados incompleta. */
	bcvCaFile: env.BCV_CA_FILE || '',
	bcvInsecureTls: env.BCV_INSECURE_TLS === '1',
	adminPassword: env.ADMIN_PASSWORD || 'cambia-esta-clave',
	adminEmail: env.ADMIN_EMAIL || 'admin@karamantea.test',
	sessionSecret: env.SESSION_SECRET || 'dev-secret-cambia-esto',
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
