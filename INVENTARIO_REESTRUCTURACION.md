# Reestructuracion del Inventario — Pestanas tipo Chrome

## Objetivo
Reemplazar la vista actual (acordeon Marca → Categoria → Productos) por pestanas tipo Chrome que
discriminen los productos por tipo: **Balanceados**, **Accesorios**, **Medicamentos**.
Cada pestana tiene su propio set de campos y filtros.

---

## Modelo de datos por pestana

### Balanceados
| Campo         | Tipo/Opciones                                           |
|---------------|----------------------------------------------------------|
| Marca         | dropdown → tabla `marcas`                               |
| Calidad       | standard / premium / premium_special / super_premium    |
| Especie       | perro / gato / ambos                                    |
| Subcategoria  | mini / maxi / cachorro / senior / toy (tabla `subcategorias` con `seccion = 'balanceados'`) |
| Nombre        | texto libre                                              |
| SKU           | codigo interno                                           |
| Descripcion   | texto libre                                              |

> Calidad es EXCLUSIVA de Balanceados. No aplica a Accesorios ni Medicamentos.

### Accesorios
| Campo         | Tipo/Opciones                                           |
|---------------|----------------------------------------------------------|
| Marca         | dropdown → tabla `marcas`                               |
| Categoria     | collar / correa / ropa / cama / juguete / bowl / higiene (tabla `categorias` con `seccion = 'accesorios'`) |
| Especie       | perro / gato / ambos                                    |
| Tamanho       | XS / S / M / L / XL / unico (campo `subcategoria_id` con `seccion = 'accesorios'` o campo libre) |
| Nombre        | texto libre                                              |
| SKU           | codigo interno                                           |
| Descripcion   | texto libre                                              |

### Medicamentos
| Campo         | Tipo/Opciones                                           |
|---------------|----------------------------------------------------------|
| Marca         | dropdown → tabla `marcas`                               |
| Nombre        | texto libre                                              |
| Uso / Tipo    | antipulgas / desparasitante / vitaminas / antibiotico / antiinflamatorio / otro (tabla `categorias` con `seccion = 'medicamentos'`) |
| SKU           | codigo interno                                           |
| Descripcion   | texto libre                                              |

---

## Mapeo a columnas de BD

| Campo UI           | Columna BD                        | Tabla         |
|--------------------|-----------------------------------|---------------|
| Pestana / seccion  | `ecommerce_categoria`             | productos     |
| Marca              | `marca_id`                        | productos     |
| Calidad            | `calidad`                         | productos     |
| Especie            | `especie`                         | productos     |
| Subcategoria/Tama. | `subcategoria_id`                 | productos     |
| Categoria          | `categoria_id`                    | productos     |
| Uso/Tipo           | `categoria_id`                    | productos     |
| SKU                | `sku`                             | productos     |
| Descripcion        | `descripcion`                     | productos     |

---

## Migracion SQL requerida (Supabase)

```sql
-- 1. Tabla marcas
CREATE TABLE IF NOT EXISTS marcas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    disponible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Columna seccion en categorias
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS seccion VARCHAR(50);

-- 3. Tabla subcategorias
CREATE TABLE IF NOT EXISTS subcategorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    seccion VARCHAR(50),
    disponible BOOLEAN DEFAULT true
);

-- 4. Columnas nuevas en productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS marca_id INTEGER REFERENCES marcas(id);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS subcategoria_id INTEGER REFERENCES subcategorias(id);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS sku VARCHAR(80);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS especie VARCHAR(20);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS ecommerce_categoria VARCHAR(50);

-- 5. Columnas nuevas en presentaciones
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS precio_venta INTEGER;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS precio_compra INTEGER;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS precio_descuento INTEGER;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS precio_compra_descuento INTEGER;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS descuento_activo BOOLEAN DEFAULT false;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS descuento_desde TIMESTAMP;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS descuento_hasta TIMESTAMP;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS descuento_stock INTEGER;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(100);

-- Migrar precio existente a precio_venta
UPDATE presentaciones SET precio_venta = precio WHERE precio_venta IS NULL;

-- 6. Datos iniciales subcategorias balanceados
INSERT INTO subcategorias (nombre, seccion) VALUES
    ('Mini', 'balanceados'), ('Maxi', 'balanceados'),
    ('Cachorro', 'balanceados'), ('Senior', 'balanceados'),
    ('Toy', 'balanceados'), ('Mediano', 'balanceados')
ON CONFLICT DO NOTHING;

-- 7. Datos iniciales categorias accesorios
INSERT INTO categorias (nombre, seccion) VALUES
    ('Collar', 'accesorios'), ('Correa', 'accesorios'),
    ('Ropa', 'accesorios'), ('Cama', 'accesorios'),
    ('Juguete', 'accesorios'), ('Bowl', 'accesorios'),
    ('Higiene', 'accesorios')
ON CONFLICT DO NOTHING;

-- 8. Datos iniciales subcategorias accesorios (tamanhos)
INSERT INTO subcategorias (nombre, seccion) VALUES
    ('XS', 'accesorios'), ('S', 'accesorios'),
    ('M', 'accesorios'), ('L', 'accesorios'),
    ('XL', 'accesorios'), ('Unico', 'accesorios')
ON CONFLICT DO NOTHING;

-- 9. Datos iniciales categorias medicamentos
INSERT INTO categorias (nombre, seccion) VALUES
    ('Antipulgas', 'medicamentos'), ('Desparasitante', 'medicamentos'),
    ('Vitaminas', 'medicamentos'), ('Antibiotico', 'medicamentos'),
    ('Antiinflamatorio', 'medicamentos'), ('Otro', 'medicamentos')
ON CONFLICT DO NOTHING;
```

