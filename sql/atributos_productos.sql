-- ═══════════════════════════════════════════════════════════════
-- ATRIBUTOS DINÁMICOS DE PRODUCTOS PARA ECOMMERCE
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Columna JSONB en productos para atributos dinámicos
--    Ejemplo: {"etapa_vida": "adulto", "tamano_raza": "medium", "tipo_alimento": "seco"}
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS atributos JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_productos_atributos
  ON productos USING GIN (atributos);

-- 2. Tabla de configuración de filtros del ecommerce
--    Define qué filtros existen, sus valores, para qué categorías aplican
--    y cómo se muestran (chip arriba del grid o sidebar lateral)
CREATE TABLE IF NOT EXISTS ecommerce_filtros_config (
  id          SERIAL PRIMARY KEY,
  campo       VARCHAR(50)  NOT NULL,              -- clave interna: 'etapa_vida'
  label       VARCHAR(100) NOT NULL,              -- texto visible: 'Etapa de vida'
  valor       VARCHAR(100) NOT NULL,              -- valor guardado: 'adulto'
  label_valor VARCHAR(150) NOT NULL,              -- texto visible: 'Adulto'
  categorias  TEXT[]       DEFAULT NULL,          -- NULL = todas; ['perros','gatos'] = solo esas
  display_as  VARCHAR(20)  DEFAULT 'sidebar',     -- 'chip' o 'sidebar'
  orden       INT          DEFAULT 0,
  UNIQUE (campo, valor)
);

-- 3. Valores por defecto
INSERT INTO ecommerce_filtros_config
  (campo, label, valor, label_valor, categorias, display_as, orden)
VALUES
  -- Etapa de vida (chips, perros y gatos)
  ('etapa_vida', 'Etapa de vida', 'cachorro',  'Cachorro',                ARRAY['perros','gatos'], 'chip',    1),
  ('etapa_vida', 'Etapa de vida', 'adulto',    'Adulto',                  ARRAY['perros','gatos'], 'chip',    2),
  ('etapa_vida', 'Etapa de vida', 'senior',    'Senior',                  ARRAY['perros','gatos'], 'chip',    3),
  ('etapa_vida', 'Etapa de vida', 'gestante',  'Gestante / Lactante',     ARRAY['perros'],         'chip',    4),
  ('etapa_vida', 'Etapa de vida', 'castrado',  'Castrado / Esterilizado', ARRAY['gatos'],          'chip',    5),

  -- Tamaño de raza (sidebar, solo perros)
  ('tamano_raza', 'Tamaño de raza', 'mini',   'Mini / Pequeño (hasta 10 kg)', ARRAY['perros'], 'sidebar', 1),
  ('tamano_raza', 'Tamaño de raza', 'medium', 'Mediano (10 - 25 kg)',          ARRAY['perros'], 'sidebar', 2),
  ('tamano_raza', 'Tamaño de raza', 'maxi',   'Grande / Maxi (+ de 25 kg)',    ARRAY['perros'], 'sidebar', 3),
  ('tamano_raza', 'Tamaño de raza', 'todas',  'Todas las razas',               ARRAY['perros'], 'sidebar', 4),

  -- Tipo de alimento (sidebar, perros y gatos)
  ('tipo_alimento', 'Tipo de alimento', 'seco',       'Alimento seco',    ARRAY['perros','gatos'], 'sidebar', 1),
  ('tipo_alimento', 'Tipo de alimento', 'humedo',     'Alimento húmedo',  ARRAY['perros','gatos'], 'sidebar', 2),
  ('tipo_alimento', 'Tipo de alimento', 'snack',      'Snack / Premio',   ARRAY['perros','gatos'], 'sidebar', 3),
  ('tipo_alimento', 'Tipo de alimento', 'suplemento', 'Suplemento',       ARRAY['perros','gatos'], 'sidebar', 4)

ON CONFLICT (campo, valor) DO NOTHING;
