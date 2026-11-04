# Karamantea Teatro · Venta de entradas

SvelteKit 3 (Svelte 5) + libSQL/SQLite + Nodemailer. El mismo código corre en **Vercel** (demo) y en **Namecheap** (producción).

| | Vercel (demo) | Namecheap (producción) |
|---|---|---|
| Base de datos | Turso (`DATABASE_URL=libsql://…`) | archivo `data/karamantea.db` |
| Comprobantes y afiches | dentro de la base de datos | dentro de la base de datos |
| Servidor | funciones serverless (adaptador Vercel automático) | Node.js con `app.cjs` |

No hay procesos en segundo plano: la tasa BCV se consulta como máximo cada 30 min y los vencimientos se revisan con las visitas.

## Local

```bash
npm install
cp .env.example .env
npm run dev                  # http://localhost:5173
npm run build && npm start   # http://localhost:3000
```

Panel: `/admin` (clave = `ADMIN_PASSWORD`). La primera vez se cargan obras de ejemplo.

## Demo en Vercel

1. **Base de datos (Turso, plan gratis):** crea una cuenta en turso.tech, crea una base (región cercana a Vercel, p. ej. AWS us-east-1) y copia la **URL** (`libsql://…`) y un **token**.
2. Sube el proyecto a GitHub.
3. En vercel.com → *Add New Project* → importa el repo. Framework: SvelteKit (lo detecta solo).
4. En *Environment Variables* agrega:
   - `DATABASE_URL` y `DATABASE_AUTH_TOKEN` (de Turso)
   - `ADMIN_PASSWORD`, `SESSION_SECRET` (cadena larga aleatoria), `ADMIN_EMAIL`
   - opcional: `SMTP_*`, `MAIL_FROM`, `PAGO_*`
5. *Deploy*. Las tablas y los datos de ejemplo se crean en la primera visita.

Notas: Vercel limita cada envío a ~4,5 MB, por eso el comprobante admite hasta 4 MB. Si el BCV no responde desde los servidores de Vercel, se usa el respaldo manual en `/admin`.

## Producción en Namecheap (cPanel con Node.js)

1. Sube el proyecto (sin `node_modules`) a una carpeta, p. ej. `~/karamantea`.
2. cPanel → **Setup Node.js App** → *Create Application*:
   - Node.js version: 20 o superior
   - Application root: `karamantea`
   - Application URL: tu dominio
   - Application startup file: `app.cjs`
3. En la misma pantalla agrega las variables de entorno (las de `.env.example`; deja `DATABASE_URL` vacío para usar el archivo local). Agrega `PROTOCOL_HEADER=x-forwarded-proto`, `HOST_HEADER=x-forwarded-host` y `BODY_SIZE_LIMIT=6M`.
4. Pulsa *Run NPM Install*. Luego, en la Terminal de cPanel (entrando al entorno que muestra la app): `npm run build`.
5. *Restart*. Respalda la carpeta `data/` periódicamente.

Si quieres pasar los datos de la demo a producción, también se puede dejar Namecheap apuntando a la misma base Turso.

## Reglas del negocio

- Asientos apartados **20 min** (`HOLD_MINUTES`), con cotización en Bs a la tasa BCV vigente.
- Las tasas nunca se editan: cada cambio crea un registro nuevo y **toda cotización con una tasa que dejó de estar vigente vence al instante** y libera los asientos.
- Sin tasa vigente (o con más de `MAX_RATE_AGE_DAYS` días) no se vende.
- Al enviar el comprobante: correo al admin (con el comprobante adjunto) y al comprador ("pago registrado"). Al confirmar en `/admin`: el comprador recibe sus entradas.
- `/admin/correos` muestra todos los correos enviados (útil para la demo sin SMTP).
