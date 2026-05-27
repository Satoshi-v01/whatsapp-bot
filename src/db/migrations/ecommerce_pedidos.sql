-- MIGRACIÓN: Columnas requeridas por el flujo de pedidos del ecommerce
-- Ejecutar en Supabase SQL Editor (es seguro correr más de una vez)

ALTER TABLE ordenes_pedido
  ADD COLUMN IF NOT EXISTS numero_pedido TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS tipo_entrega  VARCHAR(20) DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS maps_url      TEXT;
