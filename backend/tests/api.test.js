// Test de punta a punta de la API (base en memoria, WhatsApp simulado)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../src/db.js';
import { seed } from '../src/seedData.js';
import { crearServidor } from '../src/app.js';

let server;
let base;

before(async () => {
  delete process.env.TWILIO_ACCOUNT_SID;
  initDb({ inMemory: true });
  seed();
  server = crearServidor().listen(0);
  await new Promise((ok) => server.once('listening', ok));
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

const api = async (path, opts = {}) => {
  const res = await fetch(base + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, data: await res.json() };
};

test('flujo completo: cierre → pedido automático → reposición', async () => {
  const { data: insumos } = await api('/locales/1/insumos');
  assert.equal(insumos.length, 8);
  assert.ok(insumos.every((i) => i.burnRate !== null), 'todos tienen burn rate por el historial de demo');

  // Cierre: los vasos quedan vacíos, el resto igual que ayer
  const items = insumos.map((i) => ({ insumoId: i.id, nivel: i.nombre === 'Vasos' ? 0 : i.ultimoNivel }));
  const cierre = await api('/locales/1/cierres', { method: 'POST', body: { items } });
  assert.equal(cierre.status, 201);

  const vasos = cierre.data.insumos.find((i) => i.nombre === 'Vasos');
  assert.equal(vasos.estado, 'critico');
  assert.ok(cierre.data.pedidos.some((p) => p.insumo === 'Vasos' && p.canal === 'simulado'));

  // Repetir el cierre no duplica pedidos (ya hay uno pendiente)
  const repetido = await api('/locales/1/cierres', { method: 'POST', body: { items } });
  assert.ok(!repetido.data.pedidos.some((p) => p.insumo === 'Vasos'));

  // Llega el pedido
  const repo = await api(`/insumos/${vasos.id}/reposiciones`, { method: 'POST', body: {} });
  assert.equal(repo.status, 201);
  const { data: despues } = await api('/locales/1/insumos');
  const vasos2 = despues.find((i) => i.nombre === 'Vasos');
  assert.equal(vasos2.stockActual, 500);
  assert.equal(vasos2.pedidoPendiente, false);

  const { data: pedidos } = await api('/locales/1/pedidos');
  assert.ok(pedidos.find((p) => p.insumo_nombre === 'Vasos').estado === 'recibido');
});

test('rechaza niveles inválidos (solo 0, 25, 50, 100)', async () => {
  const r = await api('/locales/1/cierres', { method: 'POST', body: { items: [{ insumoId: 1, nivel: 37 }] } });
  assert.equal(r.status, 400);
});
