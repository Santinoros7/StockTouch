// Archivo nuevo: backend/src/services/ai.js

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Envía los datos de caja, stock o una duda operativa a la IA y devuelve una recomendación clara.
 */
export async function consultarAsistenteIA({ pregunta, datosCaja, stockCritico }) {
  // Armamos el contexto con los datos reales que mande la app
  const contextoSistema = `
Sos el asistente inteligente de "StockTouch", un sistema de gestión de stock y cierre de turno/caja.
Tu objetivo es ayudar al cajero o encargado a resolver descuadres de números, diferencias de caja o alertas de mercadería.
Respondé siempre en español, de forma directa, breve (máximo 4 o 5 líneas) y con pasos prácticos para verificar el error.

Datos actuales enviados por el sistema:
- Datos de caja / turno: ${datosCaja ? JSON.stringify(datosCaja) : "No especificados"}
- Insumos en estado crítico: ${stockCritico ? JSON.stringify(stockCritico) : "No especificados"}
- Consulta o problema del usuario: "${pregunta || "Revisar números del cierre"}"
`.trim();

  // Si todavía no configuraste la API Key, responde con un diagnóstico local de prueba
  if (!GEMINI_API_KEY) {
    return {
      ok: true,
      modo: "local-demo",
      respuesta: generarRespuestaDemo({ pregunta, datosCaja })
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
      respuesta: generarRespuestaDemo({ pregunta, datosCaja })
    };
  }
}

// Diagnóstico matemático básico por si no hay internet o falta la API Key
function generarRespuestaDemo({ pregunta, datosCaja }) {
  if (datosCaja && datosCaja.esperado !== undefined && datosCaja.real !== undefined) {
    const diferencia = Number(datosCaja.real) - Number(datosCaja.esperado);
    if (diferencia < 0) {
      return `Faltante detectado de $${Math.abs(diferencia)}. 1) Revisá si hubo un retiro o pago a proveedor en efectivo no cargado. 2) Verificá si un cobro con transferencia/mercado pago se marcó como efectivo por error.`;
    }
    if (diferencia > 0) {
      return `Sobrante detectado de $${diferencia}. 1) Revisá si quedó cambio inicial sin registrar. 2) Verificá si se cobró un pedido que no fue cargado en el turno.`;
    }
    return "Los números de caja cuadran perfectamente ($0 de diferencia).";
  }

  return `Recibí tu consulta: "${pregunta || "Ayuda general"}". Para activar la IA en vivo, configurá la variable GEMINI_API_KEY en tu servidor. Mientras tanto, verificá los movimientos de efectivo y el último conteo de insumos.`;
}