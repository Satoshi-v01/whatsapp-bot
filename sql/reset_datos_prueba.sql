-- ============================================================
-- RESET DE DATOS DE PRUEBA — Sosa Bulls
-- Ejecutar en Supabase SQL Editor
--
-- CONSERVA: productos, presentaciones (schema), categorias,
--            proveedores, usuarios, roles, configuracion,
--            auditoria, zonas, tienda_config, ecommerce_banners
--
-- ELIMINA:   ventas, lotes, pedidos ecommerce, clientes,
--            sesiones bot, carrito, cuenta corriente
-- ============================================================

BEGIN;

-- ── 1. ECOMMERCE: perfiles y datos de usuarios ──────────────
TRUNCATE TABLE ecommerce_fichas_facturacion CASCADE;
TRUNCATE TABLE ecommerce_mascotas          CASCADE;
TRUNCATE TABLE ecommerce_direcciones       CASCADE;
TRUNCATE TABLE ecommerce_usuarios          CASCADE;

-- ── 2. PEDIDOS ECOMMERCE ─────────────────────────────────────
TRUNCATE TABLE ordenes_pedido_items CASCADE;
TRUNCATE TABLE ordenes_pedido       CASCADE;
TRUNCATE TABLE reservas_carrito     CASCADE;

-- ── 3. VENTAS Y DELIVERIES ───────────────────────────────────
TRUNCATE TABLE ventas_items CASCADE;
TRUNCATE TABLE ventas       CASCADE;
TRUNCATE TABLE deliveries   CASCADE;

-- ── 4. LOTES E INVENTARIO ────────────────────────────────────
TRUNCATE TABLE lotes CASCADE;

-- Resetear stock de todas las presentaciones a 0
UPDATE presentaciones SET stock = 0;

-- ── 5. CUENTA CORRIENTE Y PAGOS ──────────────────────────────
TRUNCATE TABLE pagos_cuenta_corriente CASCADE;

-- ── 6. CLIENTES Y SESIONES BOT ───────────────────────────────
TRUNCATE TABLE sesiones CASCADE;
TRUNCATE TABLE clientes CASCADE;

-- ── 7. REINICIAR SECUENCIAS (IDs desde 1) ────────────────────
ALTER SEQUENCE IF EXISTS ventas_id_seq             RESTART WITH 1;
ALTER SEQUENCE IF EXISTS ventas_items_id_seq       RESTART WITH 1;
ALTER SEQUENCE IF EXISTS lotes_id_seq              RESTART WITH 1;
ALTER SEQUENCE IF EXISTS clientes_id_seq           RESTART WITH 1;
ALTER SEQUENCE IF EXISTS ordenes_pedido_id_seq     RESTART WITH 1;
ALTER SEQUENCE IF EXISTS deliveries_id_seq         RESTART WITH 1;

COMMIT;

-- ============================================================
-- Verificacion (correr despues del COMMIT)
-- ============================================================
SELECT 'ventas'           AS tabla, COUNT(*) FROM ventas
UNION ALL
SELECT 'ventas_items',       COUNT(*) FROM ventas_items
UNION ALL
SELECT 'lotes',              COUNT(*) FROM lotes
UNION ALL
SELECT 'clientes',           COUNT(*) FROM clientes
UNION ALL
SELECT 'sesiones',           COUNT(*) FROM sesiones
UNION ALL
SELECT 'ordenes_pedido',     COUNT(*) FROM ordenes_pedido
UNION ALL
SELECT 'deliveries',         COUNT(*) FROM deliveries
UNION ALL
SELECT 'reservas_carrito',   COUNT(*) FROM reservas_carrito
UNION ALL
SELECT 'stock_total',        SUM(stock) FROM presentaciones;
