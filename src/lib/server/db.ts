import { createClient, type Client, type InArgs, type InStatement, type Row } from '@libsql/client';
import fs from 'node:fs';
import { config } from './config';
import { seed, seedVideos, seedVideosV2 } from './seed';

/**
 * Base de datos libSQL:
 *  - Namecheap / local: archivo SQLite (DATABASE_URL=file:./data/karamantea.db)
 *  - Vercel: Turso (DATABASE_URL=libsql://... + DATABASE_AUTH_TOKEN)
 */
if (config.databaseUrl.startsWith('file:')) {
	try {
		fs.mkdirSync(config.dataDir, { recursive: true });
	} catch (e) {
		console.error('[db] no se pudo crear la carpeta de datos', config.dataDir, e);
	}
}

export const client: Client = createClient({ url: config.databaseUrl, authToken: config.databaseToken });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS shows (
	id INTEGER PRIMARY KEY,
	slug TEXT UNIQUE NOT NULL,
	title TEXT NOT NULL,
	tagline TEXT DEFAULT '',
	synopsis TEXT NOT NULL,
	director TEXT DEFAULT '',
	cast_list TEXT DEFAULT '',
	duration_min INTEGER DEFAULT 90,
	genre TEXT DEFAULT '',
	age_rating TEXT DEFAULT 'Todo público',
	poster TEXT,
	variant INTEGER DEFAULT 0,
	featured INTEGER DEFAULT 0,
	created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS performances (
	id INTEGER PRIMARY KEY,
	show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
	starts_at TEXT NOT NULL,
	venue TEXT NOT NULL,
	address TEXT DEFAULT '',
	maps_url TEXT DEFAULT '',
	price_usd REAL NOT NULL,
	capacity INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rates (
	id INTEGER PRIMARY KEY,
	rate REAL NOT NULL,
	valid_date TEXT NOT NULL,
	source TEXT NOT NULL CHECK (source IN ('bcv','manual')),
	fetched_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS reservations (
	id INTEGER PRIMARY KEY,
	token TEXT UNIQUE NOT NULL,
	performance_id INTEGER NOT NULL REFERENCES performances(id),
	qty INTEGER NOT NULL,
	status TEXT NOT NULL,
	expire_reason TEXT,
	rate_id INTEGER NOT NULL REFERENCES rates(id),
	rate REAL NOT NULL,
	rate_date TEXT NOT NULL,
	unit_usd REAL NOT NULL,
	total_usd REAL NOT NULL,
	total_bs REAL NOT NULL,
	expires_at INTEGER NOT NULL,
	created_at INTEGER NOT NULL,
	buyer_name TEXT, buyer_doc TEXT, email TEXT, phone TEXT,
	pay_method TEXT, pay_bank TEXT, pay_ref TEXT,
	receipt_file TEXT, receipt_mime TEXT,
	submitted_at INTEGER, resolved_at INTEGER, admin_note TEXT
);
CREATE TABLE IF NOT EXISTS reservation_seats (
	performance_id INTEGER NOT NULL,
	seat TEXT NOT NULL,
	reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
	PRIMARY KEY (performance_id, seat)
);
CREATE TABLE IF NOT EXISTS reservation_seat_log (
	reservation_id INTEGER NOT NULL,
	seat TEXT NOT NULL
);
-- Archivos (comprobantes y afiches) guardados en la propia base: funciona igual en Vercel y en Namecheap
CREATE TABLE IF NOT EXISTS files (
	id TEXT PRIMARY KEY,
	mime TEXT NOT NULL,
	data BLOB NOT NULL,
	created_at INTEGER NOT NULL
);
-- Registro de todos los correos enviados (visible en /admin/correos)
CREATE TABLE IF NOT EXISTS outbox (
	id INTEGER PRIMARY KEY,
	to_addr TEXT NOT NULL,
	subject TEXT NOT NULL,
	html TEXT NOT NULL,
	attachments TEXT,
	delivered INTEGER NOT NULL,
	error TEXT,
	created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
-- Métodos de pago configurables desde /admin/pagos (por ahora: pago_movil)
CREATE TABLE IF NOT EXISTS payment_methods (
	id INTEGER PRIMARY KEY,
	type TEXT NOT NULL,
	label TEXT NOT NULL,
	data TEXT NOT NULL,
	enabled INTEGER NOT NULL DEFAULT 1,
	sort INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL
);
-- Registro de auditoría: quién hizo qué y cuándo (visible en /admin/auditoria)
CREATE TABLE IF NOT EXISTS audit_log (
	id INTEGER PRIMARY KEY,
	at INTEGER NOT NULL,
	kind TEXT NOT NULL,
	actor TEXT NOT NULL,
	action TEXT NOT NULL,
	summary TEXT NOT NULL,
	entity TEXT,
	entity_id TEXT,
	detail TEXT,
	ip TEXT,
	user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at);
-- Videos del carrusel de la portada (archivo subido, YouTube o Instagram)
CREATE TABLE IF NOT EXISTS videos (
	id INTEGER PRIMARY KEY,
	title TEXT NOT NULL,
	caption TEXT DEFAULT '',
	description TEXT DEFAULT '',
	kind TEXT NOT NULL,
	src TEXT NOT NULL,
	mime TEXT,
	bytes INTEGER,
	cover TEXT,
	show_id INTEGER REFERENCES shows(id) ON DELETE SET NULL,
	enabled INTEGER NOT NULL DEFAULT 1,
	sort INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_res_status ON reservations(status, expires_at);
`;

let readyPromise: Promise<void> | null = null;

/** Crea las tablas y carga los datos de ejemplo la primera vez. */
export function ready() {
	readyPromise ??= (async () => {
		await client.executeMultiple(SCHEMA);
		const rs = await client.execute('SELECT COUNT(*) n FROM shows');
		if (Number(rs.rows[0].n) === 0) await seed(client);
		// migraciones pequeñas para bases ya creadas
		const cols = (await client.execute('PRAGMA table_info(videos)')).rows.map((r) => String(r.name));
		if (!cols.includes('description')) await client.execute("ALTER TABLE videos ADD COLUMN description TEXT DEFAULT ''");
		await seedVideos(client);
		await seedVideosV2(client);
	})().catch((e) => {
		readyPromise = null;
		throw e;
	});
	return readyPromise;
}

const plain = <T>(r: Row): T => {
	const o: Record<string, unknown> = {};
	for (const k of Object.keys(r)) {
		const v = r[k];
		o[k] = typeof v === 'bigint' ? Number(v) : v;
	}
	return o as T;
};

export async function all<T = Record<string, any>>(sql: string, args: InArgs = []): Promise<T[]> {
	await ready();
	const rs = await client.execute({ sql, args });
	return rs.rows.map((r) => plain<T>(r));
}

export async function get<T = Record<string, any>>(sql: string, args: InArgs = []): Promise<T | undefined> {
	await ready();
	const rs = await client.execute({ sql, args });
	return rs.rows[0] ? plain<T>(rs.rows[0]) : undefined;
}

export async function run(sql: string, args: InArgs = []) {
	await ready();
	const rs = await client.execute({ sql, args });
	return { changes: rs.rowsAffected, lastId: rs.lastInsertRowid != null ? Number(rs.lastInsertRowid) : 0 };
}

/** Varias sentencias atómicas: o se aplican todas o ninguna. */
export async function batch(stmts: InStatement[]) {
	await ready();
	return client.batch(stmts, 'write');
}
