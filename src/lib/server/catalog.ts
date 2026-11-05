import { all } from './db';
import { sweepExpired } from './reservations';

export type Show = {
	id: number; slug: string; title: string; tagline: string; synopsis: string; director: string; cast_list: string;
	duration_min: number; genre: string; age_rating: string; poster: string | null; variant: number; featured: number;
};
export type PerfRow = {
	id: number; show_id: number; starts_at: string; venue: string; address: string; maps_url: string;
	price_usd: number; capacity: number; taken: number;
};

export async function perfsFor(showId?: number): Promise<PerfRow[]> {
	await sweepExpired();
	return all<PerfRow>(
			`SELECT p.*, (SELECT COUNT(*) FROM reservation_seats rs WHERE rs.performance_id=p.id) taken
			 FROM performances p ${showId ? 'WHERE p.show_id=?' : ''} ORDER BY p.starts_at`
		,
		showId ? [showId] : []
	);
}

const isFuture = (iso: string) => new Date(iso).getTime() > Date.now();
/** "Hotel Tibisay · Maturín" → "Maturín" */
export const cityOf = (venue: string) => (venue.split('·').at(-1) ?? venue).trim();

export async function catalog() {
	const shows = await all<Show>('SELECT * FROM shows ORDER BY id');
	const perfs = await perfsFor();
	const enriched = shows.map((s) => {
		const ps = perfs.filter((p) => p.show_id === s.id);
		const upcoming = ps.filter((p) => isFuture(p.starts_at));
		return {
			...s,
			upcoming: upcoming.length,
			next: upcoming[0]?.starts_at ?? null,
			first: ps[0]?.starts_at ?? null,
			last: ps.at(-1)?.starts_at ?? null,
			minPrice: upcoming.length ? Math.min(...upcoming.map((p) => p.price_usd)) : null,
			venue: (upcoming[0] ?? ps.at(-1))?.venue ?? '',
			count: ps.length,
			cities: [...new Set(ps.map((p) => cityOf(p.venue)))]
		};
	});
	const current = enriched.filter((s) => s.upcoming > 0).sort((a, b) => a.next!.localeCompare(b.next!));
	const past = enriched.filter((s) => s.upcoming === 0 && s.last).sort((a, b) => b.last!.localeCompare(a.last!));
	const main = current.find((s) => s.featured) ?? current[0] ?? null;
	// el destacado va primero en el banner
	const slides = main ? [main, ...current.filter((s) => s.id !== main.id)] : [];
	const upcomingPerfs = perfs
		.filter((p) => isFuture(p.starts_at))
		.map((p) => {
			const s = shows.find((x) => x.id === p.show_id)!;
			return { ...p, title: s.title, slug: s.slug, variant: s.variant, poster: s.poster, genre: s.genre, left: p.capacity - p.taken, city: cityOf(p.venue) };
		});
	const pastPerfs = perfs.filter((p) => !isFuture(p.starts_at));
	const stats = {
		shows: enriched.filter((s) => s.count > 0).length,
		performances: pastPerfs.length,
		cities: new Set(pastPerfs.map((p) => cityOf(p.venue))).size,
		since: perfs[0] ? new Date(perfs[0].starts_at).getFullYear() : null
	};
	return { main, slides, current, past, upcomingPerfs, stats };
}
