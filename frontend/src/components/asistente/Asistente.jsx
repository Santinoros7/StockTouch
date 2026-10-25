// Apartado de Asistente IA: Arqueo de caja, consultas operativas y acción rápida de stock
import { useState } from 'react';
import { api } from '../../api/client.js';

export default function Asistente({ localId = 1, insumos = [], onReponer }) {
  const [fondoInicial, setFondoInicial] = useState('');
  const [ventasEfectivo, setVentasEfectivo] = useState('');
  const [gastosCaja, setGastosCaja] = useState('');
  const [esperadoManual, setEsperadoManual] = useState('');
  const [real, setReal] = useState('');

  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [reponiendoId, setReponiendoId] = useState(null);
  const [error, setError] = useState(null);

  const criticos = insumos.filter((i) => i.estado === 'critico' || i.estado === 'alerta');

  // Si cargó desglose (fondo, ventas o gastos), calcula el esperado solo; si no, usa el campo manual
  const usaDesglose = fondoInicial !== '' || ventasEfectivo !== '' || gastosCaja !== '';
  const esperadoCalculado = usaDesglose
    ? Number(fondoInicial || 0) + Number(ventasEfectivo || 0) - Number(gastosCaja || 0)
    : esperadoManual !== ''
    ? Number(esperadoManual)
    : null;

  const tieneNumeros = esperadoCalculado !== null && real !== '';
  const diferencia = tieneNumeros ? Number(real) - esperadoCalculado : null;

  async function consultar(preguntaRapida) {
    setCargando(true);
    setError(null);
    try {
      const datosCaja = tieneNumeros
        ? {
            esperado: esperadoCalculado,
            real: Number(real),
            gastos: Number(gastosCaja || 0),
            diferencia,
          }
        : undefined;

      const res = await api.ayudaIA({
        localId,
        pregunta: preguntaRapida ?? pregunta,
        datosCaja,
      });
      setRespuesta(res);
    } catch (err) {
      setError(err.message || 'No se pudo consultar al asistente');
    } finally {
      setCargando(false);
    }
  }

  async function manejarReponer(insumoId) {
    if (!onReponer) return;
    setReponiendoId(insumoId);
    try {
      await onReponer(insumoId);
    } finally {
      setReponiendoId(null);
    }
  }

  const inputEstilo = {
    width: '100%',
    minHeight: '52px',
    padding: '0 14px',
    borderRadius: '14px',
    border: '2px solid var(--borde)',
    background: 'var(--superficie-2)',
    color: 'var(--texto)',
    fontSize: '18px',
    fontWeight: '700',
  };

  return (
    <section className="cierre">
      <div className="cierre__barra">
        <div>
          <h1>🤖 Asistente de Caja y Stock</h1>
          <p className="texto-suave">
            Auditá el efectivo del turno, detectá descuadres y gestioná insumos en riesgo.
          </p>
        </div>
        {criticos.length > 0 && (
          <span className="chip chip--critico">
            {criticos.length} insumo(s) en alerta/crítico
          </span>
        )}
      </div>

      {/* Bloque 1: Arqueo asistido de Caja */}
      <div
        style={{
          background: 'var(--superficie)',
          border: '2px solid var(--borde)',
          borderRadius: 'var(--radio)',
          padding: '24px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '21px', margin: 0 }}>1. Arqueo de Caja del Turno</h3>
          {(usaDesglose || esperadoManual !== '' || real !== '') && (
            <button
              type="button"
              className="btn btn--fantasma"
              onClick={() => {
                setFondoInicial('');
                setVentasEfectivo('');
                setGastosCaja('');
                setEsperadoManual('');
                setReal('');
              }}
            >
              Limpiar números
            </button>
          )}
        </div>

        {/* Desglose opcional para calcular el esperado sin errores mentales */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <label className="texto-suave" style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>
              + Fondo inicial ($)
            </label>
            <input
              type="number"
              placeholder="Ej: 10000"
              value={fondoInicial}
              onChange={(e) => setFondoInicial(e.target.value)}
              style={inputEstilo}
            />
          </div>

          <div>
            <label className="texto-suave" style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>
              + Ventas en efectivo ($)
            </label>
            <input
              type="number"
              placeholder="Ej: 38000"
              value={ventasEfectivo}
              onChange={(e) => setVentasEfectivo(e.target.value)}
              style={inputEstilo}
            />
          </div>

          <div>
            <label className="texto-suave" style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>
              - Gastos / Retiros ($)
            </label>
            <input
              type="number"
              placeholder="Ej: 3000"
              value={gastosCaja}
              onChange={(e) => setGastosCaja(e.target.value)}
              style={inputEstilo}
            />
          </div>
        </div>

        {/* Comparación Esperado vs Real */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            alignItems: 'end',
            paddingTop: '12px',
            borderTop: '1px solid var(--borde)',
          }}
        >
          <div>
            <label className="texto-suave" style={{ display: 'block', marginBottom: '6px' }}>
              {usaDesglose ? 'Efectivo esperado (calculado)' : 'Efectivo esperado en sistema ($)'}
            </label>
            <input
              type="number"
              placeholder="Ej: 45000"
              value={usaDesglose ? esperadoCalculado : esperadoManual}
              disabled={usaDesglose}
              onChange={(e) => setEsperadoManual(e.target.value)}
              style={{
                ...inputEstilo,
                opacity: usaDesglose ? 0.85 : 1,
              }}
            />
          </div>

          <div>
            <label className="texto-suave" style={{ display: 'block', marginBottom: '6px' }}>
              Efectivo real contado en cajón ($)
            </label>
            <input
              type="number"
              placeholder="Ej: 41500"
              value={real}
              onChange={(e) => setReal(e.target.value)}
              style={inputEstilo}
            />
          </div>

          {tieneNumeros && (
            <div style={{ paddingBottom: '6px' }}>
              <span
                className={`chip ${diferencia === 0 ? 'chip--ok' : 'chip--critico'}`}
                style={{ fontSize: '18px', padding: '10px 18px' }}
              >
                {diferencia === 0
                  ? '✓ Caja cuadrada ($0)'
                  : diferencia < 0
                  ? `Faltan $${Math.abs(diferencia)}`
                  : `Sobran $${diferencia}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bloque 2: Consulta al Asistente */}
      <div
        style={{
          background: 'var(--superficie)',
          border: '2px solid var(--borde)',
          borderRadius: 'var(--radio)',
          padding: '24px',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ marginBottom: '12px', fontSize: '21px' }}>
          2. Diagnóstico Inteligente
        </h3>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button
            type="button"
            className="btn btn--fantasma"
            onClick={() => {
              const texto = 'Auditá los números de mi caja y decime qué revisar.';
              setPregunta(texto);
              consultar(texto);
            }}
          >
            💸 Auditar diferencia de caja
          </button>
          <button
            type="button"
            className="btn btn--fantasma"
            onClick={() => {
              const texto = 'Analizá mis insumos críticos y decime cuáles son más urgentes para pedir hoy.';
              setPregunta(texto);
              consultar(texto);
            }}
          >
            📦 Analizar stock crítico
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Escribí tu duda sobre la caja o el stock..."
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            style={{
              ...inputEstilo,
              flex: '1',
              minWidth: '240px',
              fontWeight: '400',
            }}
          />
          <button
            className="btn btn--primario"
            disabled={cargando || (!pregunta.trim() && !tieneNumeros)}
            onClick={() => consultar()}
          >
            {cargando ? 'Analizando…' : 'Consultar a la IA'}
          </button>
        </div>

        {error && (
          <p className="error" style={{ marginTop: '16px' }}>
            {error}
          </p>
        )}

        {respuesta && (
          <div
            style={{
              marginTop: '20px',
              padding: '20px',
              borderRadius: '16px',
              background: 'var(--superficie-2)',
              borderLeft: '6px solid var(--acento)',
              lineHeight: '1.6',
            }}
          >
            <div className="texto-suave" style={{ marginBottom: '6px', fontSize: '13px' }}>
              Diagnóstico ({respuesta.modo === 'gemini-api' ? 'Gemini IA en vivo' : 'Motor de auditoría local'})
            </div>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{respuesta.respuesta}</p>
          </div>
        )}
      </div>

      {/* Bloque 3: Acción rápida sobre insumos críticos sin salir del Asistente */}
      {criticos.length > 0 && (
        <div
          style={{
            background: 'var(--superficie)',
            border: '2px solid var(--borde)',
            borderRadius: 'var(--radio)',
            padding: '24px',
          }}
        >
          <h3 style={{ marginBottom: '14px', fontSize: '21px' }}>
            3. Insumos en riesgo ahora mismo ({criticos.length})
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {criticos.map((insumo) => (
              <div
                key={insumo.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '14px 18px',
                  borderRadius: '14px',
                  background: 'var(--superficie-2)',
                  border: '1px solid var(--borde)',
                }}
              >
                <div>
                  <strong style={{ fontSize: '18px' }}>{insumo.nombre}</strong>
                  <span
                    className={`chip chip--${insumo.estado}`}
                    style={{ marginLeft: '10px', fontSize: '12px' }}
                  >
                    {insumo.estado.toUpperCase()} · {insumo.autonomiaDias}d
                  </span>
                  <div className="texto-suave" style={{ fontSize: '14px', marginTop: '4px' }}>
                    Consumo: {insumo.burnRate ?? 0} {insumo.unidad}/día · Proveedor: {insumo.proveedor?.nombre ?? 'Sin asignar'}
                  </div>
                </div>

                {onReponer && (
                  <button
                    type="button"
                    className="btn btn--fantasma"
                    disabled={reponiendoId === insumo.id}
                    onClick={() => manejarReponer(insumo.id)}
                  >
                    {reponiendoId === insumo.id ? 'Reponiendo…' : '✓ Marcar repuesto'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}