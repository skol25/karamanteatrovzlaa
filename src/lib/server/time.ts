export const TZ = 'America/Caracas';

/** Fecha de hoy (YYYY-MM-DD) en hora de Caracas */
export function todayCaracas(d = new Date()): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(d);
}

export function daysBetween(a: string, b: string): number {
	return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}
