-- Agregar numero_factura a la tabla ventas
-- Ejecutar en Supabase SQL Editor

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS numero_factura VARCHAR(50);
