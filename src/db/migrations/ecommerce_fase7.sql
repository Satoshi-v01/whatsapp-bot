-- ============================================================
-- MIGRACIÓN: Fase 7 — Integración Dashboard ↔ Ecommerce
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar tipo_entrega a ordenes_pedido (si no existe)
ALTER TABLE ordenes_pedido
  ADD COLUMN IF NOT EXISTS tipo_entrega VARCHAR(20) DEFAULT 'delivery';

-- 2. Tabla de configuración de la tienda
CREATE TABLE IF NOT EXISTS tienda_config (
  id         SERIAL PRIMARY KEY,
  clave      VARCHAR(100) UNIQUE NOT NULL,
  valor      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Settings iniciales (no pisa valores existentes)
INSERT INTO tienda_config (clave, valor) VALUES
  ('whatsapp',        '595981000000'),
  ('nombre_tienda',   'Sosa Bulls'),
  ('delivery_activo', 'true'),
  ('retiro_activo',   'true'),
  ('zona_cobertura',  'Asunción y Gran Asunción'),
  ('horario',         'Lun-Sab 8:00 - 18:00'),
  ('mensaje_retiro',  'Hola, quiero retirar mi pedido en el local.')
ON CONFLICT (clave) DO NOTHING;

-- 4. Tabla de banners del ecommerce (ya creada en ecommerce_banners.sql,
--    incluida aquí por si se ejecuta este archivo solo)
CREATE TABLE IF NOT EXISTS ecommerce_banners (
  id         SERIAL PRIMARY KEY,
  titulo     VARCHAR(200) NOT NULL,
  subtitulo  TEXT,
  badge      VARCHAR(50),
  cta_texto  VARCHAR(100),
  cta_url    VARCHAR(500),
  imagen_url TEXT,
  orden      INTEGER DEFAULT 0,
  activo     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Columnas ecommerce en productos (si no existen)
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS es_destacado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS es_novedad   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS imagen_url   TEXT;

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
