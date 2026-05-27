-- Usuarios del ecommerce (clientes con cuenta)
CREATE TABLE IF NOT EXISTS ecommerce_usuarios (
  id             SERIAL PRIMARY KEY,
  cliente_id     INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  activo         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  ultimo_acceso  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_usuarios_email ON ecommerce_usuarios(email);
CREATE INDEX IF NOT EXISTS idx_ecommerce_usuarios_cliente ON ecommerce_usuarios(cliente_id);

-- Mascotas del cliente
CREATE TABLE IF NOT EXISTS ecommerce_mascotas (
  id               SERIAL PRIMARY KEY,
  cliente_id       INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre           TEXT NOT NULL,
  especie          TEXT NOT NULL DEFAULT 'perro',
  raza             TEXT,
  peso_kg          DECIMAL(5,2),
  fecha_nacimiento DATE,
  notas            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_mascotas_cliente ON ecommerce_mascotas(cliente_id);

-- Direcciones guardadas del cliente
CREATE TABLE IF NOT EXISTS ecommerce_direcciones (
  id           SERIAL PRIMARY KEY,
  cliente_id   INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  alias        TEXT NOT NULL DEFAULT 'Casa',
  calle        TEXT NOT NULL,
  ciudad       TEXT NOT NULL DEFAULT 'Asuncion',
  barrio       TEXT,
  referencia   TEXT,
  es_principal BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_direcciones_cliente ON ecommerce_direcciones(cliente_id);

-- Fichas de facturacion del cliente
CREATE TABLE IF NOT EXISTS ecommerce_fichas_facturacion (
  id           SERIAL PRIMARY KEY,
  cliente_id   INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  alias        TEXT,
  nombre       TEXT NOT NULL,
  ruc          TEXT,
  telefono     TEXT,
  email        TEXT,
  es_principal BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_fichas_cliente ON ecommerce_fichas_facturacion(cliente_id);
