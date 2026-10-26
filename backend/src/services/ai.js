// Archivo: backend/src/services/ai.js

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Envía los datos de caja, stock o una duda operativa a la IA y devuelve una recomendación clara.
 */
export async function consultarAsistenteIA({ pregunta, datosCaja, stockCritico }) {
  const contextoSistema = `
Sos el asistente inteligente de "StockTouch", un sistema de gestión de stock y cierre de turno/caja.
Tu objetivo es ayudar al cajero o encargado a resolver descuadres de números, diferencias de caja o alertas de mercadería.
Respondé siempre en español, de forma directa, breve (máximo 4 o 5 líneas) y con pasos prácticos para verificar el error.

Datos actuales enviados por el sistema:
- Datos de caja / turno: ${datosCaja ? JSON.stringify(datosCaja) : "No especificados"}
- Insumos en estado crítico: ${stockCritico ? JSON.stringify(stockCritico) : "No especificados"}
- Consulta o problema del usuario: "${pregunta || "Revisar números del cierre"}"
`.trim();

  // Si todavía no configuraste la API Key, responde con el motor de auditoría local
  if (!GEMINI_API_KEY) {
    return {
      ok: true,
      modo: "local-demo",
      respuesta: generarRespuestaDemo({ pregunta, datosCaja, stockCritico })
    };
  }

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: contextoSistema }]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Error HTTP en Gemini: ${response.status}`);
    }

    const data = await response.json();
    const textoIA =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No se pudo generar un consejo en este momento.";

    return {
      ok: true,
      modo: "gemini-api",
      respuesta: textoIA.trim()
    };
  } catch (error) {
    console.error("Error en servicio IA:", error.message);
    return {
      ok: false,
      modo: "error-fallback",
      respuesta: generarRespuestaDemo({ pregunta, datosCaja, stockCritico })
    };
  }
}

function generarRespuestaDemo({ pregunta, datosCaja, stockCritico }) {
  const bloques = [];

  // 1. Auditoría de números de caja
  if (datosCaja && datosCaja.esperado !== undefined && datosCaja.real !== undefined) {
    const diferencia = Number(datosCaja.real) - Number(datosCaja.esperado);
    const gastos = Number(datosCaja.gastos || 0);

    if (diferencia < 0) {
      const falta = Math.abs(diferencia);
      bloques.push(
        `💸 FALTANTE DE CAJA ($${falta}):\n` +
        `• Revisá si pagaste a un proveedor en efectivo desde el cajón y olvidaste anotar el retiro${gastos > 0 ? ` (tenés $${gastos} registrados en gastos)` : ' (tenés $0 registrados en gastos/retiros)'}.\n` +
        `• Verificá si una venta cobrada con Mercado Pago o transferencia se fichó como Efectivo.\n` +
        `• Si el faltante es redondo ($${falta}), buscá un ticket por ese monto exacto o un vuelto mal entregado.`
      );
    } else if (diferencia > 0) {
      bloques.push(
        `💰 SOBRANTE DE CAJA (+$${diferencia}):\n` +
        `• Verificá si incluiste el fondo de cambio inicial dentro del conteo sin haberlo cargado en "Fondo inicial".\n` +
        `• Revisá si cobraste un pedido rápido en efectivo que no se fichó en el sistema.`
      );
    } else {
      bloques.push(`✅ CAJA CUADRADA: El efectivo real en el cajón coincide exacto con el esperado ($0 de diferencia).`);
    }
  }

  // 2. Diagnóstico real de insumos críticos y en alerta con burn rate
  if (Array.isArray(stockCritico) && stockCritico.length > 0) {
    const ordenados = [...stockCritico].sort(
      (a, b) => (Number(a.autonomiaDias) || 99) - (Number(b.autonomiaDias) || 99)
    );
    const lineas = ordenados.map((i) => {
      const urgencia = i.estado === 'critico' ? '🔴 CRÍTICO' : '🟡 ALERTA';
      const accion = i.pedidoPendiente
        ? 'Pedido ya enviado al proveedor.'
        : `Pedir ${i.cantidadPedido} ${i.unidad} a ${i.proveedor?.nombre ?? 'proveedor'}.`;
      return `• ${urgencia} — ${i.nombre}: ${i.autonomiaDias} día(s) de autonomía (consumo: ${i.burnRate ?? 0} ${i.unidad}/día). ${accion}`;
    });

    bloques.push(`📦 PRIORIDAD DE REPOSICIÓN (${stockCritico.length} insumos en riesgo):\n${lineas.join('\n')}`);
  } else if (pregunta && pregunta.toLowerCase().includes('stock')) {
    bloques.push(`✅ STOCK AL DÍA: Todos los insumos del local tienen autonomía suficiente y no hay alertas activas.`);
  }

  if (bloques.length > 0) {
    return bloques.join('\n\n');
  }

  return `Ingresá los montos de efectivo arriba para auditar la caja o tocá "📦 Analizar stock crítico" para evaluar tus insumos.`;
}