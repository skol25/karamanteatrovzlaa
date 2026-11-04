const TZ = 'America/Caracas';

export const bs = (n: number) =>
	'Bs. ' + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const usd = (n: number) =>
	'USD ' + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const rateFmt = (n: number) =>
	new Intl.NumberFormat('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n);

export const fechaLarga = (iso: string) =>
	new Intl.DateTimeFormat('es-VE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));

export const fechaCorta = (iso: string) =>
	new Intl.DateTimeFormat('es-VE', { timeZone: TZ, day: '2-digit', month: 'short' }).format(new Date(iso));

export const diaSemana = (iso: string) =>
	new Intl.DateTimeFormat('es-VE', { timeZone: TZ, weekday: 'short' }).format(new Date(iso));

export const dia = (iso: string) =>
	new Intl.DateTimeFormat('es-VE', { timeZone: TZ, day: 'numeric' }).format(new Date(iso));

export const mes = (iso: string) =>
	new Intl.DateTimeFormat('es-VE', { timeZone: TZ, month: 'short' }).format(new Date(iso)).replace('.', '');

export const hora = (iso: string) =>
	new Intl.DateTimeFormat('es-VE', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));

export const fechaValor = (ymd: string) =>
	new Intl.DateTimeFormat('es-VE', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
		new Date(ymd + 'T12:00:00Z')
	);

export const fechaHora = (ms: number) =>
	new Intl.DateTimeFormat('es-VE', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date(ms));
