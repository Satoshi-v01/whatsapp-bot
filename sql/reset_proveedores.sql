-- ═══════════════════════════════════════════════════════════════
-- RESET PROVEEDORES
-- Elimina pagos, facturas de compra y proveedores.
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- Pagos primero (FK -> facturas_compra)
TRUNCATE TABLE pagos_facturas  RESTART IDENTITY CASCADE;

-- Facturas de compra
TRUNCATE TABLE facturas_compra RESTART IDENTITY CASCADE;

-- Proveedores
TRUNCATE TABLE proveedores     RESTART IDENTITY CASCADE;

COMMIT;
