import type { Client, InStatement } from '@libsql/client';

/**
 * Cartelera inicial con las obras reales de Karamantea Group Producciones,
 * tomadas de las publicaciones de @karamanteatrovzla en Instagram.
 * Solo se carga cuando la base de datos está vacía; después todo se administra en /admin/obras.
 *
 * PENDIENTE de confirmar con la producción: precio y aforo de "Plano y contraplano".
 * En el historial, las horas que no aparecían en las publicaciones se guardaron como 8:00 p. m.
 * (el historial solo muestra la fecha).
 */

const VENUES = {
	tibisay: {
		venue: 'Hotel Tibisay · Maturín',
		address: 'Av. Bella Vista, km 3, Maturín, Monagas',
		maps_url: 'https://maps.google.com/?q=Hotel+Tibisay+Maturin'
	},
	rosabela: {
		venue: 'Rosa Bela Hotel & Convention Center · Puerto Ordaz',
		address: 'Puerto Ordaz, Bolívar',
		maps_url: 'https://maps.google.com/?q=Hotel+Rosa+Bela+Puerto+Ordaz'
	},
	eurobuilding: {
		venue: 'Hotel Eurobuilding · Puerto Ordaz',
		address: 'Puerto Ordaz, Bolívar',
		maps_url: 'https://maps.google.com/?q=Eurobuilding+Puerto+Ordaz'
	},
	churuata: {
		venue: 'La Gran Churuata del Conejo · Guatire',
		address: 'Guatire, Miranda',
		maps_url: 'https://maps.google.com/?q=Gran+Churuata+del+Conejo+Guatire'
	},
	hardrock: {
		venue: 'Hard Rock Café · Caracas',
		address: 'Av. Andrés Bello, cuarta transversal de Los Palos Grandes, Caracas',
		maps_url: 'https://maps.google.com/?q=Hard+Rock+Cafe+Caracas'
	},
	vertice: {
		venue: 'Vértice · El Hatillo',
		address: 'El Hatillo, Caracas',
		maps_url: 'https://maps.google.com/?q=Vertice+El+Hatillo'
	},
	executive: {
		venue: 'Hotel Executive Suites · Valencia',
		address: 'Valencia, Carabobo',
		maps_url: 'https://maps.google.com/?q=Hotel+Executive+Suites+Valencia'
	},
	r5353: {
		venue: 'Restaurante 53 53 · Altamira',
		address: 'Altamira, Caracas',
		maps_url: 'https://maps.google.com/?q=53+53+Altamira+Caracas'
	}
};

type V = keyof typeof VENUES;
type Perf = { at: string; v: V; price: number; cap: number };

