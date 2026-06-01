-- ═══════════════════════════════════════════════════════════════
-- Link subcategorias de inventario con el ecommerce
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE subcategorias
  ADD COLUMN IF NOT EXISTS ecommerce_categoria VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ecommerce_campo     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ecommerce_valor     VARCHAR(100);

-- Backfill: productos que ya tienen subcategoria asignada
-- reciben automaticamente ecommerce_categoria y atributos
UPDATE productos p
SET
  ecommerce_categoria = COALESCE(sc.ecommerce_categoria, p.ecommerce_categoria),
  atributos = CASE
    WHEN sc.ecommerce_campo IS NOT NULL AND sc.ecommerce_valor IS NOT NULL
    THEN jsonb_build_object(sc.ecommerce_campo, sc.ecommerce_valor)
    ELSE COALESCE(p.atributos, '{}')
  END
FROM subcategorias sc
WHERE p.subcategoria_id = sc.id
  AND (sc.ecommerce_categoria IS NOT NULL OR (sc.ecommerce_campo IS NOT NULL AND sc.ecommerce_valor IS NOT NULL));
