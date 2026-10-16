// =========================================================
//  Motor predictivo de StockTouch
//  Burn Rate (consumo diario) + días de autonomía
// =========================================================
//
//  Idea en una línea:
//    consumo del período = stock al inicio + lo que entró - stock al final
//    burn rate           = consumo total / días transcurridos   (últimos 3 días)
//    autonomía           = stock actual / burn rate
//
//  Son funciones PURAS (no tocan la base de datos) para poder testearlas
//  y defenderlas fácil frente al jurado.
// =========================================================

export const VENTANA_DIAS = 3;

/** Los 4 niveles visuales que toca el usuario en la tablet. */
export const NIVELES = {
  LLENO: 100,
  MITAD: 50,
  POCO: 25, // "casi vacío"
  VACIO: 0,
};

const MS_DIA = 24 * 60 * 60 * 1000;

/** Días enteros entre dos fechas 'YYYY-MM-DD'. */
export function diasEntre(desde, hasta) {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / MS_DIA);
}

export function sumarDias(fecha, dias) {
  const d = new Date(Date.parse(fecha) + dias * MS_DIA);
  return d.toISOString().slice(0, 10);
}

/** Convierte un nivel visual (0-100) en cantidad real según la capacidad del insumo. */
export function nivelACantidad(nivel, capacidad) {
  return (capacidad * nivel) / 100;
}

/**
 * Calcula el Burn Rate de un insumo.
 *
 * @param {Array<{tipo:'cierre'|'reposicion', fecha:string, cantidad:number}>} registros
 * @param {number} ventanaDias  cuántos días hacia atrás mirar (por defecto 3)
 * @returns {{ burnRate: number|null, stockActual: number|null, ultimaFecha: string|null, diasMedidos: number, intervalos: Array }}
 */
export function calcularBurnRate(registros, ventanaDias = VENTANA_DIAS) {
  // Orden cronológico. sort() es estable: dentro del mismo día se respeta el orden
  // en que se cargaron (así sabemos si una reposición fue antes o después del cierre).
  const ordenados = [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Paso 1: recorrer la línea de tiempo. Cada cierre "se lleva" las reposiciones
  // que llegaron desde el cierre anterior.
  const cierres = [];
  let acumulado = 0;
  for (const r of ordenados) {
    if (r.tipo === 'reposicion') acumulado += r.cantidad;
    else {
      cierres.push({ ...r, repuestoAntes: acumulado });
      acumulado = 0;
    }
  }
  const repuestoDespues = acumulado; // lo que entró después del último cierre

  if (cierres.length === 0) {
    return { burnRate: null, stockActual: null, ultimaFecha: null, diasMedidos: 0, intervalos: [] };
  }

  const ultimo = cierres[cierres.length - 1];

  // Paso 2: quedarnos con los cierres de la ventana (últimos N días + el punto de partida)
  const inicioVentana = sumarDias(ultimo.fecha, -ventanaDias);
  const enVentana = cierres.filter((c) => c.fecha >= inicioVentana);

  // Paso 3: medir el consumo entre cada par de cierres consecutivos
  const intervalos = [];
  for (let i = 1; i < enVentana.length; i++) {
    const a = enVentana[i - 1];
    const b = enVentana[i];
    const consumo = Math.max(0, a.cantidad + b.repuestoAntes - b.cantidad);
    const dias = Math.max(1, diasEntre(a.fecha, b.fecha));
    intervalos.push({ desde: a.fecha, hasta: b.fecha, consumo, dias, repuesto: b.repuestoAntes });
  }

  // Paso 4: stock actual = último cierre + lo que entró después
  const stockActual = ultimo.cantidad + repuestoDespues;

  if (intervalos.length === 0) {
    return { burnRate: null, stockActual, ultimaFecha: ultimo.fecha, diasMedidos: 0, intervalos };
  }

  // Paso 5: promedio ponderado por días (no por cantidad de cierres)
  const consumoTotal = intervalos.reduce((s, x) => s + x.consumo, 0);
  const diasTotales = intervalos.reduce((s, x) => s + x.dias, 0);

  return {
    burnRate: consumoTotal / diasTotales,
    stockActual,
    ultimaFecha: ultimo.fecha,
    diasMedidos: diasTotales,
    intervalos,
  };
}

/**
 * Proyecta días de autonomía y define el estado del insumo.
 *
 *   crítico → se acaba antes (o justo cuando) llegaría un pedido hecho hoy
 *   alerta  → quedan menos de 2 días de colchón sobre el crítico
 *   ok      → tranqui
 */
export function proyectarAutonomia({ burnRate, stockActual }, { diasEntrega = 1, margenDias = 1 } = {}, hoy) {
  const umbralCritico = diasEntrega + margenDias;
  const umbralAlerta = umbralCritico + 2;

  if (stockActual === null) {
    return { autonomiaDias: null, estado: 'sin_datos', fechaQuiebre: null, umbralCritico };
  }
  if (stockActual <= 0) {
    return { autonomiaDias: 0, estado: 'critico', fechaQuiebre: hoy ?? null, umbralCritico };
  }
  if (burnRate === null) {
    return { autonomiaDias: null, estado: 'sin_datos', fechaQuiebre: null, umbralCritico };
  }
  if (burnRate === 0) {
    return { autonomiaDias: Infinity, estado: 'ok', fechaQuiebre: null, umbralCritico };
  }

  const autonomiaDias = stockActual / burnRate;
  let estado = 'ok';
  if (autonomiaDias <= umbralCritico) estado = 'critico';
  else if (autonomiaDias <= umbralAlerta) estado = 'alerta';

  const fechaQuiebre = hoy ? sumarDias(hoy, Math.floor(autonomiaDias)) : null;
  return { autonomiaDias, estado, fechaQuiebre, umbralCritico };
}
