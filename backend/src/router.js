// Mini-router HTTP (estilo Express) hecho con node:http, sin dependencias.
//   router.get('/api/insumos/:id', ({ params, body, query }) => datos)
// El handler devuelve los datos (→ 200) o { status, data }.
// Si tira un error → 400 con { error }.
import fs from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
};

export function crearRouter({ staticDir } = {}) {
  const rutas = [];

  const agregar = (method) => (patron, handler) => {
    const claves = [];
    const regex = new RegExp(
      '^' + patron.replace(/:(\w+)/g, (_, k) => (claves.push(k), '([^/]+)')) + '/?$'
    );
    rutas.push({ method, regex, claves, handler });
  };
  
  async function leerBody(req) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    if (!chunks.length) return {};
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new Error('JSON inválido'); }
  }

  function enviar(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  }

  // Sirve el frontend compilado (frontend/dist) para usar todo desde una sola URL
  function servirEstatico(req, res, pathname) {
    if (!staticDir || !fs.existsSync(staticDir) || req.method !== 'GET') return false;
    let archivo = path.join(staticDir, decodeURIComponent(pathname));
    if (!archivo.startsWith(staticDir)) return false;
    if (!fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) archivo = path.join(staticDir, 'index.html');
    if (!fs.existsSync(archivo)) return false;
    res.writeHead(200, { 'Content-Type': MIME[path.extname(archivo)] || 'application/octet-stream' });
    fs.createReadStream(archivo).pipe(res);
    return true;
  }

  async function handle(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();

    const url = new URL(req.url, 'http://localhost');
    for (const r of rutas) {
      if (r.method !== req.method) continue;
      const m = url.pathname.match(r.regex);
      if (!m) continue;
      try {
        const params = Object.fromEntries(r.claves.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
        const body = ['POST', 'PUT'].includes(req.method) ? await leerBody(req) : {};
        const out = await r.handler({ params, body, query: Object.fromEntries(url.searchParams) });
        if (out && typeof out === 'object' && 'status' in out && 'data' in out) return enviar(res, out.status, out.data);
        return enviar(res, 200, out);
      } catch (err) {
        console.error('❌', err.message);
        return enviar(res, 400, { error: err.message });
      }
    }
    if (!url.pathname.startsWith('/api') && servirEstatico(req, res, url.pathname)) return;
    enviar(res, 404, { error: 'Ruta no encontrada' });
  }

  return { get: agregar('GET'), post: agregar('POST'), put: agregar('PUT'), delete: agregar('DELETE'), handle };
}