---

## Lista de tareas

### Fase 1 — Base de datos
- [x] Backend routes para `marcas` (GET, POST, DELETE) — `src/routes/productos.js`
- [x] Backend routes para `subcategorias` (GET, POST, PATCH, DELETE) — `src/routes/productos.js`
- [x] Backend route `GET /productos` JOIN marcas y subcategorias
- [x] Backend route `GET /categorias?seccion=` y `GET /subcategorias?seccion=`
- [x] Backend route `POST /productos` acepta marca_id, subcategoria_id, sku, especie, ecommerce_categoria
- [x] Backend route `PATCH /productos/:id` acepta los mismos campos
- [ ] **Ejecutar migracion SQL en Supabase** (bloque SQL de arriba — requiere permiso del cliente)

### Fase 2 — Frontend: pestanas Chrome
- [x] State del formulario incluye marca_id, sku, especie, ecommerce_categoria, calidad
- [x] Agregar estado `pestanaActiva` ('balanceados' | 'accesorios' | 'medicamentos')
- [x] Render del componente de pestanas arriba del buscador (con contador por tab)
- [x] Filtrar `productosFiltrados` segun `pestanaActiva` usando `p.ecommerce_categoria`
- [x] Vista agrupada: en Balanceados agrupar por Marca → Subcategoria, en Accesorios por Marca → Categoria, en Medicamentos por Marca → Uso
- [x] Columnas de tabla distintas por pestana (Calidad y Especie solo donde aplica)

### Fase 3 — Frontend: formulario crear/editar por pestana
- [x] Modal "Nuevo Producto" muestra campos distintos segun `pestanaActiva`:
  - Balanceados: Marca, Calidad, Especie, Subcategoria (mini/maxi/etc), Nombre, SKU, Desc.
  - Accesorios: Marca, Categoria (collar/etc), Especie, Tamanho (XS/S/M/etc), Nombre, SKU, Desc.
  - Medicamentos: Marca, Uso/Tipo (antipulgas/etc), Nombre, SKU, Desc.
- [x] Modal "Editar Producto" igual logica de campos por pestana
- [x] Autocompletar `ecommerce_categoria` segun pestana activa al crear
- [x] Dropdowns de Subcategoria y Categoria filtrados por `seccion` en memoria

### Fase 4 — Frontend: gestion de subcategorias en UI
- [x] Agregar boton "Subcategorias" en header (junto a Marcas y Categorias)
- [x] Modal para CRUD de subcategorias con filtro por seccion activa

### Fase 5 — Backend: endpoint subcategorias con servicio frontend
- [x] `dashboard/src/services/productos.js`: agregar `getSubcategorias`, `crearSubcategoria`, `editarSubcategoria`, `verificarEliminarSubcategoria`, `confirmarEliminarSubcategoria`

---

## Estado actual (2026-05-09)
- Backend rutas: **COMPLETO**
- Migracion BD Supabase: **PENDIENTE** (requiere permiso del cliente — SQL listo en este archivo)
- Frontend pestanas UI: **COMPLETO**
- Formularios por pestana: **COMPLETO**
- Servicio subcategorias frontend: **COMPLETO**
- Modal subcategorias: **COMPLETO**

---

## Archivos clave
| Archivo                                         | Rol                                |
|-------------------------------------------------|------------------------------------|
| `src/routes/productos.js`                       | Backend CRUD productos/marcas/subs |
| `dashboard/src/pages/Inventario.jsx`            | UI inventario (1109 lineas)        |
| `dashboard/src/services/productos.js`           | Llamadas API frontend              |
| `src/db/schema.sql`                             | Schema base (no actualizado aun)   |