const shows: {
	slug: string;
	title: string;
	tagline: string;
	synopsis: string;
	director: string;
	cast_list: string;
	genre: string;
	poster: string | null;
	variant: number;
	featured: number;
	perfs: Perf[];
}[] = [
	{
		slug: 'plano-y-contraplano',
		title: 'Protagonistas en un plano y contraplano',
		tagline: 'Víctor Cámara y Henry Zakka llegan a Maturín.',
		synopsis:
			'Dos grandes figuras de la actuación, Víctor Cámara y Henry Zakka, se unen en escena para presentar la aclamada comedia teatral «Plano y contraplano», bajo la dirección de Juan Carlos Wessolossky. Una experiencia llena de humor, reflexión y actuaciones de altísimo nivel para el público monaguense.',
		director: 'Juan Carlos Wessolossky',
		cast_list: 'Víctor Cámara, Henry Zakka',
		genre: 'Comedia',
		poster: '/afiches/protagonistas-plano-contraplano.jpg',
		variant: 0,
		featured: 1,
		// PENDIENTE: precio y aforo reales
		perfs: [{ at: '2026-11-27T20:00', v: 'tibisay', price: 20, cap: 150 }]
	},
	{
		slug: 'kamasufra',
		title: 'Kamasufra',
		tagline: 'Una comedia donde sufrirás… pero de la risa.',
		synopsis:
			'El monólogo de Mercedes Salaya sobre las cosas que pasan entre ella y él y ese misterio divino que llaman mujer: cómo intoxicamos, ahogamos o idealizamos la relación de pareja. Escrito por una mujer, para mujeres… y para hombres valientes que quieran disfrutar de una noche diferente, llena de humor y complicidad.',
		director: '',
		cast_list: 'Mercedes Salaya',
		genre: 'Comedia · Monólogo',
		poster: '/afiches/kamasufra.jpg',
		variant: 1,
		featured: 0,
		perfs: [
			{ at: '2025-02-21T21:00', v: 'hardrock', price: 20, cap: 100 },
			{ at: '2025-11-01T20:00', v: 'vertice', price: 20, cap: 100 },
			{ at: '2025-11-07T20:00', v: 'executive', price: 20, cap: 100 },
			{ at: '2025-11-14T21:00', v: 'eurobuilding', price: 20, cap: 100 },
			{ at: '2026-05-29T21:00', v: 'tibisay', price: 20, cap: 100 },
			{ at: '2026-06-27T20:00', v: 'tibisay', price: 20, cap: 100 }
		]
	},
	{
		slug: 'yo-no-quiero-reencarnar',
		title: 'Yo no quiero reencarnar',
		tagline: 'Un monólogo que te atrapa de principio a fin.',
		synopsis:
			'Monólogo original de la primera actriz Gledys Ibarra, bajo el ojo tutor de Laureano Márquez. Una pieza cargada de buen humor para disfrutar con toda la familia.',
		director: '',
		cast_list: 'Gledys Ibarra',
		genre: 'Comedia · Monólogo',
		poster: '/afiches/reencarnar.jpg',
		variant: 3,
		featured: 0,
		perfs: [
			{ at: '2025-09-19T20:30', v: 'churuata', price: 20, cap: 100 },
			{ at: '2025-09-25T20:30', v: 'churuata', price: 20, cap: 100 }
		]
	},
	{
		slug: 'no-eres-tu-soy-yo',
		title: 'No eres tú, soy yo',
		tagline: 'Una noche de humor con Luis Fernández.',
		synopsis:
			'El primer actor Luis Fernández repasa con su humor característico momentos de su carrera y de su día a día, con anécdotas, bailes e interacción con el público. Opening musical a cargo de Ezequiel Martínez y Naivid Baldivian.',
		director: '',
		cast_list: 'Luis Fernández',
		genre: 'Comedia · Monólogo',
		poster: '/afiches/noerestu.jpg',
		variant: 2,
		featured: 0,
		perfs: [{ at: '2025-07-11T20:30', v: 'rosabela', price: 30, cap: 150 }]
	},
	{
		slug: 'el-marido-de-mi-marido',
		title: 'El marido de mi marido',
		tagline: 'Un matrimonio muy particular.',
		synopsis:
			'La historia del matrimonio de Federico Mustafá y Leticia de Mustafá. Una comedia llena de humor, baile y una reflexión sobre la relación de pareja que te hará reír de principio a fin.',
		director: '',
		cast_list: '',
		genre: 'Comedia',
		poster: null,
		variant: 0,
		featured: 0,
		perfs: [{ at: '2024-12-21T20:00', v: 'r5353', price: 20, cap: 100 }]
	}
];

