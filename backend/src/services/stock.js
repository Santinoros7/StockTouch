// Lógica de negocio que combina la base de datos con el motor predictivo.
import { all, get, run, transaction } from '../db.js';
import { calcularBurnRate, proyectarAutonomia, nivelACantidad, NIVELES } from './burnRate.js';
import { armarMensaje, enviarWhatsapp } from './whatsapp.js';

const NIVELES_VALIDOS = new Set(Object.values(NIVELES));

/** Fecha local de hoy en formato YYYY-MM-DD */
export function hoyLocal() {
  return new Date().toLocaleDateString('en-CA');
}

/** Insumos de un local con su estado calculado (burn rate, autonomía, etc.) */
export function estadoInsumos(localId, hoy = hoyLocal()) {
  const insumos = all(
    `SELECT i.*, p.nombre AS proveedor_nombre, p.whatsapp AS proveedor_whatsapp, p.dias_entrega
       FROM insumos i LEFT JOIN proveedores p ON p.id = i.proveedor_id
      WHERE i.local_id = ? ORDER BY i.orden, i.id`,
    [localId]
  );

  return insumos.map((insumo) => {
    const registros = all(
      `SELECT tipo, fecha, nivel, cantidad FROM registros_stock
        WHERE insumo_id = ? AND fecha >= date(?, '-14 days') ORDER BY fecha, id`,
      [insumo.id, hoy]
    );
    const ultimoCierre = [...registros].reverse().find((r) => r.tipo === 'cierre') ?? null;
    const burn = calcularBurnRate(registros);
    const proy = proyectarAutonomia(
      burn,
      { diasEntrega: insumo.dias_entrega ?? 1, margenDias: insumo.margen_dias },
      hoy
    );
    const pedidoPendiente = get(
      `SELECT id, creado_en FROM pedidos WHERE insumo_id = ? AND estado = 'enviado' ORDER BY id DESC LIMIT 1`,
      [insumo.id]
    );

    return {
      id: insumo.id,
      nombre: insumo.nombre,
      icono: insumo.icono,
      unidad: insumo.unidad,
      capacidad: insumo.capacidad,
      cantidadPedido: insumo.cantidad_pedido,
      proveedor: insumo.proveedor_id
        ? { id: insumo.proveedor_id, nombre: insumo.proveedor_nombre, diasEntrega: insumo.dias_entrega }
        : null,
      ultimoNivel: ultimoCierre?.nivel ?? null,
      ultimaFecha: burn.ultimaFecha,
      stockActual: burn.stockActual,
      porcentaje: burn.stockActual === null ? null : Math.min(100, Math.round((burn.stockActual / insumo.capacidad) * 100)),
      burnRate: burn.burnRate === null ? null : Number(burn.burnRate.toFixed(2)),
      autonomiaDias:
        proy.autonomiaDias === null ? null : Number.isFinite(proy.autonomiaDias) ? Number(proy.autonomiaDias.toFixed(1)) : 'infinita',
      estado: proy.estado,
      fechaQuiebre: proy.fechaQuiebre,
      umbralCritico: proy.umbralCritico,
      pedidoPendiente: Boolean(pedidoPendiente),
    };
  });
}

/**
 * Registra un cierre de turno. Si ya había un cierre ese día, lo reemplaza.
 * items: [{ insumoId, nivel }]  con nivel ∈ {0, 25, 50, 100}
 */
export function registrarCierre(localId, fecha, items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('El cierre no tiene insumos');
  for (const it of items) {
    if (!NIVELES_VALIDOS.has(Number(it.nivel))) throw new Error(`Nivel inválido: ${it.nivel}`);
  }

  return transaction(() => {
    let cierre = get('SELECT id FROM cierres WHERE local_id = ? AND fecha = ?', [localId, fecha]);
    if (cierre) {
      run(`DELETE FROM registros_stock WHERE cierre_id = ?`, [cierre.id]);
    } else {
      cierre = { id: run('INSERT INTO cierres (local_id, fecha) VALUES (?, ?)', [localId, fecha]).lastId };
    }
    for (const it of items) {
      const insumo = get('SELECT id, capacidad FROM insumos WHERE id = ? AND local_id = ?', [it.insumoId, localId]);
      if (!insumo) throw new Error(`Insumo ${it.insumoId} no existe en este local`);
      run(
        `INSERT INTO registros_stock (insumo_id, cierre_id, tipo, fecha, nivel, cantidad) VALUES (?, ?, 'cierre', ?, ?, ?)`,
        [insumo.id, cierre.id, fecha, Number(it.nivel), nivelACantidad(Number(it.nivel), insumo.capacidad)]
      );
    }
    return cierre.id;
  });
}

/** "Llegó el pedido": suma la cantidad pedida al stock y cierra los pedidos pendientes. */
export function registrarReposicion(insumoId, fecha = hoyLocal(), cantidad) {
  const insumo = get('SELECT id, cantidad_pedido FROM insumos WHERE id = ?', [insumoId]);
  if (!insumo) throw new Error('Insumo inexistente');
  const total = cantidad ?? insumo.cantidad_pedido;
  return transaction(() => {
    run(`INSERT INTO registros_stock (insumo_id, tipo, fecha, cantidad) VALUES (?, 'reposicion', ?, ?)`, [insumoId, fecha, total]);
    run(`UPDATE pedidos SET estado = 'recibido' WHERE insumo_id = ? AND estado = 'enviado'`, [insumoId]);
    return total;
  });
}

/**
 * Revisa todos los insumos del local y, para cada uno en estado CRÍTICO
 * que no tenga un pedido pendiente, envía el WhatsApp al proveedor.
 */
export async function procesarPedidosAutomaticos(localId, hoy = hoyLocal()) {
  const local = get('SELECT * FROM locales WHERE id = ?', [localId]);
  const criticos = estadoInsumos(localId, hoy).filter((i) => i.estado === 'critico' && !i.pedidoPendiente && i.proveedor);
  const enviados = [];

  for (const item of criticos) {
    const insumo = get('SELECT * FROM insumos WHERE id = ?', [item.id]);
    const proveedor = get('SELECT * FROM proveedores WHERE id = ?', [insumo.proveedor_id]);
    const autonomia = typeof item.autonomiaDias === 'number' ? item.autonomiaDias : null;
    const mensaje = armarMensaje({ local, proveedor, insumo, autonomiaDias: autonomia });
    const resultado = await enviarWhatsapp(proveedor.whatsapp, mensaje);
    const { lastId } = run(
      `INSERT INTO pedidos (insumo_id, proveedor_id, mensaje, canal, estado, detalle) VALUES (?, ?, ?, ?, ?, ?)`,
      [insumo.id, proveedor.id, mensaje, resultado.canal, resultado.estado, resultado.detalle]
    );
    enviados.push({ id: lastId, insumo: insumo.nombre, proveedor: proveedor.nombre, ...resultado });
  }
  return enviados;
}

export function listarPedidos(localId, limite = 50) {
  return all(
    `SELECT pe.*, i.nombre AS insumo_nombre, i.icono, pr.nombre AS proveedor_nombre, pr.whatsapp
       FROM pedidos pe
       JOIN insumos i ON i.id = pe.insumo_id
       LEFT JOIN proveedores pr ON pr.id = pe.proveedor_id
      WHERE i.local_id = ?
      ORDER BY pe.id DESC LIMIT ?`,
    [localId, limite]
  );
}
