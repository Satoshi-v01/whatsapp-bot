-- ============================================================
-- MIGRACIÓN: Sistema de doble precio (efectivo/transferencia y tarjeta)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar precio_tarjeta a presentaciones
ALTER TABLE presentaciones
  ADD COLUMN IF NOT EXISTS precio_tarjeta INTEGER;

-- ============================================================
-- FIN
-- ============================================================