export async function seed(db: Client) {
	const stmts: InStatement[] = [];
	for (const s of shows) {
		const { perfs, ...d } = s;
		stmts.push({
			sql: `INSERT INTO shows (slug,title,tagline,synopsis,director,cast_list,duration_min,genre,age_rating,poster,variant,featured)
				VALUES (?,?,?,?,?,?,0,?,'',?,?,?)`,
			args: [d.slug, d.title, d.tagline, d.synopsis, d.director, d.cast_list, d.genre, d.poster, d.variant, d.featured]
		});
		for (const p of perfs) {
			const v = VENUES[p.v];
			stmts.push({
				sql: `INSERT INTO performances (show_id,starts_at,venue,address,maps_url,price_usd,capacity)
					VALUES ((SELECT id FROM shows WHERE slug=?),?,?,?,?,?,?)`,
				args: [d.slug, `${p.at}:00-04:00`, v.venue, v.address, v.maps_url, p.price, p.cap]
			});
		}
	}
	await db.batch(stmts, 'write');
}

/**
 * Videos iniciales del carrusel (reels de @karamanteatrovzla). Se cargan una sola vez:
 * si luego se borran desde el admin, no vuelven a aparecer.
 */
export async function seedVideos(db: Client) {
	const done = await db.execute(`SELECT 1 FROM meta WHERE k='videos_seed_v1'`);
	if (done.rows.length) return;
	const videos = [
		{
			title: 'Rutaca Airlines presenta el avión de la Vinotinto',
			caption: 'Un hangar convertido en teatro',
			description:
				'Parte de la gran labor que realizaron todos los trabajadores de Rutaca Airlines, un equipo lleno de entusiasmo, perseverancia y dedicación. ¡Felicitaciones, lo lograron! Tuve la gran oportunidad de estar en el evento, ya que se me encargó cubrir el hangar, y lo intervine con un diseño tipo teatro. Fue un día de lujo, una experiencia que nunca imaginé.',
			src: 'reel/DHd51_rseCm',
			cover: '/videos/rutaca-hangar.jpg'
		},
		{
			title: 'Las Criadas, de Bogotá a París',
			caption: 'Festival Internacional de Teatro de Bogotá · Teatro Essaïon',
			description:
				'Un paseíto por el Festival Internacional de Teatro de Bogotá con la tragicomedia Las Criadas, de Jean Genet: nueve países juntos y una hermandad inmediata. Dos semanas mágicas en las que te despertabas viendo teatro y te acostabas viendo teatro. Y en París, en el Teatro Essaïon, un teatro hermoso, una cueva mágica. El arte te da una libertad de expresión única, donde solo existen el compromiso, el sacrificio y el empuje hacia lo soñado. ¡Que viva el arte! Pronto, El marido de mi marido en modo internacional.',
			src: 'reel/CyeXR7KuxNf',
			cover: '/videos/las-criadas.jpg'
		}
	];
	const now = Date.now();
	for (const [i, v] of videos.entries()) {
		const exists = await db.execute({ sql: 'SELECT 1 FROM videos WHERE src=?', args: [v.src] });
		if (exists.rows.length) continue;
		await db.execute({
			sql: `INSERT INTO videos (title, caption, description, kind, src, cover, enabled, sort, created_at) VALUES (?,?,?,'instagram',?,?,1,?,?)`,
			args: [v.title, v.caption, v.description, v.src, v.cover, i + 1, now]
		});
	}
	await db.execute(`INSERT OR REPLACE INTO meta (k, v) VALUES ('videos_seed_v1', '1')`);
}

