import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cargar variables de backend/.env (nativo de Node, sin dotenv)
const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);

const { initDb, get } = await import('./db.js');
const { seed } = await import('./seedData.js');
const { crearServidor } = await import('./app.js');
const { modoWhatsapp } = await import('./services/whatsapp.js');

const PORT = Number(process.env.PORT) || 3001;

initDb();

// Primera vez: si la base está vacía, cargamos la demo
if (!get('SELECT id FROM locales LIMIT 1')) {
  seed();
  console.log('🌱 Base vacía: se cargaron datos de demo');
}

// 0.0.0.0 → accesible desde la tablet en la misma red wifi
crearServidor().listen(PORT, '0.0.0.0', () => {
  console.log(`☕ StockTouch API en http://localhost:${PORT}`);
  console.log(`📲 WhatsApp: modo ${modoWhatsapp().toUpperCase()}`);
});
