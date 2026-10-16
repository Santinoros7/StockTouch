// Cliente de la API. En desarrollo, Vite redirige /api → http://localhost:3001
const BASE = import.meta.env.VITE_API_URL ?? '/api';

export class ErrorDeRed extends Error {}

async function pedir(ruta, { method = 'GET', body, timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(BASE + ruta, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch {
    // Sin conexión o servidor caído → lo manejamos como "offline"
    throw new ErrorDeRed('Sin conexión con el servidor');
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export const api = {
  salud: () => pedir('/health', { timeoutMs: 3000 }),
  locales: () => pedir('/locales'),
  insumos: (localId) => pedir(`/locales/${localId}/insumos`),
  cerrarTurno: (localId, cierre) => pedir(`/locales/${localId}/cierres`, { method: 'POST', body: cierre }),
  reponer: (insumoId, body = {}) => pedir(`/insumos/${insumoId}/reposiciones`, { method: 'POST', body }),
  pedidos: (localId) => pedir(`/locales/${localId}/pedidos`),
  resetDemo: () => pedir('/demo/reset', { method: 'POST' }),
  ayudaIA: (body) => pedir('/ia/ayuda', { method: 'POST', body, timeoutMs: 15000 }),
};
