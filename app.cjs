// Archivo de arranque para Namecheap (cPanel → "Setup Node.js App" → Application startup file: app.cjs)
// Passenger define PORT automáticamente. Antes hay que ejecutar `npm install` y `npm run build`.
import('./build/index.js');
