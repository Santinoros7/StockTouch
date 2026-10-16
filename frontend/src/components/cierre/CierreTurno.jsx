// Pantalla principal: el cierre de turno en < 1 minuto, sin teclados.
import { useState } from 'react';
import InsumoTile from './InsumoTile.jsx';
import NivelPicker from './NivelPicker.jsx';
import ResultadoCierre from './ResultadoCierre.jsx';

export default function CierreTurno({ insumos, onCerrarTurno }) {
  const [niveles, setNiveles] = useState({}); // { [insumoId]: nivel }
  const [abierto, setAbierto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const marcados = Object.keys(niveles).length;
  const total = insumos.length;
  const completo = total > 0 && marcados === total;
  const faltantes = insumos.filter((i) => niveles[i.id] === undefined);
  const puedeRepetir = faltantes.some((i) => i.ultimoNivel !== null);

  function elegir(insumoId, nivel) {
    setNiveles((prev) => ({ ...prev, [insumoId]: nivel }));
    // Pasamos solo al siguiente sin marcar: el flujo es tocar-tocar-tocar
    const siguiente = insumos.find((i) => i.id !== insumoId && niveles[i.id] === undefined);
    setAbierto(siguiente ?? null);
  }

  function igualQueAyer() {
    setNiveles((prev) => {
      const nuevo = { ...prev };
      for (const i of faltantes) if (i.ultimoNivel !== null) nuevo[i.id] = i.ultimoNivel;
      return nuevo;
    });
  }

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      setResultado(await onCerrarTurno(niveles));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function terminar() {
    setResultado(null);
    setNiveles({});
  }

  return (
    <section className="cierre">
      <div className="cierre__barra">
        <div>
          <h1>Cierre de turno</h1>
          <p className="texto-suave">Tocá cada insumo y elegí cuánto quedó.</p>
        </div>
        <div className="progreso" aria-label={`${marcados} de ${total} marcados`}>
          <div className="progreso__barra">
            <div className="progreso__relleno" style={{ width: `${total ? (marcados / total) * 100 : 0}%` }} />
          </div>
          <span>{marcados}/{total}</span>
        </div>
      </div>

      <div className="grilla">
        {insumos.map((insumo) => (
          <InsumoTile key={insumo.id} insumo={insumo} nivel={niveles[insumo.id]} onTocar={setAbierto} />
        ))}
      </div>

      <footer className="cierre__acciones">
        {!completo && puedeRepetir && (
          <button className="btn btn--secundario btn--grande" onClick={igualQueAyer}>
            ↺ El resto igual que ayer
          </button>
        )}
        <button className="btn btn--primario btn--grande" disabled={!completo || enviando} onClick={confirmar}>
          {enviando ? 'Guardando…' : completo ? 'Cerrar turno ✓' : `Faltan ${total - marcados}`}
        </button>
      </footer>
      {error && <p className="error" role="alert">{error}</p>}

      {abierto && (
        <NivelPicker insumo={abierto} nivelActual={niveles[abierto.id]} onElegir={elegir} onCerrar={() => setAbierto(null)} />
      )}
      {resultado && <ResultadoCierre resultado={resultado} onCerrar={terminar} />}
    </section>
  );
}
