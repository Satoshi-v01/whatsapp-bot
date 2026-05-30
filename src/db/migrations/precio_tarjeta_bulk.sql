-- Carga masiva de precio_tarjeta para productos existentes
-- Ajusta el porcentaje (1.065 = 6.5%) antes de ejecutar
-- Solo actualiza presentaciones que aún no tienen precio_tarjeta

UPDATE presentaciones
SET precio_tarjeta = ROUND(precio_venta * 1.065)
WHERE precio_tarjeta IS NULL
  AND precio_venta IS NOT NULL;
