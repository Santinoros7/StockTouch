import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularBurnRate, proyectarAutonomia, diasEntre, sumarDias } from '../src/services/burnRate.js';

const c = (fecha, cantidad) => ({ tipo: 'cierre', fecha, cantidad });
const r = (fecha, cantidad) => ({ tipo: 'reposicion', fecha, cantidad });

test('utilidades de fechas', () => {
  assert.equal(diasEntre('2026-10-01', '2026-10-04'), 3);
  assert.equal(sumarDias('2026-10-30', 3), '2026-11-02');
});

test('sin cierres → sin datos', () => {
  const b = calcularBurnRate([]);
  assert.equal(b.burnRate, null);
  assert.equal(proyectarAutonomia(b, {}).estado, 'sin_datos');
});

test('un solo cierre → hay stock pero no burn rate', () => {
  const b = calcularBurnRate([c('2026-10-01', 100)]);
  assert.equal(b.burnRate, null);
  assert.equal(b.stockActual, 100);
});

test('consumo lineal: 100 → 70 → 40 → 10 en 3 días = 30/día', () => {
  const b = calcularBurnRate([c('2026-10-01', 100), c('2026-10-02', 70), c('2026-10-03', 40), c('2026-10-04', 10)]);
  assert.equal(b.burnRate, 30);
  assert.equal(b.stockActual, 10);
});

test('solo usa los últimos 3 días (ignora historia vieja)', () => {
  const b = calcularBurnRate([
    c('2026-09-20', 500), c('2026-09-21', 0), // consumo enorme viejo, no debe contar
    c('2026-10-01', 90), c('2026-10-02', 80), c('2026-10-03', 70), c('2026-10-04', 60),
  ]);
  assert.equal(b.burnRate, 10);
});

test('una reposición no se confunde con "consumo negativo"', () => {
  // 20 → (entran 100) → 90  ⇒ consumo = 20 + 100 - 90 = 30
  const b = calcularBurnRate([c('2026-10-01', 50), c('2026-10-02', 20), r('2026-10-03', 100), c('2026-10-03', 90)]);
  assert.equal(b.intervalos[1].consumo, 30);
  assert.equal(b.burnRate, (30 + 30) / 2);
});

test('días salteados (local cerrado el domingo) se promedian por día', () => {
  const b = calcularBurnRate([c('2026-10-03', 100), c('2026-10-05', 60)]);
  assert.equal(b.burnRate, 20);
});

test('reposición después del último cierre suma al stock actual', () => {
  const b = calcularBurnRate([c('2026-10-01', 50), c('2026-10-02', 10), r('2026-10-03', 100)]);
  assert.equal(b.stockActual, 110);
});

test('reposición el mismo día pero DESPUÉS del cierre suma al stock', () => {
  const b = calcularBurnRate([c('2026-10-01', 50), c('2026-10-02', 10), r('2026-10-02', 100)]);
  assert.equal(b.stockActual, 110);
  assert.equal(b.burnRate, 40);
});

test('estados: crítico / alerta / ok según días de entrega del proveedor', () => {
  const prov = { diasEntrega: 2, margenDias: 1 }; // crítico ≤ 3 días, alerta ≤ 5
  assert.equal(proyectarAutonomia({ burnRate: 10, stockActual: 30 }, prov).estado, 'critico');
  assert.equal(proyectarAutonomia({ burnRate: 10, stockActual: 50 }, prov).estado, 'alerta');
  assert.equal(proyectarAutonomia({ burnRate: 10, stockActual: 80 }, prov).estado, 'ok');
  assert.equal(proyectarAutonomia({ burnRate: 10, stockActual: 0 }, prov).estado, 'critico');
  assert.equal(proyectarAutonomia({ burnRate: 0, stockActual: 10 }, prov).autonomiaDias, Infinity);
});

test('fecha estimada de quiebre', () => {
  const p = proyectarAutonomia({ burnRate: 10, stockActual: 45 }, { diasEntrega: 1, margenDias: 0 }, '2026-10-14');
  assert.equal(p.autonomiaDias, 4.5);
  assert.equal(p.fechaQuiebre, '2026-10-18');
});
