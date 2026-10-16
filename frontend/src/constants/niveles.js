// Los 4 niveles visuales del cierre. El usuario NUNCA tipea números:
// toca uno de estos y listo. (Deben coincidir con NIVELES del backend.)
export const NIVELES = [
  { valor: 100, etiqueta: 'Lleno', color: 'var(--ok)' },
  { valor: 50, etiqueta: 'Mitad', color: 'var(--mitad)' },
  { valor: 25, etiqueta: 'Casi vacío', color: 'var(--alerta)' },
  { valor: 0, etiqueta: 'Vacío', color: 'var(--critico)' },
];

export const nivelInfo = (valor) => NIVELES.find((n) => n.valor === valor) ?? null;

export const ESTADOS = {
  ok: { etiqueta: 'Tranqui', color: 'var(--ok)' },
  alerta: { etiqueta: 'Atención', color: 'var(--alerta)' },
  critico: { etiqueta: 'Crítico', color: 'var(--critico)' },
  sin_datos: { etiqueta: 'Sin datos', color: 'var(--texto-suave)' },
};
