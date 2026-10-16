// =========================================================
//  Offline-first: si se corta el wifi al cerrar el turno,
//  el cierre se guarda en la tablet (localStorage) y se
//  envía solo cuando vuelve la conexión.
// =========================================================
import { api, ErrorDeRed } from '../api/client.js';

const CLAVE_COLA = 'stocktouch:cola';
const CLAVE_CACHE = 'stocktouch:cache';

function leer(clave, porDefecto) {
  try {
    return JSON.parse(localStorage.getItem(clave)) ?? porDefecto;
  } catch {
    return porDefecto;
  }
}
function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* almacenamiento lleno o bloqueado: seguimos igual */
  }
}

/* ---------- Cola de cierres pendientes ---------- */

export const colaPendiente = () => leer(CLAVE_COLA, []);

export function encolarCierre(localId, cierre) {
  const cola = colaPendiente().filter((c) => !(c.localId === localId && c.cierre.fecha === cierre.fecha));
  cola.push({ localId, cierre, guardadoEn: new Date().toISOString() });
  escribir(CLAVE_COLA, cola);
}

/** Intenta mandar todo lo pendiente. Devuelve los resultados de lo que se pudo enviar. */
export async function sincronizar() {
  const cola = colaPendiente();
  const enviados = [];
  const restantes = [];
  for (const item of cola) {
    try {
      enviados.push(await api.cerrarTurno(item.localId, item.cierre));
    } catch (err) {
      // Si es error de red, lo dejamos para después. Si el server lo rechaza, lo descartamos.
      if (err instanceof ErrorDeRed) restantes.push(item);
      else console.warn('Cierre descartado por el servidor:', err.message);
    }
  }
  escribir(CLAVE_COLA, restantes);
  return enviados;
}

/* ---------- Cache de la última lectura (para abrir sin internet) ---------- */

export const leerCache = () => leer(CLAVE_CACHE, null);
export const guardarCache = (datos) => escribir(CLAVE_CACHE, datos);
