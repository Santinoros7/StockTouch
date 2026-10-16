// Datos de demo: un café "al paso" con 5 días de historial
// para que el Burn Rate ya tenga con qué calcular desde el primer uso.
import { run, resetDb } from './db.js';
import { sumarDias, nivelACantidad } from './services/burnRate.js';

const PROVEEDORES = [
  { key: 'packaging', nombre: 'Packaging Express', whatsapp: '+5491100000001', dias_entrega: 1 },
  { key: 'lacteos', nombre: 'Lácteos La Granja', whatsapp: '+5491100000002', dias_entrega: 1 },
  { key: 'tostadero', nombre: 'Tostadero del Sur', whatsapp: '+5491100000003', dias_entrega: 2 },
  { key: 'almacen', nombre: 'Almacén Mayorista', whatsapp: '+5491100000004', dias_entrega: 2 },
  { key: 'panaderia', nombre: 'Panadería Don Julio', whatsapp: '+5491100000005', dias_entrega: 1 },
];

// historial: niveles de cierre de los últimos 5 días (del más viejo a ayer)
// repo: índice del día en que llegó mercadería (antes del cierre de ese día)
const INSUMOS = [
  { nombre: 'Vasos', icono: 'vasos', unidad: 'vasos', capacidad: 500, cantidad_pedido: 500, prov: 'packaging', historial: [100, 100, 100, 100, 50] },
  { nombre: 'Tapas', icono: 'tapas', unidad: 'tapas', capacidad: 500, cantidad_pedido: 500, prov: 'packaging', historial: [100, 50, 100, 100, 100], repo: 2 },
  { nombre: 'Leche', icono: 'leche', unidad: 'litros', capacidad: 24, cantidad_pedido: 24, prov: 'lacteos', historial: [25, 100, 100, 100, 50], repo: 1 },
  { nombre: 'Café en grano', icono: 'cafe', unidad: 'kg', capacidad: 10, cantidad_pedido: 10, prov: 'tostadero', historial: [100, 50, 100, 100, 100], repo: 2 },
  { nombre: 'Azúcar', icono: 'azucar', unidad: 'sobres', capacidad: 1000, cantidad_pedido: 1000, prov: 'almacen', historial: [100, 100, 100, 100, 100] },
  { nombre: 'Servilletas', icono: 'servilletas', unidad: 'servilletas', capacidad: 2000, cantidad_pedido: 2000, prov: 'packaging', historial: [100, 50, 100, 100, 100], repo: 2 },
  { nombre: 'Bolsas', icono: 'bolsas', unidad: 'bolsas', capacidad: 300, cantidad_pedido: 300, prov: 'packaging', historial: [100, 100, 100, 100, 100] },
  { nombre: 'Medialunas', icono: 'medialunas', unidad: 'unidades', capacidad: 60, cantidad_pedido: 60, prov: 'panaderia', margen_dias: 0, historial: [100, 50, 100, 50, 100], repos: [2, 4] },
];

export function seed(hoy = new Date().toLocaleDateString('en-CA')) {
  resetDb();
  const localId = run('INSERT INTO locales (nombre) VALUES (?)', ['Café Al Paso']).lastId;

  const provIds = {};
  for (const p of PROVEEDORES) {
    provIds[p.key] = run('INSERT INTO proveedores (nombre, whatsapp, dias_entrega) VALUES (?, ?, ?)', [
      p.nombre, p.whatsapp, p.dias_entrega,
    ]).lastId;
  }

  const dias = INSUMOS[0].historial.length;
  const fechas = Array.from({ length: dias }, (_, i) => sumarDias(hoy, i - dias)); // [-5 ... -1]
  const cierreIds = fechas.map((f) => run('INSERT INTO cierres (local_id, fecha) VALUES (?, ?)', [localId, f]).lastId);

  INSUMOS.forEach((ins, orden) => {
    const insumoId = run(
      `INSERT INTO insumos (local_id, proveedor_id, nombre, icono, unidad, capacidad, cantidad_pedido, margen_dias, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [localId, provIds[ins.prov], ins.nombre, ins.icono, ins.unidad, ins.capacidad, ins.cantidad_pedido, ins.margen_dias ?? 1, orden]
    ).lastId;

    const diasRepo = ins.repos ?? (ins.repo !== undefined ? [ins.repo] : []);
    ins.historial.forEach((nivel, i) => {
      if (diasRepo.includes(i)) {
        run(`INSERT INTO registros_stock (insumo_id, tipo, fecha, cantidad) VALUES (?, 'reposicion', ?, ?)`, [
          insumoId, fechas[i], ins.cantidad_pedido,
        ]);
      }
      run(
        `INSERT INTO registros_stock (insumo_id, cierre_id, tipo, fecha, nivel, cantidad) VALUES (?, ?, 'cierre', ?, ?, ?)`,
        [insumoId, cierreIds[i], fechas[i], nivel, nivelACantidad(nivel, ins.capacidad)]
      );
    });
  });

  return localId;
}
