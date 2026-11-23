/** La última publicación oficial se aplica de inmediato, incluso con fecha valor futura. */
export function publishedRate<T extends { valid_date: string }>(official: T | null | undefined, manual: T | null | undefined, today: string, maxAgeDays: number): T | null {
	const usable = (r: T | null | undefined) => r && (Date.parse(today + 'T00:00:00Z') - Date.parse(r.valid_date + 'T00:00:00Z')) / 86400000 <= maxAgeDays;
	return usable(official) ? official! : usable(manual) ? manual! : null;
}
