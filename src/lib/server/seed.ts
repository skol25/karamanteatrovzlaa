import type { Client, InStatement } from '@libsql/client';

/**
 * Cartelera inicial con las obras reales de Karamantea Group Producciones.
 * Solo se carga cuando la base de datos está vacía; después todo se administra en /admin/obras.
 *
 * PENDIENTE de confirmar con la producción: precio, aforo, duración y sinopsis.
 */
export async function seed(db: Client) {
	const shows = [
		{
			slug: 'protagonistas-en-un-plano-y-contraplano',
			title: 'Protagonistas en un plano y contraplano',
			tagline: 'Víctor Cámara y Henry Zakka, juntos en escena.',
			synopsis:
				'Víctor Cámara y Henry Zakka comparten escenario en esta obra escrita y dirigida por Juan Carlos Wessolossky. Karamantea Group Producciones y SKS la presentan en una función única en el Hotel Tibisay de Maturín.',
			director: 'Juan Carlos Wessolossky',
			cast_list: 'Víctor Cámara, Henry Zakka',
			duration_min: 0,
			genre: 'Teatro',
			age_rating: '',
			poster: '/afiches/protagonistas-plano-contraplano.jpg',
			variant: 0,
			featured: 1,
			perfs: [
				{
					starts_at: '2026-11-27T20:00:00-04:00',
					venue: 'Hotel Tibisay · Maturín',
					address: 'Av. Bella Vista, km 3, Maturín, Monagas',
					maps_url: 'https://maps.google.com/?q=Hotel+Tibisay+Maturin',
					price_usd: 20, // PENDIENTE: precio real
					capacity: 150 // PENDIENTE: aforo real del salón
				}
			]
		}
	];

	const stmts: InStatement[] = [];
	for (const s of shows) {
		const { perfs, ...d } = s;
		stmts.push({
			sql: `INSERT INTO shows (slug,title,tagline,synopsis,director,cast_list,duration_min,genre,age_rating,poster,variant,featured)
				VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
			args: [d.slug, d.title, d.tagline, d.synopsis, d.director, d.cast_list, d.duration_min, d.genre, d.age_rating, d.poster, d.variant, d.featured]
		});
		for (const p of perfs) {
			stmts.push({
				sql: `INSERT INTO performances (show_id,starts_at,venue,address,maps_url,price_usd,capacity)
					VALUES ((SELECT id FROM shows WHERE slug=?),?,?,?,?,?,?)`,
				args: [d.slug, p.starts_at, p.venue, p.address, p.maps_url, p.price_usd, p.capacity]
			});
		}
	}
	await db.batch(stmts, 'write');
}
