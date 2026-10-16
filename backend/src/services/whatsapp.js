// =========================================================
//  Envío de mensajes al proveedor
//  - Sin credenciales → modo SIMULADO (se guarda y se ve en la app)
//  - Con credenciales de Twilio en .env → envío real por WhatsApp
// =========================================================

export function modoWhatsapp() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;
  return TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM ? 'twilio' : 'simulado';
}

export function armarMensaje({ local, proveedor, insumo, autonomiaDias }) {
  const dias =
    autonomiaDias === null || !Number.isFinite(autonomiaDias)
      ? ''
      : autonomiaDias < 1
        ? ' Ya casi no nos queda.'
        : ` Nos quedan aprox. ${Math.floor(autonomiaDias)} día(s).`;
  return (
    `¡Hola ${proveedor.nombre}! 👋 Somos *${local.nombre}*.\n` +
    `Necesitamos *${insumo.cantidad_pedido} ${insumo.unidad}* de *${insumo.nombre}*.${dias}\n` +
    `¿Nos confirmás la entrega? ¡Gracias!\n` +
    `— Pedido automático de StockTouch`
  );
}

/**
 * Envía el mensaje. Nunca tira error: devuelve { canal, estado, detalle }.
 */
export async function enviarWhatsapp(telefono, mensaje) {
  const canal = modoWhatsapp();

  if (canal === 'simulado') {
    console.log(`\n📲 [WhatsApp SIMULADO] → ${telefono}\n${mensaje}\n`);
    return { canal, estado: 'enviado', detalle: 'Simulación (sin credenciales de Twilio)' };
  }

  // Envío real usando la API REST de Twilio (sin SDK, con fetch nativo)
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_WHATSAPP_FROM: from } = process.env;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: `whatsapp:${telefono}`, Body: mensaje }),
    });
    const data = await res.json();
    if (!res.ok) return { canal, estado: 'error', detalle: data.message || `HTTP ${res.status}` };
    return { canal, estado: 'enviado', detalle: `Twilio SID ${data.sid}` };
  } catch (err) {
    return { canal, estado: 'error', detalle: err.message };
  }
}
