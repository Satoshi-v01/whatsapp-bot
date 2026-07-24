const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { autenticar, verificarPermiso } = require('../middleware/auth')
const { registrarLog } = require('../middleware/auditoria')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

// ─── Middleware auth clientes ecommerce ───────────────────────────
function autenticarCliente(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' })
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET)
    if (decoded.tipo !== 'ecommerce') {
      return res.status(401).json({ error: 'Token invalido' })
    }
    req.cliente = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalido o expirado' })
  }
}

// ─── Helpers ─────────────────────────────────────────────────
function toSlug(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildProductSlug(nombre, id) {
  return `${toSlug(nombre)}-${id}`
}

// ─── GET /api/ecommerce/banners ───────────────────────────────
router.get('/banners', async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT id, titulo, subtitulo, cta_texto, cta_url, imagen_url, badge
       FROM ecommerce_banners
       WHERE activo = true
       ORDER BY orden ASC`
    )
    res.json(resultado.rows)
  } catch (error) {
    // Si la tabla no existe aun, devolver array vacio
    if (error.code === '42P01') return res.json([])
    manejarError(res, error)
  }
})

// ─── GET /api/ecommerce/categorias ───────────────────────────
const SLUGS_VALIDOS = ['perros', 'gatos', 'accesorios', 'higiene', 'medicamentos', 'snacks', 'ofertas']

// SQL helpers — descuento activo y vigente en la presentación
const OFERTA_COND = `pr.descuento_activo = true AND pr.precio_descuento IS NOT NULL AND (pr.descuento_desde IS NULL OR pr.descuento_desde <= NOW()) AND (pr.descuento_hasta IS NULL OR pr.descuento_hasta >= NOW())`
const PRECIO_EF   = `CASE WHEN ${OFERTA_COND} THEN pr.precio_descuento ELSE pr.precio_venta END`
const PRECIO_OR   = `CASE WHEN ${OFERTA_COND} THEN pr.precio_venta ELSE NULL END`
// Precio web: usa precio_tarjeta si está cargado, sino el precio efectivo
const PRECIO_WEB  = `COALESCE(pr.precio_tarjeta, ${PRECIO_EF})`

router.get('/categorias', async (req, res) => {
  try {
    const [cats, ofertas, imgs] = await Promise.all([
      db.query(
        `SELECT
           p.ecommerce_categoria AS slug,
           COUNT(DISTINCT p.id) FILTER (
             WHERE pr.stock > 0 AND pr.disponible = true
           ) AS count
         FROM productos p
         LEFT JOIN presentaciones pr ON pr.producto_id = p.id
         WHERE p.ecommerce_categoria IS NOT NULL AND p.ecommerce_categoria != 'ofertas'
         GROUP BY p.ecommerce_categoria`
      ),
      // "ofertas" no es una categoria asignable: cuenta productos con descuento activo y vigente
      db.query(
        `SELECT COUNT(DISTINCT p.id) AS count
         FROM productos p
         JOIN presentaciones pr ON pr.producto_id = p.id
         WHERE pr.stock > 0 AND pr.disponible = true AND ${OFERTA_COND}`
      ),
      db.query(
        `SELECT clave, valor FROM tienda_config WHERE clave LIKE 'cat_imagen_%'`
      ).catch(() => ({ rows: [] })),
    ])
    const imagenes = {}
    imgs.rows.forEach(r => { imagenes[r.clave.replace('cat_imagen_', '')] = r.valor })
    const catMap = {}
    cats.rows.forEach(r => { catMap[r.slug] = r })
    res.json(SLUGS_VALIDOS.map(slug => ({
      slug,
      count: slug === 'ofertas' ? (ofertas.rows[0]?.count ?? 0) : (catMap[slug]?.count ?? 0),
      imagen_url: imagenes[slug] || null,
    })))
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── GET /api/ecommerce/subcategorias ────────────────────────
router.get('/subcategorias', async (req, res) => {
  try {
    const { categoria, especie } = req.query
    const condiciones = []
    const valores = []
    let i = 1
    if (categoria) { condiciones.push(`categoria_slug = $${i++}`); valores.push(categoria) }
    if (especie)   { condiciones.push(`(especie = $${i++} OR especie = 'ambos')`); valores.push(especie) }
    const resultado = await db.query(
      `SELECT id, nombre, slug, orden, categoria_slug, especie
       FROM ecommerce_subcategorias
       ${condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''}
       ORDER BY categoria_slug ASC, orden ASC, nombre ASC`,
      valores
    )
    res.json(resultado.rows)
  } catch (error) {
    if (error.code === '42P01') return res.json([])
    manejarError(res, error)
  }
})

// ─── ADMIN CRUD subcategorias ─────────────────────────────────
router.get('/admin/subcategorias', autenticar, verificarPermiso('ecommerce', 'ver'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nombre, slug, orden, categoria_slug, especie
       FROM ecommerce_subcategorias
       ORDER BY categoria_slug ASC, orden ASC, nombre ASC`
    )
    res.json(rows)
  } catch (error) {
    if (error.code === '42P01') return res.json([])
    manejarError(res, error)
  }
})

router.post('/admin/subcategorias', autenticar, verificarPermiso('ecommerce', 'crear'), async (req, res) => {
  try {
    const { nombre, categoria_slug, orden = 0, especie = 'ambos' } = req.body
    if (!nombre?.trim() || !categoria_slug?.trim())
      return res.status(400).json({ error: 'nombre y categoria_slug son requeridos' })
    if (categoria_slug.trim() === 'ofertas')
      return res.status(400).json({ error: "'ofertas' es una sección automática, no admite subcategorías" })
    if (!['perro', 'gato', 'ambos'].includes(especie))
      return res.status(400).json({ error: 'especie inválida' })
    const slug = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { rows } = await db.query(
      `INSERT INTO ecommerce_subcategorias (nombre, slug, categoria_slug, orden, especie)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nombre.trim(), slug, categoria_slug.trim(), parseInt(orden) || 0, especie]
    )
    res.json(rows[0])
  } catch (error) { manejarError(res, error) }
})

router.patch('/admin/subcategorias/:id', autenticar, verificarPermiso('ecommerce', 'editar'), async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, categoria_slug, orden, especie } = req.body
    if (categoria_slug === 'ofertas')
      return res.status(400).json({ error: "'ofertas' es una sección automática, no admite subcategorías" })
    if (especie !== undefined && !['perro', 'gato', 'ambos'].includes(especie))
      return res.status(400).json({ error: 'especie inválida' })
    const sets = []; const vals = []; let i = 1
    if (nombre !== undefined)        { sets.push(`nombre = $${i++}`);         vals.push(nombre.trim()) }
    if (categoria_slug !== undefined) { sets.push(`categoria_slug = $${i++}`); vals.push(categoria_slug.trim()) }
    if (orden !== undefined)          { sets.push(`orden = $${i++}`);          vals.push(parseInt(orden) || 0) }
    if (especie !== undefined)        { sets.push(`especie = $${i++}`);        vals.push(especie) }
    if (!sets.length) return res.status(400).json({ error: 'Nada que actualizar' })
    vals.push(parseInt(id))
    const { rows } = await db.query(`UPDATE ecommerce_subcategorias SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals)
    if (!rows.length) return res.status(404).json({ error: 'No encontrada' })
    res.json(rows[0])
  } catch (error) { manejarError(res, error) }
})

router.delete('/admin/subcategorias/:id', autenticar, verificarPermiso('ecommerce', 'eliminar'), async (req, res) => {
  try {
    const { id } = req.params
    await db.query(`UPDATE productos SET ecommerce_subcategoria_id = NULL WHERE ecommerce_subcategoria_id = $1`, [parseInt(id)])
    await db.query(`DELETE FROM ecommerce_subcategorias WHERE id = $1`, [parseInt(id)])
    res.json({ ok: true })
  } catch (error) { manejarError(res, error) }
})

// ─── ADMIN CRUD filtros config ────────────────────────────────
router.get('/admin/filtros-config', autenticar, verificarPermiso('ecommerce', 'ver'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, campo, label, valor, label_valor, categorias, display_as, orden, invisible, incluye_valores
       FROM ecommerce_filtros_config
       ORDER BY campo ASC, orden ASC`
    )
    res.json(rows)
  } catch (error) {
    if (error.code === '42P01') return res.json([])
    manejarError(res, error)
  }
})

router.post('/admin/filtros-config', autenticar, verificarPermiso('ecommerce', 'crear'), async (req, res) => {
  try {
    const { campo, label, valor, label_valor, categorias, display_as = 'sidebar', orden = 0, invisible = false, incluye_valores } = req.body
    if (!campo?.trim() || !label?.trim() || !valor?.trim() || !label_valor?.trim())
      return res.status(400).json({ error: 'campo, label, valor y label_valor son requeridos' })
    const { rows } = await db.query(
      `INSERT INTO ecommerce_filtros_config (campo, label, valor, label_valor, categorias, display_as, orden, invisible, incluye_valores)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (campo, valor) DO UPDATE
         SET label=$2, label_valor=$4, categorias=$5, display_as=$6, orden=$7, invisible=$8, incluye_valores=$9
       RETURNING *`,
      [campo.trim(), label.trim(), valor.trim(), label_valor.trim(),
       categorias?.length ? categorias : null, display_as, parseInt(orden) || 0,
       !!invisible, incluye_valores?.length ? incluye_valores : null]
    )
    res.json(rows[0])
  } catch (error) { manejarError(res, error) }
})

router.patch('/admin/filtros-config/:id', autenticar, verificarPermiso('ecommerce', 'editar'), async (req, res) => {
  try {
    const { id } = req.params
    const { campo, label, valor, label_valor, categorias, display_as, orden, invisible, incluye_valores } = req.body
    const sets = []; const vals = []; let i = 1
    if (campo !== undefined)           { sets.push(`campo = $${i++}`);           vals.push(campo.trim()) }
    if (label !== undefined)           { sets.push(`label = $${i++}`);           vals.push(label.trim()) }
    if (valor !== undefined)           { sets.push(`valor = $${i++}`);           vals.push(valor.trim()) }
    if (label_valor !== undefined)     { sets.push(`label_valor = $${i++}`);     vals.push(label_valor.trim()) }
    if (categorias !== undefined)      { sets.push(`categorias = $${i++}`);      vals.push(categorias?.length ? categorias : null) }
    if (display_as !== undefined)      { sets.push(`display_as = $${i++}`);      vals.push(display_as) }
    if (orden !== undefined)           { sets.push(`orden = $${i++}`);           vals.push(parseInt(orden) || 0) }
    if (invisible !== undefined)       { sets.push(`invisible = $${i++}`);       vals.push(!!invisible) }
    if (incluye_valores !== undefined) { sets.push(`incluye_valores = $${i++}`); vals.push(incluye_valores?.length ? incluye_valores : null) }
    if (!sets.length) return res.status(400).json({ error: 'Nada que actualizar' })
    vals.push(parseInt(id))
    const { rows } = await db.query(`UPDATE ecommerce_filtros_config SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals)
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' })
    res.json(rows[0])
  } catch (error) { manejarError(res, error) }
})

