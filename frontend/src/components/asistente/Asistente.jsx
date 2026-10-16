// Apartado de Asistente IA: Cuadre de caja y consultas operativas
import { useState } from 'react';
import { api } from '../../api/client.js';

export default function Asistente({ localId = 1, insumos = [] }) {
  const [esperado, setEsperado] = useState('');
  const [real, setReal] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const criticos = insumos.filter((i) => i.estado === 'critico' || i.estado === 'alerta');

  const tieneNumeros = esperado !== '' && real !== '';
  const diferencia = tieneNumeros ? Number(real) - Number(esperado) : null;

  async function consultar(preguntaRapida) {
    setCargando(true);
    setError(null);
    try {
      const datosCaja = tieneNumeros
        ? { esperado: Number(esperado), real: Number(real), diferencia }
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

  return (
    <section className="cierre">
      <div className="cierre__barra">
        <div>
          <h1>🤖 Asistente de Caja y Stock</h1>
          <p className="texto-suave">
            Revisá diferencias de efectivo o consultá qué insumos pedir primero.
          </p>
        </div>
        {criticos.length > 0 && (
          <span className="chip chip--critico">
            {criticos.length} insumo(s) en alerta/crítico
          </span>
        )}
      </div>

      {/* Bloque 1: Calculadora rápida de cuadre de caja */}
      <div
        style={{
          background: 'var(--superficie)',
          border: '2px solid var(--borde)',
          borderRadius: 'var(--radio)',
          padding: '24px',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ marginBottom: '16px', fontSize: '21px' }}>
          1. Control rápido de Caja (Opcional)
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            alignItems: 'end',
          }}
        >
          <div>
            <label className="texto-suave" style={{ display: 'block', marginBottom: '8px' }}>
              Efectivo esperado en sistema ($)
            </label>
            <input
              type="number"
              placeholder="Ej: 45000"
              value={esperado}
              onChange={(e) => setEsperado(e.target.value)}
              style={{
                width: '100%',
                minHeight: '56px',
                padding: '0 16px',
                borderRadius: '14px',
                border: '2px solid var(--borde)',
                background: 'var(--superficie-2)',
                color: 'var(--texto)',
                fontSize: '20px',
                fontWeight: '700',
              }}
            />
          </div>

          <div>
            <label className="texto-suave" style={{ display: 'block', marginBottom: '8px' }}>
              Efectivo real contado en cajón ($)
            </label>
            <input
              type="number"
              placeholder="Ej: 41500"
              value={real}
              onChange={(e) => setReal(e.target.value)}
              style={{
                width: '100%',
                minHeight: '56px',
                padding: '0 16px',
                borderRadius: '14px',
                border: '2px solid var(--borde)',
                background: 'var(--superficie-2)',
                color: 'var(--texto)',
                fontSize: '20px',
                fontWeight: '700',
              }}
            />
          </div>

          {tieneNumeros && (
            <div style={{ paddingBottom: '8px' }}>
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

      {/* Bloque 2: Consulta o problema */}
      <div
        style={{
          background: 'var(--superficie)',
          border: '2px solid var(--borde)',
          borderRadius: 'var(--radio)',
          padding: '24px',
        }}
      >
        <h3 style={{ marginBottom: '12px', fontSize: '21px' }}>
          2. ¿Qué problema querés resolver?
        </h3>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button
            type="button"
            className="btn btn--fantasma"
            onClick={() => {
              const texto = 'No me cierra la caja del turno, ¿qué pasos reviso para encontrar la diferencia?';
              setPregunta(texto);
              consultar(texto);
            }}
          >
            💸 No me cierra la caja
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
              flex: '1',
              minWidth: '240px',
              minHeight: '56px',
              padding: '0 16px',
              borderRadius: '14px',
              border: '2px solid var(--borde)',
              background: 'var(--superficie-2)',
              color: 'var(--texto)',
              fontSize: '18px',
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
              lineHeight: '1.5',
            }}
          >
            <div className="texto-suave" style={{ marginBottom: '6px', fontSize: '13px' }}>
               Diagnóstico ({respuesta.modo === 'gemini-api' ? 'Gemini IA en vivo' : 'Modo diagnóstico local'})
            </div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{respuesta.respuesta}</p>
          </div>
        )}
      </div>
    </section>
  );
}