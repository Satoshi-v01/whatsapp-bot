-- ============================================================
-- MIGRACIÓN: Trazabilidad completa orden -> ventas (1 a N)
-- Ejecutar en Supabase SQL Editor
--
-- ordenes_pedido.venta_id sigue existiendo (venta "principal", primera
-- linea) para no romper nada que ya lo lea. Esta tabla nueva registra
-- TODAS las ventas generadas al procesar una orden con varios productos,
-- que antes se perdian (solo se guardaba la primera).
-- ============================================================

CREATE TABLE IF NOT EXISTS ordenes_pedido_ventas (
  id SERIAL PRIMARY KEY,
  orden_id INTEGER NOT NULL REFERENCES ordenes_pedido(id),
  venta_id INTEGER NOT NULL REFERENCES ventas(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (venta_id)
);

CREATE INDEX IF NOT EXISTS idx_ordenes_pedido_ventas_orden ON ordenes_pedido_ventas(orden_id);

-- ============================================================
-- FIN
-- ============================================================
