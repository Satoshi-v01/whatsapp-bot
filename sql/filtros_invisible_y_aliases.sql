-- ═══════════════════════════════════════════════════════════════
-- Filtros: invisible + incluye_valores + fix labels tamano_raza
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Nuevas columnas en ecommerce_filtros_config
ALTER TABLE ecommerce_filtros_config
  ADD COLUMN IF NOT EXISTS invisible       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS incluye_valores TEXT[]  DEFAULT NULL;

-- 2. Limpiar labels de tamano_raza (sin kg)
UPDATE ecommerce_filtros_config SET label_valor = 'Mini'          WHERE campo = 'tamano_raza' AND valor = 'mini';
UPDATE ecommerce_filtros_config SET label_valor = 'Mediano'       WHERE campo = 'tamano_raza' AND valor = 'medium';
UPDATE ecommerce_filtros_config SET label_valor = 'Grande / Maxi' WHERE campo = 'tamano_raza' AND valor = 'maxi';
UPDATE ecommerce_filtros_config SET label_valor = 'Todas las razas' WHERE campo = 'tamano_raza' AND valor = 'todas';

-- 3. Agregar "Medianos / Grandes" como opcion invisible
INSERT INTO ecommerce_filtros_config (campo, label, valor, label_valor, categorias, display_as, orden, invisible)
VALUES ('tamano_raza', 'Tamaño de raza', 'medianos_grandes', 'Medianos / Grandes', ARRAY['perros'], 'sidebar', 5, TRUE)
ON CONFLICT (campo, valor) DO UPDATE
  SET label_valor = 'Medianos / Grandes', invisible = TRUE, orden = 5;

-- 4. Cuando el cliente filtra por Mediano o Grande, tambien mostrar "Medianos / Grandes"
UPDATE ecommerce_filtros_config
SET incluye_valores = ARRAY['medianos_grandes']
WHERE campo = 'tamano_raza' AND valor IN ('medium', 'maxi');
