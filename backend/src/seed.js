// npm run seed → borra todo y carga los datos de demo
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);

const { initDb } = await import('./db.js');
const { seed } = await import('./seedData.js');

initDb();
seed();
console.log('✅ Base de datos cargada con datos de demo (Café Al Paso)');
