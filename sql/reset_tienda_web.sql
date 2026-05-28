-- ═══════════════════════════════════════════════════════════════
-- RESET TIENDA WEB
-- Elimina pedidos web, cuentas de clientes ecommerce, banners,
-- subcategorias, mascotas, direcciones, fichas de facturacion
-- y configuracion de la tienda.
-- Los clientes en la tabla "clientes" NO se tocan.
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- Items de pedidos web (primero por FK)
DELETE FROM ordenes_pedido_items
WHERE orden_id IN (
  SELECT id FROM ordenes_pedido WHERE canal = 'pagina_web'
);

-- Pedidos web
DELETE FROM ordenes_pedido WHERE canal = 'pagina_web';

-- Cuentas de usuarios ecommerce
TRUNCATE TABLE ecommerce_usuarios RESTART IDENTITY CASCADE;

-- Perfil de clientes web (mascotas, direcciones, fichas)
TRUNCATE TABLE ecommerce_mascotas           RESTART IDENTITY CASCADE;
TRUNCATE TABLE ecommerce_direcciones        RESTART IDENTITY CASCADE;
TRUNCATE TABLE ecommerce_fichas_facturacion RESTART IDENTITY CASCADE;

-- Banners y subcategorias web
TRUNCATE TABLE ecommerce_banners       RESTART IDENTITY CASCADE;
TRUNCATE TABLE ecommerce_subcategorias RESTART IDENTITY CASCADE;

-- Configuracion de la tienda (imagenes de categoria, textos, etc.)
TRUNCATE TABLE tienda_config RESTART IDENTITY CASCADE;

COMMIT;

-- Nota: los registros en "clientes" con canal_origen = 'ecommerce'
-- NO se eliminan. Si tambien queres borrarlos, ejecuta:
-- DELETE FROM clientes WHERE canal_origen = 'ecommerce';
