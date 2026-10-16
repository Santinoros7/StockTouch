-- =========================================================
--  StockTouch · Esquema relacional del MVP (SQLite)
-- =========================================================
--  locales ──< insumos >── proveedores
--               │
--               ├──< registros_stock >── cierres ──> locales
--               └──< pedidos
-- =========================================================

PRAGMA foreign_keys = ON;

-- Un local gastronómico (cafetería, food truck, etc.)
CREATE TABLE IF NOT EXISTS locales (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Proveedores a los que se les pide por WhatsApp
CREATE TABLE IF NOT EXISTS proveedores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT NOT NULL,
  whatsapp      TEXT NOT NULL,              -- formato internacional: +5491112345678
  dias_entrega  INTEGER NOT NULL DEFAULT 1  -- cuántos días tarda en llegar un pedido
);

-- Insumos que se controlan al cierre (vasos, leche, café...)
CREATE TABLE IF NOT EXISTS insumos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id          INTEGER NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  proveedor_id      INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
  nombre            TEXT NOT NULL,          -- "Caja de Vasos"
  icono             TEXT NOT NULL,          -- clave del icono en el frontend: "vasos", "leche"...
  unidad            TEXT NOT NULL,          -- "vasos", "litros", "kg"
  capacidad         REAL NOT NULL,          -- cuánto hay cuando está LLENO (100%)
  cantidad_pedido   REAL NOT NULL,          -- cuánto se pide al proveedor
  margen_dias       INTEGER NOT NULL DEFAULT 1, -- colchón de seguridad extra
  orden             INTEGER NOT NULL DEFAULT 0
);

-- Un cierre de turno (agrupa los registros de ese momento)
CREATE TABLE IF NOT EXISTS cierres (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id    INTEGER NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  fecha       TEXT NOT NULL,                -- YYYY-MM-DD
  creado_en   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (local_id, fecha)
);

-- Cada lectura de stock: en un cierre (nivel visual) o una reposición (llegó mercadería)
CREATE TABLE IF NOT EXISTS registros_stock (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  insumo_id   INTEGER NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  cierre_id   INTEGER REFERENCES cierres(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('cierre', 'reposicion')),
  fecha       TEXT NOT NULL,                -- YYYY-MM-DD
  nivel       INTEGER,                      -- 0 | 25 | 50 | 100  (solo en cierres)
  cantidad    REAL NOT NULL,                -- cierre: lo que QUEDA · reposición: lo que ENTRÓ
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pedidos automáticos enviados (o simulados) al proveedor
CREATE TABLE IF NOT EXISTS pedidos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  insumo_id     INTEGER NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  proveedor_id  INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
  mensaje       TEXT NOT NULL,
  canal         TEXT NOT NULL,              -- 'simulado' | 'twilio'
  estado        TEXT NOT NULL,              -- 'enviado' | 'error' | 'recibido'
  detalle       TEXT,
  creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_registros_insumo_fecha ON registros_stock (insumo_id, fecha);
CREATE INDEX IF NOT EXISTS idx_pedidos_insumo ON pedidos (insumo_id, creado_en);
