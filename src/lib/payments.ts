/**
 * Tipos de métodos de pago. Para agregar uno nuevo (transferencia, Zelle…):
 * 1) añadir su tipo aquí con sus campos, 2) listo: el admin y la página de pago se generan solos.
 */
export type PaymentField = { key: string; label: string; placeholder?: string; copy?: boolean; required?: boolean };

export const PAYMENT_TYPES = {
	pago_movil: {
		name: 'Pago Móvil',
		fields: [
			{ key: 'banco', label: 'Banco', placeholder: '0102 · Banco de Venezuela', copy: true, required: true },
			{ key: 'telefono', label: 'Teléfono', placeholder: '0414-1234567', copy: true, required: true },
			{ key: 'documento', label: 'Cédula / RIF', placeholder: 'J-40722213-9', copy: true, required: true },
			{ key: 'titular', label: 'Titular', placeholder: 'Karamantea Group', copy: false, required: true }
		] as PaymentField[]
	}
} as const;

export type PaymentType = keyof typeof PAYMENT_TYPES;

/** Lo que recibe el front: un array de estos objetos */
export type PaymentMethod = {
	id: number;
	type: PaymentType;
	label: string;
	enabled: boolean;
	data: Record<string, string>;
};

/** Sugerencias de bancos venezolanos para el campo "Banco" (editable) */
export const BANCOS_VE = [
	'0102 · Banco de Venezuela',
	'0104 · Venezolano de Crédito',
	'0105 · Mercantil',
	'0108 · BBVA Provincial',
	'0114 · Bancaribe',
	'0115 · Banco Exterior',
	'0134 · Banesco',
	'0137 · Sofitasa',
	'0138 · Banco Plaza',
	'0151 · BFC Banco Fondo Común',
	'0156 · 100% Banco',
	'0163 · Banco del Tesoro',
	'0171 · Banco Activo',
	'0172 · Bancamiga',
	'0174 · Banplus',
	'0175 · Banco Digital de los Trabajadores',
	'0191 · Banco Nacional de Crédito (BNC)'
];
