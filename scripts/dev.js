// Levanta backend (puerto 3001) y frontend (puerto 5173) a la vez con un solo comando.
// Sin dependencias: funciona igual en Windows, Mac y Linux.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

if (!existsSync('frontend/node_modules')) {
  console.error('\n⚠️  Falta instalar el frontend. Corré primero:  npm run setup\n');
  process.exit(1);
}

const procesos = [
  { nombre: 'API ', color: '\x1b[33m', args: ['run', 'dev', '--prefix', 'backend'] },
  { nombre: 'WEB ', color: '\x1b[36m', args: ['run', 'dev', '--prefix', 'frontend'] },
].map(({ nombre, color, args }) => {
  const comandoCompleto = `npm ${args.join(' ')}`;
  const p = spawn(comandoCompleto, { shell: true, env: { ...process.env, FORCE_COLOR: '1' } });
  const prefijo = `${color}[${nombre}]\x1b[0m `;
  const salida = (stream) => (data) =>
    data.toString().split(/\r?\n/).filter(Boolean).forEach((l) => stream.write(prefijo + l + '\n'));
  p.stdout.on('data', salida(process.stdout));
  p.stderr.on('data', salida(process.stderr));
  return p;
});

const cortar = () => {
  procesos.forEach((p) => p.kill());
  process.exit();
};
process.on('SIGINT', cortar);
process.on('SIGTERM', cortar);
procesos.forEach((p) => p.on('exit', (code) => code && cortar()));

console.log('\n☕ StockTouch arrancando…  Abrí http://localhost:5173  (Ctrl+C para cortar)\n');