router.delete('/admin/filtros-config/:id', autenticar, verificarPermiso('ecommerce', 'eliminar'), async (req, res) => {
  try {
    await db.query(`DELETE FROM ecommerce_filtros_config WHERE id = $1`, [parseInt(req.params.id)])
    res.json({ ok: true })
  } catch (error) { manejarError(res, error) }
})

// ─── GET /api/ecommerce/productos ────────────────────────────
// Retorna PRODUCTOS agrupados (cada producto con sus presentaciones)
router.get('/productos', async (req, res) => {
  try {
    const {
      categoria,
      search,
      subcategoria_id,
      solo_disponibles = 'true',
      novedad,
      sort = 'relevancia',
      marca_id,
      precio_min,
      precio_max,
      atributos,   // JSON string: {"etapa_vida":"adulto","tamano_raza":"medium"}
      especie,     // 'perro' | 'gato' | 'ambos'
      limit = 20,
      offset = 0,
    } = req.query

    const limitInt  = Math.min(parseInt(limit) || 20, 100)
    const offsetInt = parseInt(offset) || 0

    const condiciones = []
    const valores = []
    let i = 1

    if (categoria) {
      if (categoria.toLowerCase() === 'ofertas') {
        condiciones.push(`EXISTS (SELECT 1 FROM presentaciones pr2 WHERE pr2.producto_id = p.id AND ${OFERTA_COND.replace(/pr\./g, 'pr2.')})`)
      } else {
        condiciones.push(`p.ecommerce_categoria = $${i++}`)
        valores.push(categoria.toLowerCase())
      }
    }
    if (search) { condiciones.push(`(p.nombre ILIKE $${i} OR p.descripcion ILIKE $${i})`); valores.push(`%${search}%`); i++ }
    if (novedad === 'true') condiciones.push(`p.es_novedad = true`)
    if (subcategoria_id) { condiciones.push(`p.ecommerce_subcategoria_id = $${i++}`); valores.push(parseInt(subcategoria_id)) }
    if (marca_id) { condiciones.push(`p.marca_id = $${i++}`); valores.push(parseInt(marca_id)) }
    if (especie && ['perro', 'gato'].includes(especie)) {
      // productos sin especie cargada se tratan como 'ambos' (no deben desaparecer del filtro)
      condiciones.push(`(p.especie = $${i++} OR p.especie = 'ambos' OR p.especie IS NULL)`)
      valores.push(especie)
    }
    if (atributos) {
      try {
        const attrs = JSON.parse(atributos)
        Object.entries(attrs).forEach(([key, val]) => {
          if (!val) return
          if (Array.isArray(val) && val.length > 0) {
            // OR: atributo coincide con cualquiera de los valores (incluidos aliases)
            condiciones.push(`p.atributos->>'${key}' = ANY($${i++}::text[])`)
            valores.push(val)
          } else if (typeof val === 'string') {
            condiciones.push(`p.atributos->>'${key}' = $${i++}`)
            valores.push(val)
          }
        })
      } catch {}
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''

    const havingConds = []
    if (solo_disponibles === 'true') havingConds.push(`COUNT(pr.id) FILTER (WHERE pr.disponible = true AND pr.stock > 0) > 0`)
    if (precio_min) havingConds.push(`MIN(COALESCE(pr.precio_tarjeta, pr.precio_venta)) >= ${parseFloat(precio_min)}`)
    if (precio_max) havingConds.push(`MIN(COALESCE(pr.precio_tarjeta, pr.precio_venta)) <= ${parseFloat(precio_max)}`)
    const having = havingConds.length ? `HAVING ${havingConds.join(' AND ')}` : ''

    let orderBy
    switch (sort) {
      case 'precio_asc':  orderBy = `tiene_stock DESC, MIN(COALESCE(pr.precio_tarjeta, pr.precio_venta)) ASC, p.nombre ASC`;  break
      case 'precio_desc': orderBy = `tiene_stock DESC, MIN(COALESCE(pr.precio_tarjeta, pr.precio_venta)) DESC, p.nombre ASC`; break
      case 'destacados':  orderBy = `p.es_destacado DESC, tiene_stock DESC, p.nombre ASC`; break
      case 'mas_vendido': orderBy = `total_vendido DESC, tiene_stock DESC, p.nombre ASC`; break
      default:            orderBy = `tiene_stock DESC, p.nombre ASC`
    }

    const needsVentas = sort === 'mas_vendido' || sort === 'destacados'

    // Subquery agrupada por producto: HAVING necesita GROUP BY para que el conteo
    // sea "cuantos productos cumplen" en vez de un unico grupo global (que devuelve
    // 0 FILAS, no total=0, cuando el filtro de precio no matchea — rompía con 500).
    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM (
         SELECT p.id
         FROM productos p
         JOIN presentaciones pr ON pr.producto_id = p.id AND pr.disponible = true
         ${where}
         GROUP BY p.id
         ${having}
       ) sub`,
      valores
    ).catch(() => db.query(`SELECT COUNT(DISTINCT p.id) AS total FROM productos p JOIN presentaciones pr ON pr.producto_id = p.id ${where}`, valores))

    const itemsResult = await db.query(
      `SELECT
         p.id AS producto_id,
         p.nombre AS nombre_base,
         COALESCE(p.descripcion, '') AS descripcion,
         COALESCE(p.imagen_url, '') AS imagen_url,
         COALESCE(p.es_novedad, false) AS es_novedad,
         COALESCE(p.es_destacado, false) AS es_destacado,
         p.ecommerce_categoria,
         m.nombre AS marca_nombre,
         LOWER(REGEXP_REPLACE(c.nombre, '[^a-zA-Z0-9]+', '-', 'g')) AS categoria_slug,
         ${needsVentas ? `COALESCE(SUM(opi.cantidad) FILTER (WHERE op.estado != 'cancelado'), 0) AS total_vendido,` : ''}
         MIN(COALESCE(pr.precio_tarjeta, pr.precio_venta)) AS precio_desde,
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'id', pr.id,
             'nombre', pr.nombre,
             'precio_venta', COALESCE(pr.precio_tarjeta, pr.precio_venta),
             'stock', pr.stock,
             'imagen_url', COALESCE(pr.imagen_url, p.imagen_url)
           ) ORDER BY pr.nombre ASC
         ) FILTER (WHERE pr.disponible = true) AS presentaciones,
         COUNT(pr.id) FILTER (WHERE pr.disponible = true AND pr.stock > 0) > 0 AS tiene_stock
       FROM productos p
       JOIN presentaciones pr ON pr.producto_id = p.id AND pr.disponible = true
       LEFT JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN marcas m ON m.id = p.marca_id
       ${needsVentas ? 'LEFT JOIN ordenes_pedido_items opi ON opi.presentacion_id = pr.id LEFT JOIN ordenes_pedido op ON op.id = opi.orden_id' : ''}
       ${where}
       GROUP BY p.id, p.nombre, p.descripcion, p.imagen_url, p.es_novedad, p.es_destacado, p.ecommerce_categoria, c.nombre, m.nombre
       ${having}
       ORDER BY ${orderBy}
       LIMIT $${i} OFFSET $${i + 1}`,
      [...valores, limitInt, offsetInt]
    )

    const items = itemsResult.rows.map(row => ({
      id: row.producto_id,
      nombre: row.nombre_base,
      descripcion: row.descripcion,
      imagen_url: row.imagen_url || null,
      es_novedad: row.es_novedad,
      marca: row.marca_nombre || null,
      categoria_slug: row.categoria_slug,
      slug: buildProductSlug(row.nombre_base, row.producto_id),
      precio_desde: Number(row.precio_desde || 0),
      tiene_stock: row.tiene_stock,
      presentaciones: (row.presentaciones || []).map(pr => ({
        id: pr.id,
        nombre: pr.nombre,
        precio_venta: Number(pr.precio_venta),
        stock: Number(pr.stock),
        imagen_url: pr.imagen_url || null,
      })),
    }))

    res.json({
      items,
      total: parseInt(countResult.rows[0].total),
    })
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── GET /api/ecommerce/productos/:slug ───────────────────────
// Slug formato: nombre-{producto_id}
router.get('/productos/:slug', async (req, res) => {
  try {
    const parts = req.params.slug.split('-')
    const productoId = parseInt(parts[parts.length - 1])

    if (!productoId || isNaN(productoId)) {
      return res.status(400).json({ error: 'Slug invalido' })
    }

    const resultado = await db.query(
      `SELECT
         p.id AS producto_id,
         p.nombre AS nombre_base,
         COALESCE(p.descripcion, '') AS descripcion,
         COALESCE(p.imagen_url, '') AS imagen_url,
         COALESCE(p.es_novedad, false) AS es_novedad,
         m.nombre AS marca_nombre,
         LOWER(REGEXP_REPLACE(c.nombre, '[^a-zA-Z0-9]+', '-', 'g')) AS categoria_slug,
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'id', pr.id,
             'nombre', pr.nombre,
             'precio_venta', COALESCE(pr.precio_tarjeta, pr.precio_venta),
             'stock', pr.stock,
             'disponible', pr.disponible,
             'imagen_url', COALESCE(pr.imagen_url, p.imagen_url)
           ) ORDER BY pr.nombre ASC
         ) FILTER (WHERE pr.disponible = true) AS presentaciones
       FROM productos p
       JOIN presentaciones pr ON pr.producto_id = p.id
       LEFT JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN marcas m ON m.id = p.marca_id
       WHERE p.id = $1
       GROUP BY p.id, p.nombre, p.descripcion, p.imagen_url, p.es_novedad, c.nombre, m.nombre`,
      [productoId]
    )

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    const row = resultado.rows[0]
    const presentaciones = (row.presentaciones || []).map(pr => ({
      id: pr.id,
      nombre: pr.nombre,
      precio_venta: Number(pr.precio_venta),
      stock: Number(pr.stock),
      disponible: pr.disponible,
      imagen_url: pr.imagen_url || null,
    }))

    res.json({
      id: row.producto_id,
      nombre: row.nombre_base,
      descripcion: row.descripcion,
      imagen_url: row.imagen_url || null,
      es_novedad: row.es_novedad,
      marca: row.marca_nombre || null,
      categoria_slug: row.categoria_slug,
      slug: buildProductSlug(row.nombre_base, row.producto_id),
      presentaciones,
    })
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── GET /api/ecommerce/config (público — datos básicos de la tienda) ──
router.get('/config', async (req, res) => {
  try {
    const resultado = await db.query(`SELECT clave, valor FROM tienda_config`)
    const config = {}
    resultado.rows.forEach(r => { config[r.clave] = r.valor })
    res.json(config)
  } catch (error) {
    if (error.code === '42P01') return res.json({})
    manejarError(res, error)
  }
})

// ─── POST /api/ecommerce/pedidos ──────────────────────────────
router.post('/pedidos', async (req, res) => {
  const client = await db.pool.connect()
  try {
    const {
      items, cliente, notas, tipo_entrega = 'delivery',
      zona_id, zona_nombre, zona_costo,
      referencia, horario, contacto_entrega, metodo_pago,
      quiere_factura = false, razon_social, ruc_factura,
      maps_url, sesion_id,
    } = req.body

    // Validaciones basicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'El pedido debe tener al menos un producto' })
    }
    if (!cliente?.nombre?.trim()) {
      return res.status(400).json({ error: 'El nombre del cliente es requerido' })
    }
    if (!cliente?.telefono?.trim()) {
      return res.status(400).json({ error: 'El telefono es requerido' })
    }
    if (tipo_entrega === 'delivery' && !cliente?.direccion?.trim()) {
      return res.status(400).json({ error: 'La direccion es requerida para delivery' })
    }

    // Sanitizar telefono
    const telefonoLimpio = cliente.telefono.replace(/[^0-9+\s()-]/g, '').trim()

    await client.query('BEGIN')

    // 1. Buscar o crear cliente
    let clienteId
    const clienteExistente = await client.query(
      `SELECT id FROM clientes WHERE telefono = $1 LIMIT 1`,
      [telefonoLimpio]
    )

    if (clienteExistente.rows.length > 0) {
      clienteId = clienteExistente.rows[0].id
    } else {
      const nuevoCliente = await client.query(
        `INSERT INTO clientes (nombre, telefono, direccion, canal_origen)
         VALUES ($1, $2, $3, 'ecommerce')
         RETURNING id`,
        [cliente.nombre.trim(), telefonoLimpio, cliente.direccion?.trim() || null]
      )
      clienteId = nuevoCliente.rows[0].id
    }

    // 2. Verificar stock y calcular total
    let total = 0
    const itemsVerificados = []

    for (const item of items) {
      if (!item.id || !item.cantidad || item.cantidad < 1) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'Item invalido en el pedido' })
      }

      const pr = await client.query(
        `SELECT id, precio_venta, precio_tarjeta, stock, disponible FROM presentaciones WHERE id = $1 FOR UPDATE`,
        [item.id]
      )

      if (pr.rows.length === 0 || !pr.rows[0].disponible) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: `Producto no disponible (id: ${item.id})` })
      }

      const presentacion = pr.rows[0]
      if (presentacion.stock < item.cantidad) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          error: `Stock insuficiente. Disponible: ${presentacion.stock}`,
          producto_id: item.id,
        })
      }

      const precioUnit = Number(presentacion.precio_tarjeta || presentacion.precio_venta)
      const subtotal = precioUnit * item.cantidad
      total += subtotal

      itemsVerificados.push({
        presentacion_id: presentacion.id,
        cantidad: item.cantidad,
        precio_unitario: precioUnit,
        precio_total: subtotal,
      })
    }

    // 3. Generar numero de pedido -- lock advisory para serializar contra
    // cualquier otra transaccion (de esta ruta o de /pedidos-exclusivos) que
    // este generando un numero al mismo tiempo; se libera solo al COMMIT/ROLLBACK.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('numero_pedido_ecommerce'))`)
    const numeroResult = await client.query(
      `SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(numero_pedido, '[^0-9]', '', 'g'), '') AS INTEGER)), 0) + 1 AS siguiente
       FROM ordenes_pedido`
    )
    const numeroPedido = `ECO-${String(numeroResult.rows[0].siguiente).padStart(5, '0')}`

    // Resolver zona si se proporcionó zona_id
    let zonaResuelta = { nombre: zona_nombre || null, costo: zona_costo || 0, id: zona_id || null }
    if (zona_id && !zona_nombre) {
      const zonaRes = await client.query(
        `SELECT nombre, costo FROM zonas_delivery WHERE id = $1`, [zona_id]
      ).catch(() => ({ rows: [] }))
      if (zonaRes.rows[0]) {
        zonaResuelta = { nombre: zonaRes.rows[0].nombre, costo: Number(zonaRes.rows[0].costo), id: zona_id }
      }
    }

    // 4. Crear orden
    const ordenResult = await client.query(
      `INSERT INTO ordenes_pedido
         (cliente_id, canal, estado, notas, numero_pedido, tipo_entrega,
          modalidad, ubicacion, referencia, horario, contacto_entrega, metodo_pago,
          zona_delivery, costo_delivery, zona_id,
          quiere_factura, ruc_factura, razon_social, maps_url)
       VALUES ($1, 'pagina_web', 'pendiente', $2, $3, $4,
               $5, $6, $7, $8, $9, $10,
               $11, $12, $13,
               $14, $15, $16, $17)
       RETURNING id`,
      [
        clienteId, notas?.trim() || null, numeroPedido, tipo_entrega,
        tipo_entrega,
        cliente.direccion?.trim() || null,
        referencia?.trim() || null,
        horario?.trim() || null,
        contacto_entrega?.trim() || null,
        metodo_pago || null,
        zonaResuelta.nombre,
        zonaResuelta.costo,
        zonaResuelta.id,
        quiere_factura || false,
        ruc_factura?.trim() || null,
        razon_social?.trim() || null,
        maps_url?.trim() || null,
      ]
    )
    const ordenId = ordenResult.rows[0].id

    // 5. Insertar items
    for (const item of itemsVerificados) {
      await client.query(
        `INSERT INTO ordenes_pedido_items
           (orden_id, presentacion_id, cantidad, precio_unitario, precio_total)
         VALUES ($1, $2, $3, $4, $5)`,
        [ordenId, item.presentacion_id, item.cantidad, item.precio_unitario, item.precio_total]
      )
    }

    await client.query('COMMIT')

    if (sesion_id) {
      db.query(`UPDATE carritos_web SET convertido = true WHERE sesion_id = $1`, [sesion_id]).catch(() => {})
    }

    const presentacionIds = itemsVerificados.map(it => it.presentacion_id)
    const nombresRes = await db.query(
      `SELECT pr.id, p.nombre AS producto, pr.nombre AS presentacion
       FROM presentaciones pr
       JOIN productos p ON p.id = pr.producto_id
       WHERE pr.id = ANY($1)`,
      [presentacionIds]
    ).catch(() => ({ rows: [] }))
    const nombresMap = {}
    nombresRes.rows.forEach(r => { nombresMap[r.id] = `${r.producto} ${r.presentacion}` })

    const BOT_NUMERO = '595982211934'
    const gs = v => `Gs. ${Number(v).toLocaleString('es-PY')}`
    const lineasItems = itemsVerificados.map(it =>
      `• ${nombresMap[it.presentacion_id] || 'Producto'} x ${it.cantidad} — ${gs(it.precio_total)}`
    ).join('\n')

    const esDelivery = tipo_entrega === 'delivery'
    const entregaTexto = esDelivery
      ? `Delivery — ${zonaResuelta.nombre || 'sin zona'}` + (zonaResuelta.costo ? ` (${gs(zonaResuelta.costo)})` : '')
      : 'Retiro en local'

    const lineasDelivery = esDelivery ? [
      `Dir: ${cliente.direccion?.trim() || '-'}`,
      maps_url?.trim() ? `Maps: ${maps_url.trim()}` : null,
      referencia?.trim() ? `Ref: ${referencia.trim()}` : null,
      horario?.trim() ? `Horario: ${horario.trim()}` : null,
      contacto_entrega?.trim() ? `Recibe: ${contacto_entrega.trim()}` : null,
      metodo_pago ? `Pago: ${metodo_pago === 'transferencia' ? 'Transferencia bancaria' : 'Efectivo'}` : null,
    ].filter(Boolean) : []

    const lineaFactura = quiere_factura && razon_social
      ? `Factura: ${razon_social.trim()}${ruc_factura ? ` - RUC/CI: ${ruc_factura.trim()}` : ''}`
      : null

    const notasLinea = notas?.trim() ? `Notas: ${notas.trim()}` : null

    const totalConDelivery = esDelivery && zonaResuelta.costo
      ? `${gs(total)} + ${gs(zonaResuelta.costo)} delivery = *${gs(total + zonaResuelta.costo)}*`
      : `*${gs(total)}*`

    const plantilla = [
      `*PEDIDO WEB - ${numeroPedido}*`,
      ``,
      `Cliente: ${cliente.nombre.trim()}`,
      `Tel: ${telefonoLimpio}`,
      `Entrega: ${entregaTexto}`,
      ...lineasDelivery,
      ...(lineaFactura ? [lineaFactura] : []),
      ...(notasLinea ? [notasLinea] : []),
      ``,
      `*Productos:*`,
      lineasItems,
      ``,
      `*Total: ${totalConDelivery}*`,
      ``,
      `#PEDIDO_WEB#${numeroPedido}`,
    ].join('\n')

    const whatsappUrl = `https://wa.me/${BOT_NUMERO}?text=${encodeURIComponent(plantilla)}`

    res.status(201).json({
      pedido_id: ordenId,
      numero: numeroPedido,
      total,
      tipo_entrega,
      mensaje: `Tu pedido ${numeroPedido} fue registrado. Envialo por WhatsApp para que lo procesemos.`,
      whatsapp_url: whatsappUrl,
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    manejarError(res, error)
  } finally {
    client.release()
  }
})