/** Segunda tanda de reels para llenar el carrusel, con el orden final de todos */
export async function seedVideosV2(db: Client) {
	const done = await db.execute(`SELECT 1 FROM meta WHERE k='videos_seed_v2'`);
	if (done.rows.length) return;
	const nuevos = [
		{
			title: 'Víctor Cámara y Henry Zakka llegan a Maturín',
			caption: 'Protagonistas en un plano y contraplano',
			description:
				'Nos complace anunciar la llegada a Venezuela de dos grandes figuras de la actuación: Víctor Cámara y Henry Zakka, quienes se unen en escena para presentar la aclamada comedia teatral «Plano y contraplano», bajo la dirección de Juan Carlos Wessolossky.',
			src: 'reel/DfUNzvkTPA_',
			cover: '/afiches/protagonistas-plano-contraplano.jpg',
			show: 'plano-y-contraplano'
		},
		{
			title: 'Con Samir Bassi en el avión de la Vinotinto',
			caption: 'Lanzamiento con Rutaca Airlines',
			description:
				'Y seguimos con Rutaca, en esta oportunidad con mi pana Samir Bassi, quien estuvo presente en el lanzamiento oficial del avión de la Vinotinto patrocinado por Rutaca Airlines. Un evento lleno de buenas energías. ¡Vamos Vinotinto!',
			src: 'reel/DHognSmpOLt',
			cover: '/videos/vinotinto-samir-bassi.jpg',
			show: null
		},
		{
			title: 'Génesis abre la presentación del avión',
			caption: 'Rutaca Airlines · Volamos juntos por un sueño',
			description:
				'Una entrevista con Génesis, quien fue la encargada, junto a Turinese, de dar inicio a la presentación del avión oficial de la Vinotinto patrocinado por Rutaca Airlines. Volamos juntos por un sueño.',
			src: 'reel/DHgI6BMRn3r',
			cover: '/videos/vinotinto-genesis.jpg',
			show: null
		},
		{
			title: 'Kamasufra en Maturín',
			caption: 'Hotel Tibisay',
			description: 'La gran comedia teatral Kamasufra, original de Mercedes Salaya, en el Hotel Tibisay de Maturín. Una noche para venir en familia a divertirse.',
			src: 'reel/DZxgIMcFfYC',
			cover: '/afiches/kamasufra.jpg',
			show: 'kamasufra'
		},
		{
			title: 'Gracias, Puerto Ordaz',
			caption: 'No eres tú, soy yo · Hotel Rosa Bela',
			description: 'Gracias, Puerto Ordaz: una ciudad muy organizada y con una calidad humana enorme.',
			src: 'reel/DNyCVM6QLKl',
			cover: '/videos/no-eres-tu-rosa-bela.jpg',
			show: 'no-eres-tu-soy-yo'
		},
		{
			title: 'Yo no quiero reencarnar llega a Guatire',
			caption: 'Gledys Ibarra · La Gran Churuata del Conejo',
			description: 'La excelente pieza teatral «Yo no quiero reencarnar», con Gledys Ibarra, en la Gran Churuata del Conejo de Guatire.',
			src: 'reel/DNQygLPRMW-',
			cover: '/afiches/reencarnar.jpg',
			show: 'yo-no-quiero-reencarnar'
		}
	];
	const now = Date.now();
	for (const v of nuevos) {
		const exists = await db.execute({ sql: 'SELECT 1 FROM videos WHERE src=?', args: [v.src] });
		if (exists.rows.length) continue;
		await db.execute({
			sql: `INSERT INTO videos (title, caption, description, kind, src, cover, show_id, enabled, sort, created_at)
				  VALUES (?,?,?,'instagram',?,?,(SELECT id FROM shows WHERE slug=?),1,0,?)`,
			args: [v.title, v.caption, v.description, v.src, v.cover, v.show, now]
		});
	}
	// orden del carrusel
	const orden = ['reel/DfUNzvkTPA_', 'reel/DHd51_rseCm', 'reel/DHognSmpOLt', 'reel/DHgI6BMRn3r', 'reel/CyeXR7KuxNf', 'reel/DZxgIMcFfYC', 'reel/DNyCVM6QLKl', 'reel/DNQygLPRMW-'];
	for (const [i, src] of orden.entries()) await db.execute({ sql: 'UPDATE videos SET sort=? WHERE src=?', args: [i + 1, src] });
	await db.execute({ sql: `UPDATE videos SET sort=sort+100 WHERE src NOT IN (${orden.map(() => '?').join(',')})`, args: orden });
	await db.execute(`INSERT OR REPLACE INTO meta (k, v) VALUES ('videos_seed_v2', '1')`);
}
