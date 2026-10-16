// Pantalla de "¡Listo!" después de cerrar el turno.
export default function ResultadoCierre({ resultado, onCerrar }) {
  const offline = resultado.modo === 'offline';
  const pedidos = resultado.pedidos ?? [];
  return (
    <div className="hoja-fondo" onClick={onCerrar}>
      <div className="resultado" role="dialog" onClick={(e) => e.stopPropagation()}>
        <div className={`resultado__icono ${offline ? 'resultado__icono--offline' : ''}`}>{offline ? '☁' : '✓'}</div>
        <h2>{offline ? 'Guardado en la tablet' : '¡Turno cerrado!'}</h2>
        <p className="resultado__sub">
          {offline
            ? 'No hay conexión. Se envía solo apenas vuelva el wifi. Ya te podés ir.'
            : pedidos.length
              ? 'Le avisamos a los proveedores por WhatsApp:'
              : 'Todo en orden. No hace falta pedir nada hoy.'}
        </p>
        {pedidos.length > 0 && (
          <ul className="resultado__pedidos">
            {pedidos.map((p) => (
              <li key={p.id}>
                <span className="wa-dot">●</span> <b>{p.insumo}</b> → {p.proveedor}
                {p.estado === 'error' && <em className="error"> (falló: {p.detalle})</em>}
              </li>
            ))}
          </ul>
        )}
        <button className="btn btn--primario btn--grande" onClick={onCerrar}>
          Listo
        </button>
      </div>
    </div>
  );
}
