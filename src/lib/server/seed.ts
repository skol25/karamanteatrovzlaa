import type { Client, InStatement } from '@libsql/client';

/** Datos de ejemplo. Las fechas se calculan a partir de hoy para que la demo siempre tenga funciones. */
export async function seed(db: Client) {
	const day = (offset: number, hh: number, mm = 0) => {
		const d = new Date(Date.now() + offset * 86400000);
		const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(d);
		return `${ymd}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00-04:00`;
	};

	const venues = {
		trasnocho: {
			venue: 'Trasnocho Cultural · Sala principal',
			address: 'Centro Comercial Paseo Las Mercedes, nivel Trasnocho, Caracas',
			maps_url: 'https://maps.google.com/?q=Trasnocho+Cultural+Caracas'
		},
		chacao: {
			venue: 'Teatro Municipal de Chacao',
			address: 'Av. Tamanaco, El Rosal, Caracas',
			maps_url: 'https://maps.google.com/?q=Teatro+Municipal+de+Chacao'
		},
		celarg: {
			venue: 'Celarg · Sala 1',
			address: 'Av. Luis Roche, Altamira, Caracas',
			maps_url: 'https://maps.google.com/?q=Celarg+Altamira'
		}
	};

	const shows = [
		{
			slug: 'la-mariposa-de-dos-rostros',
			title: 'La mariposa de dos rostros',
			tagline: 'Una misma alma, dos maneras de mirar el mundo.',
			synopsis:
				'Dos hermanas gemelas heredan la vieja casa familiar en La Pastora. Mientras una quiere venderla y empezar de cero, la otra se aferra a cada recuerdo. Entre risas, reproches y secretos guardados por años, descubren que el duelo y la alegría pueden compartir la misma habitación.',
			director: 'Dirección: María Fernanda Ríos',
			cast_list: 'Andreína Pérez, Carla Montiel, Luis Eduardo Salas',
			duration_min: 85,
			genre: 'Drama · Comedia',
			age_rating: '+12',
			variant: 0,
			featured: 1,
			perfs: [
				[2, 19, 0, 'trasnocho', 12, 96],
				[3, 19, 0, 'trasnocho', 12, 96],
				[4, 16, 0, 'trasnocho', 10, 96],
				[9, 19, 0, 'trasnocho', 12, 96],
				[10, 16, 0, 'trasnocho', 10, 96]
			]
		},
		{
			slug: 'cafe-con-fantasmas',
			title: 'Café con fantasmas',
			tagline: 'En esta panadería nadie se va del todo.',
			synopsis:
				'Una panadería de Catia abre todos los días a las cinco de la mañana. Lo que los clientes no saben es que los antiguos dueños siguen opinando sobre cada cachito. Una comedia tierna sobre la familia, el oficio y lo que dejamos atrás.',
			director: 'Dirección: Gustavo Arráiz',
			cast_list: 'Rosa Elena Marcano, Javier Tovar, Daniela Quintero',
			duration_min: 75,
			genre: 'Comedia',
			age_rating: 'Todo público',
			variant: 1,
			featured: 0,
			perfs: [
				[5, 18, 0, 'chacao', 8, 60],
				[6, 18, 0, 'chacao', 8, 60],
				[12, 18, 0, 'chacao', 8, 60]
			]
		},
		{
			slug: 'el-ultimo-tren-a-la-guaira',
			title: 'El último tren a La Guaira',
			tagline: 'Un viaje que nunca salió, un amor que nunca llegó.',
			synopsis:
				'1950. En la estación de Caño Amarillo, un telegrafista y una cantante esperan un tren que se retrasa toda la noche. Una pieza íntima, con música en vivo, sobre las decisiones que se toman a última hora.',
			director: 'Dirección: Héctor Manrique Lugo',
			cast_list: 'Elba Martínez, Rafael Briceño, Trío Cuerdas del Ávila',
			duration_min: 95,
			genre: 'Drama musical',
			age_rating: '+14',
			variant: 2,
			featured: 0,
			perfs: [
				[7, 20, 0, 'celarg', 15, 48],
				[8, 20, 0, 'celarg', 15, 48],
				[14, 20, 0, 'celarg', 15, 48]
			]
		},
		{
			slug: 'mascaras-en-la-azotea',
			title: 'Máscaras en la azotea',
			tagline: 'Improvisación sin red, cada noche distinta.',
			synopsis:
				'El elenco de Karamantea sube a escena sin guion: el público propone, los actores crean. Un espectáculo de improvisación teatral donde ninguna función se parece a la anterior.',
			director: 'Colectivo Karamantea',
			cast_list: 'Elenco rotativo de Karamantea Teatro',
			duration_min: 70,
			genre: 'Improvisación',
			age_rating: '+16',
			variant: 3,
			featured: 0,
			perfs: [
				[11, 21, 0, 'trasnocho', 7, 72],
				[18, 21, 0, 'trasnocho', 7, 72]
			]
		},
		{
			slug: 'retazos',
			title: 'Retazos',
			tagline: 'Historias cosidas a mano.',
			synopsis:
				'Seis monólogos breves de mujeres venezolanas de distintas generaciones, hilados por una costurera que remienda la memoria del país.',
			director: 'Dirección: Lucía Barreto',
			cast_list: 'Elenco Karamantea',
			duration_min: 80,
			genre: 'Monólogos',
			age_rating: '+14',
			variant: 1,
			featured: 0,
			perfs: [
				[-40, 19, 0, 'celarg', 10, 48],
				[-39, 19, 0, 'celarg', 10, 48]
			]
		},
		{
			slug: 'la-casa-de-los-relojes',
			title: 'La casa de los relojes',
			tagline: 'El tiempo también tiene memoria.',
			synopsis:
				'Un relojero jubilado recibe la visita inesperada del hijo que no ve hace veinte años. Una obra sobre el perdón y las horas perdidas.',
			director: 'Dirección: María Fernanda Ríos',
			cast_list: 'Luis Eduardo Salas, Pedro Lander',
			duration_min: 90,
			genre: 'Drama',
			age_rating: '+12',
			variant: 2,
			featured: 0,
			perfs: [
				[-75, 19, 0, 'chacao', 10, 60],
				[-74, 19, 0, 'chacao', 10, 60]
			]
		},
		{
			slug: 'sancocho-de-verano',
			title: 'Sancocho de verano',
			tagline: 'La familia completa, el mismo fogón.',
			synopsis:
				'Un domingo en Higuerote, una olla de sancocho y tres generaciones que no se ponen de acuerdo en nada. Comedia costumbrista para toda la familia.',
			director: 'Dirección: Gustavo Arráiz',
			cast_list: 'Rosa Elena Marcano, Javier Tovar',
			duration_min: 70,
			genre: 'Comedia',
			age_rating: 'Todo público',
			variant: 0,
			featured: 0,
			perfs: [[-120, 17, 0, 'trasnocho', 8, 96]]
		}
	] as const;

	const stmts: InStatement[] = [];
	for (const s of shows) {
		const { perfs, ...d } = s;
		stmts.push({
			sql: `INSERT INTO shows (slug,title,tagline,synopsis,director,cast_list,duration_min,genre,age_rating,variant,featured)
				VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
			args: [d.slug, d.title, d.tagline, d.synopsis, d.director, d.cast_list, d.duration_min, d.genre, d.age_rating, d.variant, d.featured]
		});
		for (const [off, hh, mm, v, price, cap] of perfs) {
			const venue = venues[v];
			stmts.push({
				sql: `INSERT INTO performances (show_id,starts_at,venue,address,maps_url,price_usd,capacity)
					VALUES ((SELECT id FROM shows WHERE slug=?),?,?,?,?,?,?)`,
				args: [d.slug, day(off, hh, mm), venue.venue, venue.address, venue.maps_url, price, cap]
			});
		}
	}
	await db.batch(stmts, 'write');
}