// ─── POST /api/ecommerce/pedidos-exclusivos ───────────────────
// "Encargo" para productos sin stock: no valida ni bloquea por stock,
// pide solo nombre/telefono/cantidad (sin datos de entrega, el agente
// coordina el resto por WhatsApp). Crea la orden igual que un pedido
// normal, marcada con es_pedido_exclusivo=true.
router.post('/pedidos-exclusivos', async (req, res) => {
  const client = await db.pool.connect()
  try {
    const { presentacion_id, cliente } = req.body
    const cantidad = parseInt(req.body.cantidad, 10)

    if (!presentacion_id) {
      return res.status(400).json({ error: 'presentacion_id es requerido' })
    }
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return res.status(400).json({ error: 'Cantidad invalida' })
    }
    if (!cliente?.nombre?.trim()) {
      return res.status(400).json({ error: 'El nombre del cliente es requerido' })
    }
    if (!cliente?.telefono?.trim()) {
      return res.status(400).json({ error: 'El telefono es requerido' })
    }

    const telefonoLimpio = cliente.telefono.replace(/[^0-9+\s()-]/g, '').trim()

    await client.query('BEGIN')

    // Buscar la presentacion solo para sacar nombre/precio -- sin FOR UPDATE,
    // sin chequeo de STOCK: este es justamente el flujo para pedirla sin stock.
    // Si se valida "disponible" (activa en el catalogo) -- no es lo mismo que
    // stock, un producto desactivado no deberia poder pedirse ni asi.
    const pr = await client.query(
      `SELECT pr.id, pr.precio_venta, pr.precio_tarjeta, pr.disponible AS pr_disponible,
              p.nombre AS producto, pr.nombre AS presentacion, p.disponible AS p_disponible
       FROM presentaciones pr
       JOIN productos p ON p.id = pr.producto_id
       WHERE pr.id = $1`,
      [presentacion_id]
    )
    if (!pr.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Producto no encontrado' })
    }
    const presentacion = pr.rows[0]
    if (presentacion.pr_disponible === false || presentacion.p_disponible === false) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Producto no disponible' })
    }
    const precioUnit = Number(presentacion.precio_tarjeta || presentacion.precio_venta)
    const precioTotal = precioUnit * cantidad

    // Buscar o crear cliente
    let clienteId
    const clienteExistente = await client.query(
      `SELECT id FROM clientes WHERE telefono = $1 LIMIT 1`,
      [telefonoLimpio]
    )
    if (clienteExistente.rows.length > 0) {
      clienteId = clienteExistente.rows[0].id
    } else {
      const nuevoCliente = await client.query(
        `INSERT INTO clientes (nombre, telefono, canal_origen)
         VALUES ($1, $2, 'ecommerce')
         RETURNING id`,
        [cliente.nombre.trim(), telefonoLimpio]
      )
      clienteId = nuevoCliente.rows[0].id
    }

    // Generar numero de pedido -- mismo lock advisory que /pedidos, para que
    // ambas rutas se serialicen entre si y no generen el mismo numero.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('numero_pedido_ecommerce'))`)
    const numeroResult = await client.query(
      `SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(numero_pedido, '[^0-9]', '', 'g'), '') AS INTEGER)), 0) + 1 AS siguiente
       FROM ordenes_pedido`
    )
    const numeroPedido = `ECO-${String(numeroResult.rows[0].siguiente).padStart(5, '0')}`

    const ordenResult = await client.query(
      `INSERT INTO ordenes_pedido (cliente_id, canal, estado, es_pedido_exclusivo, notas, numero_pedido)
       VALUES ($1, 'pagina_web', 'pendiente', true, $2, $3)
       RETURNING id`,
      [
        clienteId,
        'Pedido exclusivo (sin stock) — sena del 20% a coordinar con el agente.',
        numeroPedido,
      ]
    )
    const ordenId = ordenResult.rows[0].id

    await client.query(
      `INSERT INTO ordenes_pedido_items (orden_id, presentacion_id, cantidad, precio_unitario, precio_total)
       VALUES ($1, $2, $3, $4, $5)`,
      [ordenId, presentacion.id, cantidad, precioUnit, precioTotal]
    )

    await client.query('COMMIT')

    const BOT_NUMERO = '595982211934'
    const gs = v => `Gs. ${Number(v).toLocaleString('es-PY')}`
    const nombreProducto = `${presentacion.producto} ${presentacion.presentacion}`

    const plantilla = [
      `*PEDIDO EXCLUSIVO - ${numeroPedido}*`,
      ``,
      `Cliente: ${cliente.nombre.trim()}`,
      `Tel: ${telefonoLimpio}`,
      ``,
      `Producto: ${nombreProducto} x ${cantidad}`,
      `Precio estimado: ${gs(precioTotal)}`,
      ``,
      `Algunos productos se pueden conseguir en el dia, otros pueden tardar`,
      `de 24 a 48 hs aproximadamente. El pedido se realiza con una sena del 20%.`,
      ``,
      `#PEDIDO_EXCLUSIVO#${numeroPedido}`,
    ].join('\n')

    const whatsappUrl = `https://wa.me/${BOT_NUMERO}?text=${encodeURIComponent(plantilla)}`

    res.status(201).json({
      pedido_id: ordenId,
      numero: numeroPedido,
      total: precioTotal,
      mensaje: `Tu pedido especial ${numeroPedido} fue registrado. Envialo por WhatsApp para que un agente lo coordine.`,
      whatsapp_url: whatsappUrl,
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    manejarError(res, error)
  } finally {
    client.release()
  }
})

