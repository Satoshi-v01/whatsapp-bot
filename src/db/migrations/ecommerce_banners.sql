-- Tabla para banners del ecommerce
-- Ejecutar en Supabase una sola vez

CREATE TABLE IF NOT EXISTS ecommerce_banners (
  id          SERIAL PRIMARY KEY,
  titulo      TEXT        NOT NULL,
  subtitulo   TEXT,
  cta_texto   TEXT,
  cta_url     TEXT,
  imagen_url  TEXT,
  badge       TEXT,
  activo      BOOLEAN     NOT NULL DEFAULT true,
  orden       INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indice para la query publica (activo + orden)
CREATE INDEX IF NOT EXISTS idx_ecommerce_banners_activo_orden
  ON ecommerce_banners (activo, orden);

-- Datos de ejemplo
INSERT INTO ecommerce_banners (titulo, subtitulo, cta_texto, cta_url, badge, orden)
VALUES
  ('Nutricion premium para tu mejor amigo',
   'Royal Canin, Purina Pro Plan y mas marcas lideres con envio a domicilio.',
   'Ver productos', '/categoria/perros', 'Novedad', 1),
  ('Todo lo que tu gato necesita',
   'Alimentos, accesorios y juguetes seleccionados para el bienestar felino.',
   'Explorar', '/categoria/gatos', NULL, 2),
  ('Ofertas de la semana',
   'Hasta 30% de descuento en productos seleccionados. Por tiempo limitado.',
   'Ver ofertas', '/categoria/ofertas', 'Oferta', 3)
ON CONFLICT DO NOTHING;

-- Columnas opcionales en productos (si no existen)
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS es_novedad  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS imagen_url  TEXT;

-- Columna canal_origen en clientes (si no existe)
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS canal_origen TEXT;

-- Columna numero_pedido en ordenes_pedido (si no existe)
ALTER TABLE ordenes_pedido
  ADD COLUMN IF NOT EXISTS numero_pedido TEXT UNIQUE;
