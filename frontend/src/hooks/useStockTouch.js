// Estado central de la app: local, insumos, pedidos, conexión y sincronización.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ErrorDeRed } from '../api/client.js';
import { colaPendiente, encolarCierre, sincronizar, leerCache, guardarCache } from '../offline/cola.js';

const hoyLocal = () => new Date().toLocaleDateString('en-CA');

export function useStockTouch() {
  const cache = useRef(leerCache()).current;
  const [local, setLocal] = useState(cache?.local ?? null);
  const [insumos, setInsumos] = useState(cache?.insumos ?? []);
  const [pedidos, setPedidos] = useState(cache?.pedidos ?? []);
  const [online, setOnline] = useState(true);
  const [pendientes, setPendientes] = useState(colaPendiente().length);
  const [cargando, setCargando] = useState(!cache);
  const [whatsappModo, setWhatsappModo] = useState(null);

  const refrescar = useCallback(async () => {
    try {
      const salud = await api.salud();
      setWhatsappModo(salud.whatsapp);
      const [primerLocal] = await api.locales();
      const [ins, peds] = await Promise.all([api.insumos(primerLocal.id), api.pedidos(primerLocal.id)]);
      setLocal(primerLocal);
      setInsumos(ins);
      setPedidos(peds);
      setOnline(true);
      guardarCache({ local: primerLocal, insumos: ins, pedidos: peds });
    } catch (err) {
      if (err instanceof ErrorDeRed) setOnline(false);
      else console.error(err);
    } finally {
      setCargando(false);
    }
  }, []);

  const intentarSincronizar = useCallback(async () => {
    if (colaPendiente().length === 0) return;
    const enviados = await sincronizar();
    setPendientes(colaPendiente().length);
    if (enviados.length) await refrescar();
  }, [refrescar]);

  // Al abrir + cada 15 s revisamos conexión y mandamos lo pendiente
  useEffect(() => {
    refrescar().then(intentarSincronizar);
    const alVolver = () => intentarSincronizar();
    window.addEventListener('online', alVolver);
    const timer = setInterval(async () => {
      try {
        await api.salud();
        setOnline(true);
        await intentarSincronizar();
      } catch {
        setOnline(false);
      }
    }, 15000);
    return () => {
      window.removeEventListener('online', alVolver);
      clearInterval(timer);
    };
  }, [refrescar, intentarSincronizar]);

  /**
   * Cierra el turno. Devuelve:
   *  { modo: 'online', pedidos: [...] }   → se guardó en el servidor
   *  { modo: 'offline' }                  → quedó en la tablet, se envía después
   */
  const cerrarTurno = useCallback(
    async (niveles) => {
      const cierre = {
        fecha: hoyLocal(),
        items: Object.entries(niveles).map(([insumoId, nivel]) => ({ insumoId: Number(insumoId), nivel })),
      };
      try {
        const res = await api.cerrarTurno(local.id, cierre);
        setInsumos(res.insumos);
        setOnline(true);
        const peds = await api.pedidos(local.id);
        setPedidos(peds);
        guardarCache({ local, insumos: res.insumos, pedidos: peds });
        return { modo: 'online', pedidos: res.pedidos };
      } catch (err) {
        if (!(err instanceof ErrorDeRed)) throw err;
        encolarCierre(local.id, cierre);
        setPendientes(colaPendiente().length);
        setOnline(false);
        // Actualizamos la vista local con lo que se tocó, aunque no haya servidor
        setInsumos((prev) => prev.map((i) => (niveles[i.id] !== undefined ? { ...i, ultimoNivel: niveles[i.id] } : i)));
        return { modo: 'offline' };
      }
    },
    [local]
  );

  const reponer = useCallback(
    async (insumoId) => {
      await api.reponer(insumoId);
      await refrescar();
    },
    [refrescar]
  );

  const resetDemo = useCallback(async () => {
    await api.resetDemo();
    await refrescar();
  }, [refrescar]);

  return { local, insumos, pedidos, online, pendientes, cargando, whatsappModo, cerrarTurno, reponer, resetDemo, refrescar };
}
