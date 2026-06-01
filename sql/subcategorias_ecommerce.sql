-- ═══════════════════════════════════════════════════════════════
-- SUBCATEGORIAS ECOMMERCE — insertar datos por defecto
-- Ejecutar en Supabase SQL Editor
-- Si ya existen, no duplica (ON CONFLICT DO NOTHING)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ecommerce_subcategorias (nombre, slug, categoria_slug, orden) VALUES
  -- PERROS
  ('Cachorro',         'cachorro',      'perros', 1),
  ('Adulto Mini',      'adulto-mini',   'perros', 2),
  ('Adulto Medium',    'adulto-medium', 'perros', 3),
  ('Adulto Maxi',      'adulto-maxi',   'perros', 4),
  ('Senior',           'senior',        'perros', 5),
  ('Gestante',         'gestante',      'perros', 6),

  -- GATOS
  ('Kitten',           'kitten',        'gatos',  1),
  ('Adulto',           'adulto',        'gatos',  2),
  ('Castrado',         'castrado',      'gatos',  3),
  ('Indoor',           'indoor',        'gatos',  4),
  ('Senior',           'senior',        'gatos',  5),

  -- MEDICAMENTOS
  ('Antiparasitarios', 'antiparasitarios', 'medicamentos', 1),
  ('Vitaminas',        'vitaminas',        'medicamentos', 2),
  ('Dermocosméticos',  'dermocosmeticos',  'medicamentos', 3),
  ('Otros',            'otros',            'medicamentos', 4),

  -- ACCESORIOS
  ('Correas y Collares',       'correas',       'accesorios', 1),
  ('Camas y Descanso',         'camas',         'accesorios', 2),
  ('Comederos y Bebederos',    'comederos',     'accesorios', 3),
  ('Juguetes',                 'juguetes',      'accesorios', 4),
  ('Transportadoras',          'transportadoras','accesorios', 5),
  ('Ropa y Disfraces',         'ropa',          'accesorios', 6),

  -- CUIDADO
  ('Shampoos y Baño',          'shampoos',      'cuidado', 1),
  ('Cepillos y Grooming',      'grooming',      'cuidado', 2),
  ('Higiene Dental',           'dental',        'cuidado', 3),
  ('Desodorantes',             'desodorantes',  'cuidado', 4)

ON CONFLICT (slug, categoria_slug) DO NOTHING;
