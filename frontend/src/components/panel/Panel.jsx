// Panel del encargado: días de autonomía de cada insumo (motor predictivo).
import { useState } from 'react';
import InsumoIcon from '../../icons/InsumoIcon.jsx';
import { ESTADOS } from '../../constants/niveles.js';

const PRIORIDAD = { critico: 0, alerta: 1, sin_datos: 2, ok: 3 };
const MAX_DIAS_BARRA = 10;

function textoAutonomia(a) {
  if (a === null) return '—';
  if (a === 'infinita') return '+30';
  return a < 1 ? '<1' : Math.floor(a);
}

function formatearFecha(f) {
  if (!f) return '';
  const d = new Date(f + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
}

export default function Panel({ insumos, onReponer, onResetDemo }) {
  const [reponiendo, setReponiendo] = useState(null);
  const ordenados = [...insumos].sort((a, b) => PRIORIDAD[a.estado] - PRIORIDAD[b.estado]);
  const criticos = insumos.filter((i) => i.estado === 'critico').length;

  async function reponer(id) {
    setReponiendo(id);
    try {
      await onReponer(id);
    } finally {
      setReponiendo(null);
    }
  }

  return (
    <section className="panel">
      <div className="cierre__barra">
        <div>
          <h1>Autonomía</h1>
          <p className="texto-suave">Días que te dura cada insumo, según el consumo de los últimos 3 días.</p>
        </div>
        {criticos > 0 && <div className="chip chip--critico">{criticos} crítico{criticos > 1 ? 's' : ''}</div>}
      </div>

      <div className="lista-autonomia">
        {ordenados.map((i) => {
          const est = ESTADOS[i.estado];
          const dias = typeof i.autonomiaDias === 'number' ? i.autonomiaDias : i.autonomiaDias === 'infinita' ? MAX_DIAS_BARRA : 0;
          return (
            <article key={i.id} className="fila" style={{ '--color-estado': est.color }}>
              <span className="fila__icono"><InsumoIcon nombre={i.icono} size={48} /></span>
              <div className="fila__info">
                <h3>{i.nombre}</h3>
                <div className="barra-dias">
                  <div className="barra-dias__relleno" style={{ width: `${Math.min(100, (dias / MAX_DIAS_BARRA) * 100)}%` }} />
                </div>
                <p className="texto-suave">
                  {i.burnRate === 0 && <>Sin consumo en los últimos 3 días · </>}
                  {i.burnRate > 0 && <>Consumo: {i.burnRate} {i.unidad}/día · </>}
                  Stock: {i.stockActual ?? '—'} {i.unidad}
                  {i.fechaQuiebre && i.estado !== 'ok' && <> · Se acaba aprox. el <b>{formatearFecha(i.fechaQuiebre)}</b></>}
                </p>
              </div>
              <div className="fila__dias">
                <strong>{textoAutonomia(i.autonomiaDias)}</strong>
                <span>días</span>
              </div>
              <div className="fila__accion">
                <span className="chip" style={{ borderColor: est.color, color: est.color }}>{est.etiqueta}</span>
                {i.pedidoPendiente ? (
                  <button className="btn btn--secundario" disabled={reponiendo === i.id} onClick={() => reponer(i.id)}>
                    📦 Llegó el pedido
                  </button>
                ) : (
                  <span className="texto-suave fila__prov">{i.proveedor?.nombre}</span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <footer className="panel__demo">
        <button
          className="btn btn--fantasma"
          onClick={() => window.confirm('¿Volver a los datos de demo? Se borra todo lo cargado.') && onResetDemo()}
        >
          ⟲ Reiniciar demo
        </button>
      </footer>
    </section>
  );
}
