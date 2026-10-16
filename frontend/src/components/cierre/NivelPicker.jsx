// Hoja que aparece al tocar un insumo: 4 botones enormes, cero teclado.
import { useEffect } from 'react';
import InsumoIcon from '../../icons/InsumoIcon.jsx';
import NivelGauge from '../comun/NivelGauge.jsx';
import { NIVELES } from '../../constants/niveles.js';

export default function NivelPicker({ insumo, nivelActual, onElegir, onCerrar }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);

  return (
    <div className="hoja-fondo" onClick={onCerrar}>
      <div className="hoja" role="dialog" aria-label={`¿Cuánto quedó de ${insumo.nombre}?`} onClick={(e) => e.stopPropagation()}>
        <header className="hoja__titulo">
          <InsumoIcon nombre={insumo.icono} size={48} />
          <h2>¿Cuánto quedó de {insumo.nombre}?</h2>
          <button className="hoja__cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>
        <div className="niveles">
          {NIVELES.map((n) => (
            <button
              key={n.valor}
              className={`nivel ${nivelActual === n.valor ? 'nivel--activo' : ''}`}
              style={{ '--color-nivel': n.color }}
              onClick={() => onElegir(insumo.id, n.valor)}
            >
              <NivelGauge nivel={n.valor} alto={110} ancho={70} />
              <span>{n.etiqueta}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
