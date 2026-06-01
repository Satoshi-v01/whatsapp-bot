-- ============================================================
-- RESET DE PRODUCTOS DEL INVENTARIO — Sosa Bulls
-- Ejecutar en Supabase SQL Editor
--
-- ELIMINA:  lotes, transformaciones_stock, presentaciones,
--           productos (y las referencias en ventas/pedidos)
--
-- CONSERVA: categorias, subcategorias, marcas
--           (para no tener que recrgarlas)
--
-- IMPORTANTE: correr reset_datos_prueba.sql primero si hay
--             ventas/pedidos activos, o usar este script solo
--             (incluye limpieza de referencias).
-- ============================================================

BEGIN;

-- ── 1. REFERENCIAS EN VENTAS Y PEDIDOS ───────────────────────
-- Necesario porque ventas_items y ordenes_pedido_items
-- referencian presentaciones con FK.
TRUNCATE TABLE ventas_items          CASCADE;
TRUNCATE TABLE ventas                CASCADE;
TRUNCATE TABLE ordenes_pedido_items  CASCADE;
TRUNCATE TABLE ordenes_pedido        CASCADE;
TRUNCATE TABLE reservas_carrito      CASCADE;
TRUNCATE TABLE deliveries            CASCADE;

-- ── 2. LOTES Y TRANSFORMACIONES ──────────────────────────────
TRUNCATE TABLE transformaciones_stock CASCADE;
TRUNCATE TABLE lotes                  CASCADE;

-- ── 3. PRESENTACIONES Y PRODUCTOS ────────────────────────────
TRUNCATE TABLE presentaciones CASCADE;
TRUNCATE TABLE productos      CASCADE;

-- ── 4. REINICIAR SECUENCIAS ──────────────────────────────────
ALTER SEQUENCE IF EXISTS productos_id_seq           RESTART WITH 1;
ALTER SEQUENCE IF EXISTS presentaciones_id_seq      RESTART WITH 1;
ALTER SEQUENCE IF EXISTS lotes_id_seq               RESTART WITH 1;
ALTER SEQUENCE IF EXISTS transformaciones_stock_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS ventas_id_seq              RESTART WITH 1;
ALTER SEQUENCE IF EXISTS ventas_items_id_seq        RESTART WITH 1;
ALTER SEQUENCE IF EXISTS ordenes_pedido_id_seq      RESTART WITH 1;
ALTER SEQUENCE IF EXISTS deliveries_id_seq          RESTART WITH 1;

COMMIT;

-- ============================================================
-- Verificacion (correr despues del COMMIT)
-- ============================================================
SELECT 'productos'             AS tabla, COUNT(*) AS filas FROM productos
UNION ALL
SELECT 'presentaciones',                COUNT(*)           FROM presentaciones
UNION ALL
SELECT 'lotes',                         COUNT(*)           FROM lotes
UNION ALL
SELECT 'transformaciones_stock',        COUNT(*)           FROM transformaciones_stock
UNION ALL
SELECT 'ventas',                        COUNT(*)           FROM ventas
UNION ALL
SELECT 'ventas_items',                  COUNT(*)           FROM ventas_items
UNION ALL
SELECT 'ordenes_pedido',                COUNT(*)           FROM ordenes_pedido
UNION ALL
SELECT 'categorias (conservadas)',      COUNT(*)           FROM categorias
UNION ALL
SELECT 'marcas (conservadas)',          COUNT(*)           FROM marcas;
