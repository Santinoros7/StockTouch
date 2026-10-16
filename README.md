# ☕ StockTouch (AlPaso Stock)

**Inventario visual para locales gastronómicos "al paso"**: cafeterías, fast food, food trucks.
El cierre de turno se hace **tocando iconos gigantes** (sin teclados ni números). El sistema calcula
cuánto te dura cada insumo y **le escribe solo al proveedor por WhatsApp** cuando algo está por acabarse.

> MVP para StartLab · Equipo: 3 ingenieros + 1 diseñador

---

## 🧱 Stack (todo JavaScript)

| Capa | Tecnología | Por qué |
|---|---|---|
| App tablet | **React 19 + Vite** | Rápido, componentes simples, se instala como app (PWA) |
| Offline | **localStorage + Service Worker** | Si se corta el wifi, el cierre queda en la tablet y se envía solo después |
| Backend | **Node.js puro** (`node:http`) | **Cero dependencias**: nada que instalar ni que se rompa |
| Base de datos | **SQLite** (`node:sqlite`, nativo de Node) | Relacional, un solo archivo, sin servidor |
| Mensajería | **WhatsApp vía Twilio** (opcional) | Sin credenciales funciona en modo **simulado** |

---

## 🚀 Cómo arrancar (VS Code)

**Requisitos:** [Node.js 24 LTS](https://nodejs.org) (mínimo 22.13) y VS Code.

1. Abrí la carpeta `StockTouch` en VS Code (`Archivo → Abrir carpeta`).
   - **Primera vez:** renombrá la carpeta `_vscode` a `.vscode` (con punto adelante). Ahí están las tareas, el debug y las extensiones recomendadas.
2. Aceptá instalar las **extensiones recomendadas** (aparece un cartel abajo a la derecha).
3. Abrí la terminal (`Ctrl + Ñ`, o menú Terminal → Nueva terminal) y corré:

```bash
npm run setup     # instala React + Vite (solo la primera vez)
npm run dev       # levanta backend + frontend juntos
```

4. Abrí **http://localhost:5173** 🎉

> Atajo: `Ctrl + Shift + B` corre la tarea "StockTouch: levantar todo".

La primera vez se cargan **datos de demo** (Café Al Paso, 8 insumos, 5 proveedores y 5 días de historial).

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run setup` | Instala dependencias del frontend |
| `npm run dev` | Backend (`:3001`) + frontend (`:5173`) con recarga automática |
| `npm test` | Tests del algoritmo y de la API |
| `npm run seed` | Borra todo y recarga los datos de demo |
| `npm start` | Compila el frontend y sirve **todo** desde `http://localhost:3001` |

### 📱 Usarlo en una tablet real

1. Compu y tablet en la **misma red wifi**.
2. Corré `npm run dev`. Vite muestra una línea `Network: http://192.168.x.x:5173` → abrí esa URL en la tablet.
3. En Chrome de la tablet: menú ⋮ → **"Agregar a pantalla principal"** → queda como app a pantalla completa.

---

## 🗂️ Estructura

```
StockTouch/
├── backend/                     ← Ingeniero 1 (Backend) + Ingeniero 2 (Integraciones)
│   ├── src/
│   │   ├── schema.sql           Esquema relacional (tablas)
│   │   ├── db.js                Conexión SQLite + helpers
│   │   ├── router.js            Mini-router HTTP (estilo Express)
│   │   ├── app.js               Endpoints de la API REST
│   │   ├── server.js            Arranque del servidor
│   │   ├── seedData.js          Datos de demo
│   │   └── services/
│   │       ├── burnRate.js      ⭐ Motor predictivo (Burn Rate + autonomía)
│   │       ├── stock.js         Lógica de cierres, reposiciones y pedidos
│   │       └── whatsapp.js      ⭐ Envío de WhatsApp (simulado / Twilio)
│   ├── tests/                   Tests automáticos
│   ├── api.http                 Probar la API desde VS Code (REST Client)
│   └── .env.example             Config (puerto, Twilio)
├── frontend/                    ← Ingeniero 3 (Frontend) + Diseñador
│   ├── public/                  Ícono, manifest PWA, service worker
│   └── src/
│       ├── App.jsx              Navegación (Cierre · Autonomía · Pedidos)
│       ├── hooks/useStockTouch.js   Estado central + sincronización
│       ├── offline/cola.js      ⭐ Cola offline-first
│       ├── api/client.js        Llamadas a la API
│       ├── constants/niveles.js Los 4 niveles visuales
│       ├── icons/InsumoIcon.jsx ⭐ Sistema de iconos (para que el diseñador reemplace)
│       ├── styles/global.css    ⭐ Tokens de color y estilos "anti-estrés"
│       └── components/
│           ├── cierre/          CierreTurno · InsumoTile · NivelPicker · ResultadoCierre
│           ├── panel/           Panel de autonomía
│           ├── pedidos/         Historial estilo WhatsApp
│           └── comun/           NivelGauge (recipiente que se llena)
├── scripts/dev.js               Levanta todo con un comando
└── .vscode/                     Extensiones, tareas y debug
```

---

## 🗄️ Base de datos

```
locales ──< insumos >── proveedores
               │
               ├──< registros_stock >── cierres ──> locales
               └──< pedidos
```

| Tabla | Para qué |
|---|---|
| `locales` | El café / food truck |
| `proveedores` | Nombre, WhatsApp y **días que tarda en entregar** |
| `insumos` | Vasos, leche… con su `capacidad` (cuánto es "lleno") y `cantidad_pedido` |
| `cierres` | Un cierre de turno por día y local |
| `registros_stock` | Cada lectura: `cierre` (nivel 0/25/50/100 → cantidad) o `reposicion` (mercadería que entró) |
| `pedidos` | Mensajes enviados al proveedor y su estado (`enviado` → `recibido`) |

Para ver la base: abrí `backend/data/stocktouch.sqlite` con la extensión **SQLite Viewer**.

---

## 🧠 El algoritmo (Burn Rate + autonomía)

Está en `backend/src/services/burnRate.js` y tiene tests en `backend/tests/burnRate.test.js`.

```
1. Ordenar los registros en el tiempo.
2. Cada cierre "se lleva" las reposiciones que llegaron desde el cierre anterior.
3. Quedarse con los cierres de los ÚLTIMOS 3 DÍAS.
4. Para cada par de cierres seguidos:
       consumo = stock anterior + lo que entró − stock actual
5. Burn Rate = consumo total / días transcurridos        (ej: 40 vasos/día)
6. Autonomía = stock actual / Burn Rate                   (ej: 3 días)
7. Estado:
       CRÍTICO  si autonomía ≤ días de entrega del proveedor + margen
       ALERTA   si autonomía ≤ eso + 2 días
       OK       si no
8. Si queda CRÍTICO y no hay pedido pendiente → WhatsApp automático al proveedor.
```

**Ejemplo:** Vasos (caja de 500). Cierres: 100% → 100% → 50% → 25%.
Consumo = 375 vasos en 3 días = **125 vasos/día**. Quedan 125 → **1 día** de autonomía.
El proveedor tarda 1 día + 1 de margen = 2 → **CRÍTICO** → se manda el WhatsApp. 📲

Casos que contempla: reposiciones (no las confunde con "consumo negativo"), días salteados
(local cerrado el domingo), mercadería que llega después del cierre, insumos sin historial.

---

## 🔌 API REST

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del server y modo WhatsApp |
| GET | `/api/locales` | Locales |
| GET | `/api/locales/:id/insumos` | Insumos con burn rate, autonomía y estado |
| POST | `/api/locales/:id/cierres` | Cierre de turno `{ items: [{ insumoId, nivel }] }` → dispara pedidos |
| POST | `/api/insumos/:id/reposiciones` | "Llegó el pedido" |
| GET | `/api/locales/:id/pedidos` | Historial de WhatsApps |
| POST | `/api/demo/reset` | Reinicia los datos de demo |

Probalas desde VS Code abriendo `backend/api.http` → "Send Request".

---

## 📲 WhatsApp real con Twilio (opcional)

Por defecto los mensajes se **simulan** (se ven en la pestaña *Pedidos* y en la consola). Para mandarlos de verdad:

1. Creá una cuenta en [twilio.com](https://www.twilio.com) y activá el **WhatsApp Sandbox**.
2. Desde tu celular, mandá el código `join xxxx` al número del sandbox.
3. Copiá `backend/.env.example` como `backend/.env` y completá `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` y `TWILIO_WHATSAPP_FROM`.
4. Cambiá el WhatsApp de un proveedor por tu número (en `seedData.js`) y corré `npm run seed`.
5. Reiniciá `npm run dev` → la pestaña *Pedidos* dice **"WhatsApp: real (Twilio)"**.

---

## 🎤 Guion de demo para el jurado (2 minutos)

1. **Autonomía:** "Así ve el dueño su stock: días que le dura cada cosa." (Vasos en *Atención*.)
2. **Cierre:** "Son las 23 hs, el pibe de la caja está muerto. Toca Vasos → *Casi vacío*." → "El resto igual que ayer" → **Cerrar turno**. ⏱️ < 10 segundos.
3. **Resultado:** "Le avisamos a Packaging Express por WhatsApp." → pestaña **Pedidos**: el mensaje armado.
4. **Offline:** cortar el wifi, hacer otro cierre → "Guardado en la tablet". Volver el wifi → se sincroniza solo.
5. **Llegó el pedido:** en *Autonomía*, tocar "📦 Llegó el pedido" → vuelve a verde.
6. **Reiniciar demo** (abajo en *Autonomía*) para dejarlo listo para el próximo jurado.

---

## 🛣️ Próximos pasos

- [ ] Iconos definitivos del diseñador (reemplazar `InsumoIcon.jsx`) y testeo con encargados reales
- [ ] ABM de insumos y proveedores desde la app (hoy se cargan en `seedData.js`)
- [ ] Varios locales / login por PIN visual
- [ ] Webhook de Twilio para que el proveedor confirme respondiendo el WhatsApp
- [ ] Ventana de cálculo adaptable (3 días → 7 días cuando haya más historial)
