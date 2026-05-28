-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN: secciones_inventario
-- Ejecutar una sola vez en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS secciones_inventario (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    slug   VARCHAR(50)  NOT NULL UNIQUE,
    color  VARCHAR(7)   NOT NULL DEFAULT '#1a1a2e',
    orden  INT          NOT NULL DEFAULT 0
);

INSERT INTO secciones_inventario (nombre, slug, color, orden) VALUES
    ('Balanceados',  'balanceados',  '#1a1a2e', 1),
    ('Accesorios',   'accesorios',   '#0ea5e9', 2),
    ('Medicamentos', 'medicamentos', '#10b981', 3)
ON CONFLICT (slug) DO NOTHING;