// ─── GET /api/ecommerce/zonas ─────────────────────────────────
router.get('/zonas', async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT id, nombre, costo FROM zonas_delivery WHERE activa = true ORDER BY nombre ASC`
    )
    res.json(resultado.rows)
  } catch (error) {
    if (error.code === '42P01') return res.json([])
    manejarError(res, error)
  }
})

// ════════════════════════════════════════════════════════════════
// RUTAS ADMIN — requieren autenticación dashboard
// ════════════════════════════════════════════════════════════════

// ─── GET /api/ecommerce/admin/config ──────────────────────────
router.get('/admin/config', autenticar, verificarPermiso('ecommerce', 'ver'), async (req, res) => {
  try {
    const resultado = await db.query(`SELECT clave, valor, updated_at FROM tienda_config ORDER BY clave`)
    const config = {}
    resultado.rows.forEach(r => { config[r.clave] = r.valor })
    res.json(config)
  } catch (error) {
    if (error.code === '42P01') return res.json({})
    manejarError(res, error)
  }
})

// ─── PUT /api/ecommerce/admin/config ──────────────────────────
router.put('/admin/config', autenticar, verificarPermiso('ecommerce', 'editar'), async (req, res) => {
  try {
    const updates = req.body // { clave: valor, ... }
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Body invalido' })
    }
    for (const [clave, valor] of Object.entries(updates)) {
      await db.query(
        `INSERT INTO tienda_config (clave, valor, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (clave) DO UPDATE SET valor = $2, updated_at = NOW()`,
        [clave, String(valor)]
      )
    }
    res.json({ ok: true })
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── GET /api/ecommerce/admin/categorias ──────────────────────
router.get('/admin/categorias', autenticar, verificarPermiso('ecommerce', 'ver'), async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT clave, valor FROM tienda_config WHERE clave LIKE 'cat_imagen_%'`
    ).catch(() => ({ rows: [] }))
    const imagenes = {}
    resultado.rows.forEach(r => { imagenes[r.clave.replace('cat_imagen_', '')] = r.valor })
    const cats = SLUGS_VALIDOS.map(slug => ({ slug, imagen_url: imagenes[slug] || null }))
    res.json(cats)
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── PATCH /api/ecommerce/admin/categorias/:slug ──────────────
router.patch('/admin/categorias/:slug', autenticar, verificarPermiso('ecommerce', 'editar'), async (req, res) => {
  try {
    const { slug } = req.params
    if (!SLUGS_VALIDOS.includes(slug)) return res.status(400).json({ error: 'Slug invalido' })
    const { imagen_url } = req.body
    await db.query(
      `INSERT INTO tienda_config (clave, valor, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (clave) DO UPDATE SET valor = $2, updated_at = NOW()`,
      [`cat_imagen_${slug}`, imagen_url || '']
    )
    res.json({ ok: true, slug, imagen_url: imagen_url || null })
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── GET /api/ecommerce/admin/banners ─────────────────────────
router.get('/admin/banners', autenticar, verificarPermiso('ecommerce', 'ver'), async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT * FROM ecommerce_banners ORDER BY orden ASC`
    )
    res.json(resultado.rows)
  } catch (error) {
    if (error.code === '42P01') return res.json([])
    manejarError(res, error)
  }
})

// ─── POST /api/ecommerce/admin/banners ────────────────────────
router.post('/admin/banners', autenticar, verificarPermiso('ecommerce', 'crear'), async (req, res) => {
  try {
    const { titulo, subtitulo, badge, cta_texto, cta_url, imagen_url, orden = 0, activo = true } = req.body
    if (!titulo?.trim()) return res.status(400).json({ error: 'El título es requerido' })
    const resultado = await db.query(
      `INSERT INTO ecommerce_banners (titulo, subtitulo, badge, cta_texto, cta_url, imagen_url, orden, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [titulo.trim(), subtitulo || null, badge || null, cta_texto || null, cta_url || null, imagen_url || null, orden, activo]
    )
    res.status(201).json(resultado.rows[0])
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── PATCH /api/ecommerce/admin/banners/:id ───────────────────
router.patch('/admin/banners/:id', autenticar, verificarPermiso('ecommerce', 'editar'), async (req, res) => {
  try {
    const { id } = req.params
    const { titulo, subtitulo, badge, cta_texto, cta_url, imagen_url, orden, activo } = req.body
    const resultado = await db.query(
      `UPDATE ecommerce_banners SET
         titulo     = COALESCE($1, titulo),
         subtitulo  = COALESCE($2, subtitulo),
         badge      = COALESCE($3, badge),
         cta_texto  = COALESCE($4, cta_texto),
         cta_url    = COALESCE($5, cta_url),
         imagen_url = COALESCE($6, imagen_url),
         orden      = COALESCE($7, orden),
         activo     = COALESCE($8, activo)
       WHERE id = $9 RETURNING *`,
      [titulo, subtitulo, badge, cta_texto, cta_url, imagen_url, orden, activo, id]
    )
    if (!resultado.rows.length) return res.status(404).json({ error: 'Banner no encontrado' })
    res.json(resultado.rows[0])
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── DELETE /api/ecommerce/admin/banners/:id ──────────────────
router.delete('/admin/banners/:id', autenticar, verificarPermiso('ecommerce', 'eliminar'), async (req, res) => {
  try {
    await db.query(`DELETE FROM ecommerce_banners WHERE id = $1`, [req.params.id])
    res.json({ ok: true })
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── GET /api/ecommerce/admin/pedidos ─────────────────────────
router.get('/admin/pedidos', autenticar, verificarPermiso('ecommerce', 'ver'), async (req, res) => {
  try {
    const { estado, limit = 50, offset = 0 } = req.query
    const conds = [`op.canal = 'pagina_web'`]
    const vals = []
    let i = 1
    if (estado) { conds.push(`op.estado = $${i++}`); vals.push(estado) }

    const resultado = await db.query(
      `SELECT op.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
              COALESCE(json_agg(json_build_object(
                'nombre', p.nombre || ' — ' || pr.nombre,
                'cantidad', opi.cantidad,
                'precio', opi.precio_unitario
              ) ORDER BY opi.id) FILTER (WHERE opi.id IS NOT NULL), '[]') AS items
       FROM ordenes_pedido op
       LEFT JOIN clientes c ON c.id = op.cliente_id
       LEFT JOIN ordenes_pedido_items opi ON opi.orden_id = op.id
       LEFT JOIN presentaciones pr ON pr.id = opi.presentacion_id
       LEFT JOIN productos p ON p.id = pr.producto_id
       WHERE ${conds.join(' AND ')}
       GROUP BY op.id, c.nombre, c.telefono
       ORDER BY op.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...vals, parseInt(limit), parseInt(offset)]
    )
    res.json(resultado.rows)
  } catch (error) {
    if (error.code === '42P01') return res.json([])
    manejarError(res, error)
  }
})

// ─── DELETE /api/ecommerce/admin/pedidos/:id ──────────────────
router.delete('/admin/pedidos/:id', autenticar, verificarPermiso('ecommerce', 'eliminar'), async (req, res) => {
  const client = await db.pool.connect()
  try {
    const orden = await client.query(`SELECT id, numero_pedido FROM ordenes_pedido WHERE id = $1 AND canal = 'pagina_web'`, [req.params.id])
    if (!orden.rows.length) return res.status(404).json({ error: 'Pedido no encontrado' })

    await client.query('BEGIN')
    await client.query(`DELETE FROM ordenes_pedido_items WHERE orden_id = $1`, [req.params.id])
    await client.query(`DELETE FROM ordenes_pedido WHERE id = $1`, [req.params.id])
    await client.query('COMMIT')

    res.json({ ok: true })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    manejarError(res, error)
  } finally {
    client.release()
  }
})

// ─── GET /api/ecommerce/admin/productos ───────────────────────
// Lista presentaciones con campos editables para el ecommerce
router.get('/admin/productos', autenticar, verificarPermiso('ecommerce', 'ver'), async (req, res) => {
  try {
    const { buscar = '', categoria } = req.query
    const conds = []
    const vals = []
    let i = 1
    if (buscar) {
      conds.push(`(p.nombre ILIKE $${i} OR pr.nombre ILIKE $${i})`)
      vals.push(`%${buscar}%`); i++
    }
    if (categoria) {
      conds.push(`c.id = $${i}`); vals.push(categoria); i++
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
    const resultado = await db.query(
      `SELECT
         pr.id AS presentacion_id,
         pr.nombre AS presentacion_nombre,
         pr.precio_venta,
         pr.stock,
         pr.disponible,
         pr.codigo_barras,
         pr.imagen_url AS imagen_presentacion_url,
         (${OFERTA_COND}) AS en_oferta,
         p.id AS producto_id,
         p.nombre AS producto_nombre,
         p.descripcion,
         p.imagen_url,
         p.especie,
         p.calidad,
         COALESCE(p.es_novedad, false) AS es_novedad,
         COALESCE(p.es_destacado, false) AS es_destacado,
         p.ecommerce_categoria,
         p.ecommerce_subcategoria_id,
         es2.nombre AS ecommerce_subcategoria_nombre,
         COALESCE(p.atributos, '{}') AS atributos,
         c.nombre AS categoria_nombre,
         m.nombre AS marca_nombre
       FROM presentaciones pr
       JOIN productos p ON p.id = pr.producto_id
       LEFT JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN marcas m ON m.id = p.marca_id
       LEFT JOIN ecommerce_subcategorias es2 ON es2.id = p.ecommerce_subcategoria_id
       ${where}
       ORDER BY p.nombre ASC, pr.nombre ASC`,
      vals
    )
    res.json(resultado.rows)
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── PATCH /api/ecommerce/admin/productos/:presentacionId ─────
// Edita campos ecommerce del producto (imagen, novedad, destacado, disponible)
router.patch('/admin/productos/:presentacionId', autenticar, verificarPermiso('ecommerce', 'editar'), async (req, res) => {
  const client = await db.pool.connect()
  try {
    const { presentacionId } = req.params
    const { imagen_url, imagen_presentacion_url, es_novedad, es_destacado, disponible, ecommerce_categoria, ecommerce_subcategoria_id, atributos, especie } = req.body
    if (especie !== undefined && especie !== null && !['perro', 'gato', 'ambos'].includes(especie))
      return res.status(400).json({ error: 'especie inválida' })
    // "ofertas" no es una categoria asignable: se arma automaticamente segun el descuento activo
    if (ecommerce_categoria === 'ofertas')
      return res.status(400).json({ error: "'ofertas' no es una categoría asignable. Activá el descuento en Inventario." })

    await client.query('BEGIN')

    // Obtener producto_id y valores previos de esta presentacion
    const pr = await client.query(`SELECT producto_id, disponible, imagen_url AS imagen_presentacion_url_anterior FROM presentaciones WHERE id = $1`, [presentacionId])
    if (!pr.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Presentación no encontrada' })
    }
    const productoId = pr.rows[0].producto_id

    // Actualizar disponible en la presentacion
    if (disponible !== undefined) {
      await client.query(`UPDATE presentaciones SET disponible = $1 WHERE id = $2`, [disponible, presentacionId])
    }

    // Imagen propia de esta presentación (independiente de la imagen general del producto)
    if (imagen_presentacion_url !== undefined) {
      await client.query(`UPDATE presentaciones SET imagen_url = $1 WHERE id = $2`, [imagen_presentacion_url || null, presentacionId])
    }

    // Actualizar campos en producto
    const sets = []
    const vals = []
    let i = 1
    if (imagen_url !== undefined)                { sets.push(`imagen_url = $${i++}`);                vals.push(imagen_url) }
    if (es_novedad !== undefined)                { sets.push(`es_novedad = $${i++}`);                vals.push(es_novedad) }
    if (es_destacado !== undefined)              { sets.push(`es_destacado = $${i++}`);              vals.push(es_destacado) }
    if (ecommerce_categoria !== undefined)       { sets.push(`ecommerce_categoria = $${i++}`);       vals.push(ecommerce_categoria || null) }
    if (ecommerce_subcategoria_id !== undefined) { sets.push(`ecommerce_subcategoria_id = $${i++}`); vals.push(ecommerce_subcategoria_id ? parseInt(ecommerce_subcategoria_id) : null) }
    if (atributos !== undefined)                 { sets.push(`atributos = $${i++}::jsonb`);          vals.push(JSON.stringify(atributos ?? {})) }
    if (especie !== undefined)                   { sets.push(`especie = $${i++}`);                   vals.push(especie || null) }

    if (sets.length) {
      vals.push(productoId)
      await client.query(`UPDATE productos SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    }

    await client.query('COMMIT')

    if (disponible !== undefined) {
      registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'ecommerce', entidad: 'presentacion', entidad_id: parseInt(presentacionId), descripcion: `Presentación ${disponible ? 'activada' : 'desactivada'} en tienda web`, dato_anterior: { disponible: pr.rows[0].disponible }, dato_nuevo: { disponible }, ip: req.ip }).catch(() => {})
    }
    if (imagen_presentacion_url !== undefined) {
      registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'ecommerce', entidad: 'presentacion', entidad_id: parseInt(presentacionId), descripcion: 'Imagen de presentación actualizada en tienda web', dato_anterior: { imagen_url: pr.rows[0].imagen_presentacion_url_anterior }, dato_nuevo: { imagen_url: imagen_presentacion_url || null }, ip: req.ip }).catch(() => {})
    }

    res.json({ ok: true })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    manejarError(res, error)
  } finally {
    client.release()
  }
})

// ─── GET /api/ecommerce/filtros/precio ───────────────────────
// Rango de precios para los filtros activos (se llama al cambiar filtros)
router.get('/filtros/precio', async (req, res) => {
  try {
    const { categoria, atributos, marca_id, subcategoria_id, especie } = req.query
    const conds = ['pr.disponible = true', 'pr.stock > 0']
    const vals = []
    let i = 1

    if (categoria) { conds.push(`p.ecommerce_categoria = $${i++}`); vals.push(categoria.toLowerCase()) }
    if (marca_id)  { conds.push(`p.marca_id = $${i++}`);            vals.push(parseInt(marca_id)) }
    if (subcategoria_id) { conds.push(`p.ecommerce_subcategoria_id = $${i++}`); vals.push(parseInt(subcategoria_id)) }
    if (especie && ['perro', 'gato'].includes(especie)) {
      conds.push(`(p.especie = $${i++} OR p.especie = 'ambos' OR p.especie IS NULL)`)
      vals.push(especie)
    }
    if (atributos) {
      try {
        const attrs = JSON.parse(atributos)
        Object.entries(attrs).forEach(([key, val]) => {
          if (!val) return
          if (Array.isArray(val) && val.length > 0) {
            conds.push(`p.atributos->>'${key}' = ANY($${i++}::text[])`)
            vals.push(val)
          } else if (typeof val === 'string') {
            conds.push(`p.atributos->>'${key}' = $${i++}`)
            vals.push(val)
          }
        })
      } catch {}
    }

    const where = `WHERE ${conds.join(' AND ')}`
    const { rows } = await db.query(
      `SELECT MIN(${PRECIO_EF}) AS precio_min, MAX(${PRECIO_EF}) AS precio_max
       FROM presentaciones pr JOIN productos p ON p.id = pr.producto_id ${where}`,
      vals
    )
    res.json({
      precio_min: Number(rows[0]?.precio_min || 0),
      precio_max: Number(rows[0]?.precio_max || 0),
    })
  } catch (error) { manejarError(res, error) }
})

// ─── GET /api/ecommerce/filtros ───────────────────────────────
// Devuelve marcas disponibles y rango de precios para una categoria
router.get('/filtros', async (req, res) => {
  try {
    const { categoria } = req.query
    const conds = ['pr.disponible = true', 'pr.stock > 0']
    const vals = []
    let i = 1

    if (categoria) {
      conds.push(`p.ecommerce_categoria = $${i++}`)
      vals.push(categoria.toLowerCase())
    }

    const where = `WHERE ${conds.join(' AND ')}`

    const [marcasRes, precioRes, filtrosConfigRes] = await Promise.all([
      db.query(
        `SELECT DISTINCT m.id, m.nombre
         FROM marcas m
         JOIN productos p ON p.marca_id = m.id
         JOIN presentaciones pr ON pr.producto_id = p.id
         ${where}
         ORDER BY m.nombre ASC`,
        vals
      ),
      db.query(
        `SELECT
           MIN(${PRECIO_EF}) AS precio_min,
           MAX(${PRECIO_EF}) AS precio_max
         FROM presentaciones pr
         JOIN productos p ON p.id = pr.producto_id
         ${where}`,
        vals
      ),
      db.query(
        `SELECT campo, label, valor, label_valor, display_as, orden, incluye_valores
         FROM ecommerce_filtros_config
         WHERE (categorias IS NULL OR $1 = ANY(categorias))
           AND invisible IS NOT TRUE
         ORDER BY campo ASC, orden ASC`,
        [categoria || '']
      ).catch(() => ({ rows: [] })),
    ])

    // Agrupar filtros por campo
    const filtrosMap = {}
    filtrosConfigRes.rows.forEach(row => {
      if (!filtrosMap[row.campo]) {
        filtrosMap[row.campo] = { campo: row.campo, label: row.label, display_as: row.display_as, valores: [] }
      }
      filtrosMap[row.campo].valores.push({
        valor: row.valor,
        label_valor: row.label_valor,
        incluye_valores: row.incluye_valores ?? null,
      })
    })

    res.json({
      marcas:     marcasRes.rows,
      precio_min: Number(precioRes.rows[0]?.precio_min || 0),
      precio_max: Number(precioRes.rows[0]?.precio_max || 0),
      filtros:    Object.values(filtrosMap),
    })
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── GET /api/ecommerce/admin/estadisticas ────────────────────
router.get('/admin/estadisticas', autenticar, verificarPermiso('ecommerce', 'ver'), async (req, res) => {
  try {
    const { periodo = 'mes' } = req.query

    let intervalo
    switch (periodo) {
      case 'semana':    intervalo = '7 days';  break
      case 'trimestre': intervalo = '90 days'; break
      default:          intervalo = '30 days'
    }

    // ordenes_pedido no tiene columna "total" — se calcula sumando los items
    // de cada pedido mas el costo de delivery, igual que en GET /mis-pedidos.
    const ordenesTotalesCTE = `
      WITH ordenes_totales AS (
        SELECT op.id, op.estado, op.tipo_entrega, op.created_at,
               COALESCE(SUM(opi.precio_total), 0) + COALESCE(op.costo_delivery, 0) AS total
        FROM ordenes_pedido op
        LEFT JOIN ordenes_pedido_items opi ON opi.orden_id = op.id
        WHERE op.canal = 'pagina_web'
          AND op.created_at >= NOW() - INTERVAL '${intervalo}'
        GROUP BY op.id, op.estado, op.tipo_entrega, op.created_at, op.costo_delivery
      )`

    // KPIs generales
    const kpis = await db.query(
      `${ordenesTotalesCTE}
       SELECT
         COUNT(*)                           AS total_pedidos,
         COALESCE(SUM(total), 0)            AS total_ingresos,
         COALESCE(AVG(total), 0)            AS ticket_promedio,
         COUNT(*) FILTER (WHERE estado = 'pendiente')   AS pendientes,
         COUNT(*) FILTER (WHERE estado = 'confirmado')  AS confirmados,
         COUNT(*) FILTER (WHERE estado = 'entregado')   AS entregados,
         COUNT(*) FILTER (WHERE estado = 'cancelado')   AS cancelados
       FROM ordenes_totales`
    )

    // Pedidos por dia
    const porDia = await db.query(
      `${ordenesTotalesCTE}
       SELECT
         DATE(created_at AT TIME ZONE 'America/Asuncion') AS fecha,
         COUNT(*)                                         AS cantidad,
         COALESCE(SUM(total), 0)                          AS total
       FROM ordenes_totales
       GROUP BY 1
       ORDER BY 1 ASC`
    )

    // Delivery vs retiro
    const porEntrega = await db.query(
      `${ordenesTotalesCTE}
       SELECT
         tipo_entrega,
         COUNT(*) AS cantidad,
         COALESCE(SUM(total), 0) AS total
       FROM ordenes_totales
       GROUP BY tipo_entrega`
    )

    // Top 10 productos mas pedidos
    const topProductos = await db.query(
      `SELECT
         p.nombre   AS nombre,
         pr.nombre  AS presentacion,
         SUM(opi.cantidad)       AS unidades,
         SUM(opi.precio_total)   AS total
       FROM ordenes_pedido_items opi
       JOIN ordenes_pedido op ON op.id = opi.orden_id
       JOIN presentaciones pr ON pr.id = opi.presentacion_id
       JOIN productos p ON p.id = pr.producto_id
       WHERE op.canal = 'pagina_web'
         AND op.created_at >= NOW() - INTERVAL '${intervalo}'
       GROUP BY p.nombre, pr.nombre
       ORDER BY unidades DESC
       LIMIT 10`
    )

    // Nuevos clientes ecommerce en el periodo
    const nuevosClientes = await db.query(
      `SELECT COUNT(*) AS total
       FROM clientes
       WHERE canal_origen = 'ecommerce'
         AND created_at >= NOW() - INTERVAL '${intervalo}'`
    )

    res.json({
      kpis: kpis.rows[0],
      por_dia: porDia.rows,
      por_entrega: porEntrega.rows,
      top_productos: topProductos.rows,
      nuevos_clientes: parseInt(nuevosClientes.rows[0]?.total || 0),
    })
  } catch (error) {
    if (error.code === '42P01') {
      return res.json({
        kpis: { total_pedidos: 0, total_ingresos: 0, ticket_promedio: 0, pendientes: 0, confirmados: 0, entregados: 0, cancelados: 0 },
        por_dia: [], por_entrega: [], top_productos: [], nuevos_clientes: 0,
      })
    }
    manejarError(res, error)
  }
})

// ─── POST /api/ecommerce/vincular-cliente ─────────────────────
// Vincula un usuario autenticado de Supabase con el registro en clientes.
// Se llama desde el ecommerce al completar el primer pedido o el perfil.
// Requiere: { supabase_user_id, email, telefono, nombre }
// La actualizacion de perfiles.cliente_id se ejecuta cuando la tabla exista (paso 2).
router.post('/vincular-cliente', async (req, res) => {
  const client = await db.pool.connect()
  try {
    const { supabase_user_id, email, telefono, nombre } = req.body

    if (!supabase_user_id) {
      return res.status(400).json({ error: 'supabase_user_id es requerido' })
    }
    if (!email && !telefono) {
      return res.status(400).json({ error: 'Se requiere email o telefono para vincular' })
    }

    await client.query('BEGIN')

    // Buscar cliente existente por email o telefono
    const condiciones = []
    const valores = []
    let i = 1

    if (email) {
      condiciones.push(`LOWER(email) = LOWER($${i++})`)
      valores.push(email.trim())
    }
    if (telefono) {
      const telefonoLimpio = telefono.replace(/[^0-9+]/g, '')
      condiciones.push(`telefono ILIKE $${i++}`)
      valores.push(`%${telefonoLimpio}%`)
    }

    const existente = await client.query(
      `SELECT id FROM clientes WHERE ${condiciones.join(' OR ')} LIMIT 1`,
      valores
    )

    let clienteId
    let creado = false

    if (existente.rows.length > 0) {
      clienteId = existente.rows[0].id
    } else {
      // Crear nuevo cliente con origen ecommerce
      const telefonoLimpio = telefono?.replace(/[^0-9+\s()-]/g, '').trim() || null
      const nuevo = await client.query(
        `INSERT INTO clientes (tipo, nombre, email, telefono, origen)
         VALUES ('persona', $1, $2, $3, 'ecommerce')
         RETURNING id`,
        [nombre?.trim() || email?.split('@')[0] || 'Cliente web', email?.trim() || null, telefonoLimpio]
      )
      clienteId = nuevo.rows[0].id
      creado = true
    }

    // Intentar actualizar perfiles.cliente_id si la tabla ya existe (paso 2)
    try {
      await client.query(
        `UPDATE perfiles SET cliente_id = $1 WHERE id = $2`,
        [clienteId, supabase_user_id]
      )
    } catch (errPerfil) {
      // La tabla perfiles todavia no existe (paso 2 pendiente) — ignorar
      if (errPerfil.code !== '42P01') throw errPerfil
    }

    await client.query('COMMIT')

    res.json({ cliente_id: clienteId, creado, vinculado: true })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    manejarError(res, error)
  } finally {
    client.release()
  }
})

// ════════════════════════════════════════════════════════════════
// AUTH CLIENTES ECOMMERCE
// ════════════════════════════════════════════════════════════════

// ─── POST /api/ecommerce/auth/register ───────────────────────────
router.post('/auth/register', async (req, res) => {
  const client = await db.pool.connect()
  try {
    const { nombre, email, password, telefono } = req.body
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })
    if (!email?.trim()) return res.status(400).json({ error: 'El email es requerido' })
    if (!password || password.length < 6) return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' })

    const emailLimpio = email.trim().toLowerCase()

    // Verificar si el email ya tiene cuenta
    const existeUsuario = await client.query(
      `SELECT id FROM ecommerce_usuarios WHERE email = $1`,
      [emailLimpio]
    )
    if (existeUsuario.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe una cuenta con ese email' })
    }

    await client.query('BEGIN')

    // Buscar cliente existente por telefono o email
    let clienteId
    const telefonoLimpio = telefono?.replace(/[^0-9+\s()-]/g, '').trim() || null

    let clienteExistente = null
    if (telefonoLimpio) {
      const r = await client.query(`SELECT id FROM clientes WHERE telefono = $1 LIMIT 1`, [telefonoLimpio])
      if (r.rows.length) clienteExistente = r.rows[0]
    }
    if (!clienteExistente) {
      const r = await client.query(`SELECT id FROM clientes WHERE LOWER(email) = $1 LIMIT 1`, [emailLimpio])
      if (r.rows.length) clienteExistente = r.rows[0]
    }

    if (clienteExistente) {
      clienteId = clienteExistente.id
    } else {
      const nuevo = await client.query(
        `INSERT INTO clientes (nombre, telefono, email, canal_origen)
         VALUES ($1, $2, $3, 'ecommerce')
         RETURNING id`,
        [nombre.trim(), telefonoLimpio, emailLimpio]
      )
      clienteId = nuevo.rows[0].id
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const usuarioResult = await client.query(
      `INSERT INTO ecommerce_usuarios (cliente_id, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id`,
      [clienteId, emailLimpio, passwordHash]
    )

    await client.query('COMMIT')

    const token = jwt.sign(
      { tipo: 'ecommerce', usuario_id: usuarioResult.rows[0].id, cliente_id: clienteId, email: emailLimpio },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.status(201).json({
      token,
      usuario: { id: usuarioResult.rows[0].id, email: emailLimpio, nombre: nombre.trim(), cliente_id: clienteId },
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    manejarError(res, error)
  } finally {
    client.release()
  }
})

// ─── POST /api/ecommerce/auth/login ──────────────────────────────
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email y contrasena requeridos' })
    }

    const emailLimpio = email.trim().toLowerCase()
    const result = await db.query(
      `SELECT eu.id, eu.cliente_id, eu.email, eu.password_hash, eu.activo,
              c.nombre
       FROM ecommerce_usuarios eu
       JOIN clientes c ON c.id = eu.cliente_id
       WHERE eu.email = $1`,
      [emailLimpio]
    )

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Email o contrasena incorrectos' })
    }

    const usuario = result.rows[0]
    if (!usuario.activo) {
      return res.status(401).json({ error: 'Cuenta desactivada' })
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash)
    if (!passwordValida) {
      return res.status(401).json({ error: 'Email o contrasena incorrectos' })
    }

    await db.query(
      `UPDATE ecommerce_usuarios SET ultimo_acceso = NOW() WHERE id = $1`,
      [usuario.id]
    )

    const token = jwt.sign(
      { tipo: 'ecommerce', usuario_id: usuario.id, cliente_id: usuario.cliente_id, email: emailLimpio },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({
      token,
      usuario: { id: usuario.id, email: emailLimpio, nombre: usuario.nombre, cliente_id: usuario.cliente_id },
    })
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── GET /api/ecommerce/me ───────────────────────────────────────
router.get('/me', autenticarCliente, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT eu.id AS usuario_id, eu.email, eu.created_at,
              c.id AS cliente_id, c.nombre, c.telefono
       FROM ecommerce_usuarios eu
       JOIN clientes c ON c.id = eu.cliente_id
       WHERE eu.id = $1`,
      [req.cliente.usuario_id]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(result.rows[0])
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── PATCH /api/ecommerce/mis-datos ──────────────────────────────
router.patch('/mis-datos', autenticarCliente, async (req, res) => {
  try {
    const { nombre, telefono } = req.body
    const sets = []
    const vals = []
    let i = 1
    if (nombre?.trim()) { sets.push(`nombre = $${i++}`); vals.push(nombre.trim()) }
    if (telefono?.trim()) { sets.push(`telefono = $${i++}`); vals.push(telefono.trim()) }
    if (!sets.length) return res.json({ ok: true })
    vals.push(req.cliente.cliente_id)
    await db.query(`UPDATE clientes SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    res.json({ ok: true })
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── GET /api/ecommerce/ultimo-pedido-datos ──────────────────────
router.get('/ultimo-pedido-datos', autenticarCliente, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT tipo_entrega, ubicacion, maps_url, referencia, horario,
              contacto_entrega, metodo_pago, quiere_factura, ruc_factura,
              razon_social, zona_id, zona_delivery
       FROM ordenes_pedido
       WHERE cliente_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.cliente.cliente_id]
    )
    if (!result.rows.length) return res.json(null)
    const r = result.rows[0]
    res.json({
      tipo_entrega:     r.tipo_entrega || 'delivery',
      direccion:        r.ubicacion    || '',
      maps_url:         r.maps_url     || '',
      referencia:       r.referencia   || '',
      horario:          r.horario      || '',
      contacto_entrega: r.contacto_entrega || '',
      metodo_pago:      r.metodo_pago  || '',
      quiere_factura:   r.quiere_factura || false,
      razon_social:     r.razon_social || '',
      ruc_factura:      r.ruc_factura  || '',
      zona_id:          r.zona_id ? String(r.zona_id) : '',
      zona_nombre:      r.zona_delivery || '',
    })
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── GET /api/ecommerce/mis-pedidos ──────────────────────────────
router.get('/mis-pedidos', autenticarCliente, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         op.id,
         op.numero_pedido AS numero,
         op.estado,
         COALESCE(SUM(opi.precio_total), 0) + COALESCE(op.costo_delivery, 0) AS total,
         op.tipo_entrega,
         op.created_at AS fecha,
         op.notas,
         COALESCE(json_agg(
           json_build_object(
             'nombre', p.nombre || ' — ' || pr.nombre,
             'cantidad', opi.cantidad,
             'precio', opi.precio_unitario
           ) ORDER BY opi.id
         ) FILTER (WHERE opi.id IS NOT NULL), '[]') AS items
       FROM ordenes_pedido op
       LEFT JOIN ordenes_pedido_items opi ON opi.orden_id = op.id
       LEFT JOIN presentaciones pr ON pr.id = opi.presentacion_id
       LEFT JOIN productos p ON p.id = pr.producto_id
       WHERE op.cliente_id = $1
       GROUP BY op.id, op.numero_pedido, op.estado, op.tipo_entrega, op.created_at, op.notas, op.costo_delivery
       ORDER BY op.created_at DESC
       LIMIT 50`,
      [req.cliente.cliente_id]
    )
    res.json(result.rows)
  } catch (error) {
    manejarError(res, error)
  }
})

// ════════════════════════════════════════════════════════════════
// MASCOTAS
// ════════════════════════════════════════════════════════════════

router.get('/mascotas', autenticarCliente, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM ecommerce_mascotas WHERE cliente_id = $1 ORDER BY created_at ASC`,
      [req.cliente.cliente_id]
    )
    res.json(result.rows)
  } catch (error) {
    if (error.code === '42P01') return res.json([])
    manejarError(res, error)
  }
})

router.post('/mascotas', autenticarCliente, async (req, res) => {
  try {
    const { nombre, especie = 'perro', raza, peso_kg, fecha_nacimiento, notas } = req.body
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })
    const result = await db.query(
      `INSERT INTO ecommerce_mascotas (cliente_id, nombre, especie, raza, peso_kg, fecha_nacimiento, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.cliente.cliente_id, nombre.trim(), especie, raza || null, peso_kg || null, fecha_nacimiento || null, notas || null]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    manejarError(res, error)
  }
})

router.patch('/mascotas/:id', autenticarCliente, async (req, res) => {
  try {
    const { nombre, especie, raza, peso_kg, fecha_nacimiento, notas } = req.body
    const result = await db.query(
      `UPDATE ecommerce_mascotas SET
         nombre = COALESCE($1, nombre),
         especie = COALESCE($2, especie),
         raza = COALESCE($3, raza),
         peso_kg = COALESCE($4, peso_kg),
         fecha_nacimiento = COALESCE($5, fecha_nacimiento),
         notas = COALESCE($6, notas)
       WHERE id = $7 AND cliente_id = $8 RETURNING *`,
      [nombre?.trim() || null, especie || null, raza !== undefined ? raza || null : undefined,
       peso_kg !== undefined ? peso_kg || null : undefined, fecha_nacimiento || null,
       notas !== undefined ? notas || null : undefined, req.params.id, req.cliente.cliente_id]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'No encontrada' })
    res.json(result.rows[0])
  } catch (error) {
    manejarError(res, error)
  }
})

router.delete('/mascotas/:id', autenticarCliente, async (req, res) => {
  try {
    await db.query(
      `DELETE FROM ecommerce_mascotas WHERE id = $1 AND cliente_id = $2`,
      [req.params.id, req.cliente.cliente_id]
    )
    res.json({ ok: true })
  } catch (error) {
    manejarError(res, error)
  }
})

// ════════════════════════════════════════════════════════════════
// DIRECCIONES
// ════════════════════════════════════════════════════════════════

router.get('/direcciones', autenticarCliente, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM ecommerce_direcciones WHERE cliente_id = $1 ORDER BY es_principal DESC, created_at ASC`,
      [req.cliente.cliente_id]
    )
    res.json(result.rows)
  } catch (error) {
    if (error.code === '42P01') return res.json([])
    manejarError(res, error)
  }
})

router.post('/direcciones', autenticarCliente, async (req, res) => {
  const client = await db.pool.connect()
  try {
    const { alias = 'Casa', calle, ciudad = 'Asuncion', barrio, referencia, es_principal = false } = req.body
    if (!calle?.trim()) return res.status(400).json({ error: 'La calle es requerida' })
    await client.query('BEGIN')
    if (es_principal) {
      await client.query(
        `UPDATE ecommerce_direcciones SET es_principal = false WHERE cliente_id = $1`,
        [req.cliente.cliente_id]
      )
    }
    const result = await client.query(
      `INSERT INTO ecommerce_direcciones (cliente_id, alias, calle, ciudad, barrio, referencia, es_principal)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.cliente.cliente_id, alias, calle.trim(), ciudad, barrio || null, referencia || null, es_principal]
    )
    await client.query('COMMIT')
    res.status(201).json(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    manejarError(res, error)
  } finally {
    client.release()
  }
})

router.patch('/direcciones/:id', autenticarCliente, async (req, res) => {
  const client = await db.pool.connect()
  try {
    const { alias, calle, ciudad, barrio, referencia, es_principal } = req.body
    await client.query('BEGIN')
    if (es_principal) {
      await client.query(
        `UPDATE ecommerce_direcciones SET es_principal = false WHERE cliente_id = $1`,
        [req.cliente.cliente_id]
      )
    }
    const result = await client.query(
      `UPDATE ecommerce_direcciones SET
         alias        = COALESCE($1, alias),
         calle        = COALESCE($2, calle),
         ciudad       = COALESCE($3, ciudad),
         barrio       = COALESCE($4, barrio),
         referencia   = COALESCE($5, referencia),
         es_principal = COALESCE($6, es_principal)
       WHERE id = $7 AND cliente_id = $8 RETURNING *`,
      [alias || null, calle?.trim() || null, ciudad || null, barrio !== undefined ? barrio || null : undefined,
       referencia !== undefined ? referencia || null : undefined, es_principal !== undefined ? es_principal : null,
       req.params.id, req.cliente.cliente_id]
    )
    await client.query('COMMIT')
    if (!result.rows.length) return res.status(404).json({ error: 'No encontrada' })
    res.json(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    manejarError(res, error)
  } finally {
    client.release()
  }
})

router.delete('/direcciones/:id', autenticarCliente, async (req, res) => {
  try {
    await db.query(
      `DELETE FROM ecommerce_direcciones WHERE id = $1 AND cliente_id = $2`,
      [req.params.id, req.cliente.cliente_id]
    )
    res.json({ ok: true })
  } catch (error) {
    manejarError(res, error)
  }
})

// ════════════════════════════════════════════════════════════════
// FICHAS DE FACTURACION
// ════════════════════════════════════════════════════════════════

router.get('/fichas-facturacion', autenticarCliente, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM ecommerce_fichas_facturacion WHERE cliente_id = $1 ORDER BY es_principal DESC, created_at ASC`,
      [req.cliente.cliente_id]
    )
    res.json(result.rows)
  } catch (error) {
    if (error.code === '42P01') return res.json([])
    manejarError(res, error)
  }
})

router.post('/fichas-facturacion', autenticarCliente, async (req, res) => {
  const client = await db.pool.connect()
  try {
    const { alias, nombre, ruc, telefono, email, es_principal = false } = req.body
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })
    await client.query('BEGIN')
    if (es_principal) {
      await client.query(
        `UPDATE ecommerce_fichas_facturacion SET es_principal = false WHERE cliente_id = $1`,
        [req.cliente.cliente_id]
      )
    }
    const result = await client.query(
      `INSERT INTO ecommerce_fichas_facturacion (cliente_id, alias, nombre, ruc, telefono, email, es_principal)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.cliente.cliente_id, alias || null, nombre.trim(), ruc || null, telefono || null, email || null, es_principal]
    )
    await client.query('COMMIT')
    res.status(201).json(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    manejarError(res, error)
  } finally {
    client.release()
  }
})

router.patch('/fichas-facturacion/:id', autenticarCliente, async (req, res) => {
  const client = await db.pool.connect()
  try {
    const { alias, nombre, ruc, telefono, email, es_principal } = req.body
    await client.query('BEGIN')
    if (es_principal) {
      await client.query(
        `UPDATE ecommerce_fichas_facturacion SET es_principal = false WHERE cliente_id = $1`,
        [req.cliente.cliente_id]
      )
    }
    const result = await client.query(
      `UPDATE ecommerce_fichas_facturacion SET
         alias        = COALESCE($1, alias),
         nombre       = COALESCE($2, nombre),
         ruc          = COALESCE($3, ruc),
         telefono     = COALESCE($4, telefono),
         email        = COALESCE($5, email),
         es_principal = COALESCE($6, es_principal)
       WHERE id = $7 AND cliente_id = $8 RETURNING *`,
      [alias !== undefined ? alias || null : undefined, nombre?.trim() || null, ruc !== undefined ? ruc || null : undefined,
       telefono !== undefined ? telefono || null : undefined, email !== undefined ? email || null : undefined,
       es_principal !== undefined ? es_principal : null, req.params.id, req.cliente.cliente_id]
    )
    await client.query('COMMIT')
    if (!result.rows.length) return res.status(404).json({ error: 'No encontrada' })
    res.json(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    manejarError(res, error)
  } finally {
    client.release()
  }
})

router.delete('/fichas-facturacion/:id', autenticarCliente, async (req, res) => {
  try {
    await db.query(
      `DELETE FROM ecommerce_fichas_facturacion WHERE id = $1 AND cliente_id = $2`,
      [req.params.id, req.cliente.cliente_id]
    )
    res.json({ ok: true })
  } catch (error) {
    manejarError(res, error)
  }
})

module.exports = router
