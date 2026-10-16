// Tarjeta gigante de un insumo en la pantalla de cierre.
import InsumoIcon from '../../icons/InsumoIcon.jsx';
import NivelGauge from '../comun/NivelGauge.jsx';
import { nivelInfo } from '../../constants/niveles.js';

export default function InsumoTile({ insumo, nivel, onTocar }) {
  const marcado = nivel !== undefined;
  const info = marcado ? nivelInfo(nivel) : null;
  return (
    <button
      className={`tile ${marcado ? 'tile--marcado' : ''}`}
      style={marcado ? { '--color-nivel': info.color } : undefined}
      onClick={() => onTocar(insumo)}
    >
      <span className="tile__icono">
        <InsumoIcon nombre={insumo.icono} size={72} />
      </span>
      <span className="tile__nombre">{insumo.nombre}</span>
      {marcado ? (
        <span className="tile__estado">
          <NivelGauge nivel={nivel} alto={36} ancho={24} />
          {info.etiqueta}
        </span>
      ) : (
        <span className="tile__estado tile__estado--pendiente">Tocá para marcar</span>
      )}
      {marcado && <span className="tile__check" aria-label="marcado">✓</span>}
    </button>
  );
}
