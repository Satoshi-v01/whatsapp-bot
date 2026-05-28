-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN: secciones_inventario
-- Ejecutar una sola vez en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS secciones_inventario (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    slug   VARCHAR(50)  NOT NULL UNIQUE,
    color  VARCHAR(7)   NOT NULL DEFAULT '#1a1a2e',
    orden  INT          NOT NULL DEFAULT 0,
    tipo   VARCHAR(20)  NOT NULL DEFAULT 'generico'
    -- tipo: 'generico' | 'con_especie' | 'con_calidad_especie'
);

INSERT INTO secciones_inventario (nombre, slug, color, orden, tipo) VALUES
    ('Balanceados',  'balanceados',  '#1a1a2e', 1, 'con_calidad_especie'),
    ('Accesorios',   'accesorios',   '#0ea5e9', 2, 'con_especie'),
    ('Medicamentos', 'medicamentos', '#10b981', 3, 'generico')
ON CONFLICT (slug) DO NOTHING;

-- Si la tabla ya existe sin la columna tipo, ejecutar:
-- ALTER TABLE secciones_inventario ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'generico';
-- UPDATE secciones_inventario SET tipo = 'con_calidad_especie' WHERE slug = 'balanceados';
-- UPDATE secciones_inventario SET tipo = 'con_especie'         WHERE slug = 'accesorios';
