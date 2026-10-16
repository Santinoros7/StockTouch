// Recipiente que se "llena" según el nivel: se entiende sin leer.
import { nivelInfo } from '../../constants/niveles.js';

export default function NivelGauge({ nivel, alto = 72, ancho = 44 }) {
  const info = nivelInfo(nivel);
  const relleno = nivel === null || nivel === undefined ? 0 : nivel;
  const interior = alto - 8;
  const h = (interior * relleno) / 100;
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden="true">
      <rect x="2" y="2" width={ancho - 4} height={alto - 4} rx="8" fill="none" stroke="currentColor" strokeWidth="3" opacity=".9" />
      {relleno > 0 && (
        <rect x="6" y={4 + interior - h} width={ancho - 12} height={Math.max(0, h - 2)} rx="4" fill={info?.color ?? 'currentColor'} />
      )}
      {relleno === 0 && nivel === 0 && (
        <path d={`M10 ${alto - 14}L${ancho - 10} 14`} stroke="var(--critico)" strokeWidth="4" strokeLinecap="round" />
      )}
    </svg>
  );
}