Failed to run sql query: ERROR:  42703: column "precio" does not exist                                       
  LINE 40: UPDATE presentaciones SET precio_venta = precio WHERE precio_venta IS NULL;                         
  ESO ME SALE EN SUPABASE,                                                                                     
  PERO ASI TENGO ARMADO TODO                                                                                   
  | table_name                   |                                                                             
  | ---------------------------- |                                                                             
  | categorias                   |                                                                             
  | clientes                     |                                                                             
  | clientes_stats               |                                                                             
  | configuracion                |                                                                             
  | deliveries                   |                                                                             
  | ecommerce_banners            |                                                                             
  | ecommerce_direcciones        |                                                                             
  | ecommerce_fichas_facturacion |                                                                             
  | ecommerce_mascotas           |                                                                             
  | ecommerce_subcategorias      |                                                                             
  | ecommerce_usuarios           |                                                                             
  | facturas_compra              |                                                                             
  | logs_auditoria               |                                                                             
  | lotes                        |                                                                             
  | marcas                       |                                                                             
  | mensajes                     |                                                                             
  | novedades_delivery           |                                                                             
  | ordenes_pedido               |                                                                             
  | ordenes_pedido_items         |                                                                             
  | pagos_cuenta_corriente       |                                                                             
  | pagos_facturas               |                                                                             
  | presentaciones               |                                                                             
  | productos                    |                                                                             
  | proveedores                  |                                                                             
  | reservas_carrito             |                                                                             
  | roles                        |                                                                             
  | sesiones                     |                                                                             
  | tienda_config                |                                                                             
  | transformaciones_stock       |                                                                             
  | usuarios                     |                                                                             
  | ventas                       |                                                                             
  | ventas_items                 |                                                                             
  | zonas_delivery               |          
  y ejecute esto

  -- 1. Tabla marcas
CREATE TABLE IF NOT EXISTS marcas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    disponible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Columna seccion en categorias
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS seccion VARCHAR(50);

-- 3. Tabla subcategorias
CREATE TABLE IF NOT EXISTS subcategorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    seccion VARCHAR(50),
    disponible BOOLEAN DEFAULT true
);

-- 4. Columnas nuevas en productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS marca_id INTEGER REFERENCES marcas(id);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS subcategoria_id INTEGER REFERENCES subcategorias(id);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS sku VARCHAR(80);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS especie VARCHAR(20);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS ecommerce_categoria VARCHAR(50);

-- 5. Columnas nuevas en presentaciones
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS precio_venta INTEGER;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS precio_compra INTEGER;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS precio_descuento INTEGER;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS precio_compra_descuento INTEGER;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS descuento_activo BOOLEAN DEFAULT false;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS descuento_desde TIMESTAMP;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS descuento_hasta TIMESTAMP;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS descuento_stock INTEGER;
ALTER TABLE presentaciones ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(100);

-- ----------------------------------------------------------------------------------
-- ATENCIÓN AQUÍ: He comentado esta línea para que el script corra sin errores. 
-- Si tienes una columna con el precio anterior, descoméntala y cambia "nombre_de_tu_columna_vieja"
-- 
-- UPDATE presentaciones SET precio_venta = nombre_de_tu_columna_vieja WHERE precio_venta IS NULL;
-- ----------------------------------------------------------------------------------

-- 6. Datos iniciales subcategorias balanceados
INSERT INTO subcategorias (nombre, seccion) VALUES
    ('Mini', 'balanceados'), ('Maxi', 'balanceados'),
    ('Cachorro', 'balanceados'), ('Senior', 'balanceados'),
    ('Toy', 'balanceados'), ('Mediano', 'balanceados')
ON CONFLICT DO NOTHING;

-- 7. Datos iniciales categorias accesorios
INSERT INTO categorias (nombre, seccion) VALUES
    ('Collar', 'accesorios'), ('Correa', 'accesorios'),
    ('Ropa', 'accesorios'), ('Cama', 'accesorios'),
    ('Juguete', 'accesorios'), ('Bowl', 'accesorios'),
    ('Higiene', 'accesorios')
ON CONFLICT DO NOTHING;

-- 8. Datos iniciales subcategorias accesorios (tamanhos)
INSERT INTO subcategorias (nombre, seccion) VALUES
    ('XS', 'accesorios'), ('S', 'accesorios'),
    ('M', 'accesorios'), ('L', 'accesorios'),
    ('XL', 'accesorios'), ('Unico', 'accesorios')
ON CONFLICT DO NOTHING;

-- 9. Datos iniciales categorias medicamentos
INSERT INTO categorias (nombre, seccion) VALUES
    ('Antipulgas', 'medicamentos'), ('Desparasitante', 'medicamentos'),
    ('Vitaminas', 'medicamentos'), ('Antibiotico', 'medicamentos'),
    ('Antiinflamatorio', 'medicamentos'), ('Otro', 'medicamentos')
ON CONFLICT DO NOTHING;