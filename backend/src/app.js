// Definición de la API REST (separada de server.js para poder testearla)
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { all, get } from './db.js';
import { crearRouter } from './router.js';
import { seed } from './seedData.js';
import { modoWhatsapp } from './services/whatsapp.js';
import {
  estadoInsumos, registrarCierre, registrarReposicion,
  procesarPedidosAutomaticos, listarPedidos, hoyLocal,
} from './services/stock.js';
import { consultarAsistenteIA } from './services/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

export function crearServidor() {
  const api = crearRouter({ staticDir: path.resolve(__dirname, '../../frontend/dist') });

  // Salud del servidor (lo usa el frontend para saber si hay conexión)
  api.get('/api/health', () => ({ ok: true, hoy: hoyLocal(), whatsapp: modoWhatsapp() }));

  api.get('/api/locales', () => all('SELECT * FROM locales ORDER BY id'));

  // Insumos + estado calculado (burn rate, autonomía, crítico/alerta/ok)
  api.get('/api/locales/:localId/insumos', ({ params }) => estadoInsumos(Number(params.localId)));

  // Cierre de turno: { fecha?, items: [{ insumoId, nivel }] }
  // Después de guardar, dispara los pedidos automáticos de los insumos críticos.
  api.post('/api/locales/:localId/cierres', async ({ params, body }) => {
    const localId = Number(params.localId);
    if (!get('SELECT id FROM locales WHERE id = ?', [localId])) return { status: 404, data: { error: 'Local inexistente' } };
    const fecha = FECHA_RE.test(body.fecha ?? '') ? body.fecha : hoyLocal();
    const cierreId = registrarCierre(localId, fecha, body.items);
    const pedidos = await procesarPedidosAutomaticos(localId);
    return { status: 201, data: { cierreId, fecha, pedidos, insumos: estadoInsumos(localId) } };
  });

  // "Llegó el pedido" → repone stock
  api.post('/api/insumos/:insumoId/reposiciones', ({ params, body }) => {
    const fecha = FECHA_RE.test(body.fecha ?? '') ? body.fecha : hoyLocal();
    const cantidad = body.cantidad !== undefined ? Number(body.cantidad) : undefined;
    const total = registrarReposicion(Number(params.insumoId), fecha, cantidad);
    return { status: 201, data: { ok: true, cantidad: total } };
  });

  api.get('/api/locales/:localId/pedidos', ({ params }) => listarPedidos(Number(params.localId)));

  // Modo demo para el jurado: vuelve todo a los datos iniciales
  api.post('/api/demo/reset', () => ({ ok: true, localId: seed() }));

  // Asistente IA: recibe pregunta, datos de caja y busca automáticamente el stock crítico del local
  api.post('/api/ia/ayuda', async ({ body }) => {
    const localId = Number(body?.localId || 1);
    const criticos = estadoInsumos(localId).filter((i) => i.estado === 'critico' || i.estado === 'alerta');
    return await consultarAsistenteIA({
      pregunta: body?.pregunta,
      datosCaja: body?.datosCaja,
      stockCritico: criticos,
    });
  });
  
  return http.createServer(api.handle);
}
