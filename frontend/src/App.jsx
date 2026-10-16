import { useState } from 'react';
import { useStockTouch } from './hooks/useStockTouch.js';
import CierreTurno from './components/cierre/CierreTurno.jsx';
import Panel from './components/panel/Panel.jsx';
import Pedidos from './components/pedidos/Pedidos.jsx';
import Asistente from './components/asistente/Asistente.jsx';

const VISTAS = [
  { id: 'cierre', etiqueta: 'Cierre', icono: '✋' },
  { id: 'panel', etiqueta: 'Autonomía', icono: '📊' },
  { id: 'pedidos', etiqueta: 'Pedidos', icono: '💬' },
  { id: 'asistente', etiqueta: 'Asistente', icono: '🤖' },
];

export default function App() {
  const st = useStockTouch();
  const [vista, setVista] = useState('cierre');
  const criticos = st.insumos.filter((i) => i.estado === 'critico').length;

  return (
    <div className="app">
      <header className="cabecera">
        <div className="marca">
          <img src="/icon.svg" alt="" width="36" height="36" />
          <div>
            <strong>StockTouch</strong>
            <span className="texto-suave">{st.local?.nombre ?? '…'}</span>
          </div>
        </div>
        <nav className="tabs" aria-label="Secciones">
          {VISTAS.map((v) => (
            <button
              key={v.id}
              className={`tab ${vista === v.id ? 'tab--activa' : ''}`}
              onClick={() => setVista(v.id)}
              aria-current={vista === v.id ? 'page' : undefined}
            >
              <span aria-hidden="true">{v.icono}</span> {v.etiqueta}
              {v.id === 'panel' && criticos > 0 && <span className="badge">{criticos}</span>}
            </button>
          ))}
        </nav>
        <div className={`conexion ${st.online ? '' : 'conexion--off'}`}>
          <span className="conexion__punto" />
          {st.online ? 'En línea' : 'Sin conexión'}
          {st.pendientes > 0 && <span className="texto-suave"> · {st.pendientes} por enviar</span>}
        </div>
      </header>

      <main className="contenido">
        {st.cargando ? (
          <div className="vacio">Cargando…</div>
        ) : st.insumos.length === 0 ? (
          <div className="vacio">
            <p>No pudimos conectar con el servidor.</p>
            <p className="texto-suave">¿Está corriendo el backend? (npm run dev)</p>
            <button className="btn btn--primario" onClick={st.refrescar}>Reintentar</button>
          </div>
        ) : vista === 'cierre' ? (
          <CierreTurno insumos={st.insumos} onCerrarTurno={st.cerrarTurno} />
        ) : vista === 'panel' ? (
          <Panel insumos={st.insumos} onReponer={st.reponer} onResetDemo={st.resetDemo} />
     ) : vista === 'pedidos' ? (
       <Pedidos pedidos={st.pedidos} whatsappModo={st.whatsappModo} />
     ) : (
       <Asistente localId={st.local?.id} insumos={st.insumos} />
     )}
      </main>
    </div>
  );
}
