// Historial de mensajes automáticos al proveedor, con look de WhatsApp.
import InsumoIcon from '../../icons/InsumoIcon.jsx';

const ESTADO_PEDIDO = {
  enviado: { texto: 'Enviado', tilde: '✓✓' },
  recibido: { texto: 'Mercadería recibida', tilde: '✓✓' },
  error: { texto: 'No se pudo enviar', tilde: '!' },
};

function hora(creadoEn) {
  // SQLite guarda UTC "YYYY-MM-DD HH:MM:SS"
  const d = new Date(creadoEn.replace(' ', 'T') + 'Z');
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Convierte *negrita* de WhatsApp en <b>
function formatear(texto) {
  return texto.split('\n').map((linea, i) => (
    <span key={i}>
      {linea.split(/(\*[^*]+\*)/g).map((parte, j) =>
        parte.startsWith('*') && parte.endsWith('*') ? <b key={j}>{parte.slice(1, -1)}</b> : parte
      )}
      <br />
    </span>
  ));
}

export default function Pedidos({ pedidos, whatsappModo }) {
  return (
    <section className="pedidos">
      <div className="cierre__barra">
        <div>
          <h1>Pedidos automáticos</h1>
          <p className="texto-suave">
            Cuando un insumo entra en estado crítico, StockTouch le escribe solo al proveedor.
          </p>
        </div>
        {whatsappModo && (
          <div className={`chip ${whatsappModo === 'twilio' ? 'chip--ok' : ''}`}>
            WhatsApp: {whatsappModo === 'twilio' ? 'real (Twilio)' : 'simulado'}
          </div>
        )}
      </div>

      {pedidos.length === 0 ? (
        <div className="vacio">
          <p>Todavía no se mandó ningún pedido.</p>
          <p className="texto-suave">Hacé un cierre marcando algo como “Casi vacío” para ver la magia.</p>
        </div>
      ) : (
        <div className="chat">
          {pedidos.map((p) => {
            const est = ESTADO_PEDIDO[p.estado] ?? ESTADO_PEDIDO.enviado;
            return (
              <div key={p.id} className="chat__item">
                <div className="chat__para">
                  <InsumoIcon nombre={p.icono} size={28} /> Para: <b>{p.proveedor_nombre}</b>
                  <span className="texto-suave"> {p.whatsapp}</span>
                </div>
                <div className={`burbuja ${p.estado === 'error' ? 'burbuja--error' : ''}`}>
                  {formatear(p.mensaje)}
                  <span className="burbuja__meta">
                    {hora(p.creado_en)} · {est.texto}{' '}
                    <span className={p.estado === 'recibido' ? 'tilde--azul' : ''}>{est.tilde}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
