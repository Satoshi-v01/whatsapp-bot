-- Migración: tabla ventas_items para soporte multi-producto por venta
-- Ejecutar una sola vez en la base de datos

CREATE TABLE IF NOT EXISTS ventas_items (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    presentacion_id INTEGER REFERENCES presentaciones(id),
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario INTEGER NOT NULL,
    precio_total INTEGER NOT NULL,
    tipo_iva VARCHAR(5) DEFAULT '10'
);

CREATE INDEX IF NOT EXISTS idx_ventas_items_venta_id ON ventas_items(venta_id);
