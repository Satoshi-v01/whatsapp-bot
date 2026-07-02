-- ============================================================
-- MIGRACIÓN: Trazabilidad de precio especial en ventas_items
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Marca si el item se vendió con un precio distinto al de catálogo
ALTER TABLE ventas_items
  ADD COLUMN IF NOT EXISTS es_precio_especial BOOLEAN NOT NULL DEFAULT false;

-- 2. Diferencia entre el precio de catálogo y el precio cobrado (positivo = descuento otorgado)
ALTER TABLE ventas_items
  ADD COLUMN IF NOT EXISTS diferencial_precio INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- FIN
-- ============================================================
