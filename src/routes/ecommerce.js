const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { autenticar } = require('../middleware/auth')

// ─── Helpers ─────────────────────────────────────────────────
function toSlug(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildProductSlug(nombreProducto, nombrePresentacion, presentacionId) {
  return `${toSlug(nombreProducto)}-${toSlug(nombrePresentacion)}-${presentacionId}`
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
router.get('/categorias', async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT
         c.id,
         c.nombre AS label,
         LOWER(REGEXP_REPLACE(c.nombre, '[^a-zA-Z0-9]+', '-', 'g')) AS slug,
         COUNT(DISTINCT p.id) FILTER (
           WHERE pr.stock > 0 AND pr.disponible = true
         ) AS count
       FROM categorias c
       LEFT JOIN productos p ON p.categoria_id = c.id
       LEFT JOIN presentaciones pr ON pr.producto_id = p.id
       GROUP BY c.id, c.nombre
       ORDER BY c.nombre ASC`
    )
    res.json(resultado.rows)
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── GET /api/ecommerce/productos ────────────────────────────
router.get('/productos', async (req, res) => {
  try {
    const {
      categoria,
      search,
      solo_disponibles = 'true',
      novedad,
      sort = 'relevancia',
      limit = 20,
      offset = 0,
    } = req.query

    const limitInt  = Math.min(parseInt(limit) || 20, 100)
    const offsetInt = parseInt(offset) || 0

    const condiciones = ['pr.disponible = true']
    const valores = []
    let i = 1

    if (solo_disponibles === 'true') {
      condiciones.push(`pr.stock > 0`)
    }

    if (categoria) {
      condiciones.push(
        `LOWER(REGEXP_REPLACE(c.nombre, '[^a-zA-Z0-9]+', '-', 'g')) = $${i++}`
      )
      valores.push(categoria.toLowerCase())
    }

    if (search) {
      condiciones.push(`(p.nombre ILIKE $${i} OR p.descripcion ILIKE $${i})`)
      valores.push(`%${search}%`)
      i++
    }

    if (novedad === 'true') {
      condiciones.push(`p.es_novedad = true`)
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''

    let orderBy
    switch (sort) {
      case 'precio_asc':  orderBy = 'pr.precio_venta ASC';  break
      case 'precio_desc': orderBy = 'pr.precio_venta DESC'; break
      case 'nombre':      orderBy = 'p.nombre ASC';          break
      default:            orderBy = 'p.nombre ASC'
    }

    // Conteo total para paginacion
    const countResult = await db.query(
      `SELECT COUNT(*) AS total
       FROM presentaciones pr
       JOIN productos p ON p.id = pr.producto_id
       LEFT JOIN categorias c ON c.id = p.categoria_id
       ${where}`,
      valores
    )

    const itemsResult = await db.query(
      `SELECT
         pr.id,
         pr.nombre AS presentacion_nombre,
         pr.precio_venta,
         pr.stock,
         p.id AS producto_id,
         p.nombre AS nombre_base,
         COALESCE(p.descripcion, '') AS descripcion,
         COALESCE(p.imagen_url, '') AS imagen_url,
         COALESCE(p.es_novedad, false) AS es_novedad,
         LOWER(REGEXP_REPLACE(c.nombre, '[^a-zA-Z0-9]+', '-', 'g')) AS categoria_slug,
         c.nombre AS categoria_nombre
       FROM presentaciones pr
       JOIN productos p ON p.id = pr.producto_id
       LEFT JOIN categorias c ON c.id = p.categoria_id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${i} OFFSET $${i + 1}`,
      [...valores, limitInt, offsetInt]
    )

    const items = itemsResult.rows.map(row => ({
      id: row.id,
      nombre: `${row.nombre_base} — ${row.presentacion_nombre}`,
      descripcion: row.descripcion,
      precio_venta: Number(row.precio_venta),
      stock: Number(row.stock),
      imagen_url: row.imagen_url || null,
      es_novedad: row.es_novedad,
      categoria_slug: row.categoria_slug,
      slug: buildProductSlug(row.nombre_base, row.presentacion_nombre, row.id),
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
router.get('/productos/:slug', async (req, res) => {
  try {
    // El slug tiene formato: nombre-presentacion-{id}
    // Extraemos el ID del final
    const parts = req.params.slug.split('-')
    const presentacionId = parseInt(parts[parts.length - 1])

    if (!presentacionId || isNaN(presentacionId)) {
      return res.status(400).json({ error: 'Slug invalido' })
    }

    const resultado = await db.query(
      `SELECT
         pr.id,
         pr.nombre AS presentacion_nombre,
         pr.precio_venta,
         pr.stock,
         p.id AS producto_id,
         p.nombre AS nombre_base,
         COALESCE(p.descripcion, '') AS descripcion,
         COALESCE(p.imagen_url, '') AS imagen_url,
         COALESCE(p.es_novedad, false) AS es_novedad,
         LOWER(REGEXP_REPLACE(c.nombre, '[^a-zA-Z0-9]+', '-', 'g')) AS categoria_slug,
         c.nombre AS categoria_nombre
       FROM presentaciones pr
       JOIN productos p ON p.id = pr.producto_id
       LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE pr.id = $1 AND pr.disponible = true`,
      [presentacionId]
    )

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    const row = resultado.rows[0]
    res.json({
      id: row.id,
      nombre: `${row.nombre_base} — ${row.presentacion_nombre}`,
      descripcion: row.descripcion,
      precio_venta: Number(row.precio_venta),
      stock: Number(row.stock),
      imagen_url: row.imagen_url || null,
      es_novedad: row.es_novedad,
      categoria_slug: row.categoria_slug,
      slug: buildProductSlug(row.nombre_base, row.presentacion_nombre, row.id),
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
    const { items, cliente, notas, tipo_entrega = 'delivery' } = req.body

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
        [cliente.nombre.trim(), telefonoLimpio, cliente.direccion.trim()]
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
        `SELECT id, precio_venta, stock, disponible FROM presentaciones WHERE id = $1 FOR UPDATE`,
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

      const subtotal = Number(presentacion.precio_venta) * item.cantidad
      total += subtotal

      itemsVerificados.push({
        presentacion_id: presentacion.id,
        cantidad: item.cantidad,
        precio_unitario: Number(presentacion.precio_venta),
        precio_total: subtotal,
      })
    }

    // 3. Generar numero de pedido
    const numeroResult = await client.query(
      `SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(numero_pedido, '[^0-9]', '', 'g'), '') AS INTEGER)), 0) + 1 AS siguiente
       FROM ordenes_pedido`
    )
    const numeroPedido = `ECO-${String(numeroResult.rows[0].siguiente).padStart(5, '0')}`

    // 4. Crear orden
    const ordenResult = await client.query(
      `INSERT INTO ordenes_pedido
         (cliente_id, canal, estado, total, notas, numero_pedido, tipo_entrega)
       VALUES ($1, 'pagina_web', 'pendiente', $2, $3, $4, $5)
       RETURNING id`,
      [clienteId, total, notas?.trim() || null, numeroPedido, tipo_entrega]
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

    // Obtener WhatsApp de la config para retiro
    let whatsappRetiro = null
    let mensajeRetiro = null
    if (tipo_entrega === 'retiro') {
      try {
        const cfg = await db.query(`SELECT clave, valor FROM tienda_config WHERE clave IN ('whatsapp','mensaje_retiro')`)
        const cfgMap = {}
        cfg.rows.forEach(r => { cfgMap[r.clave] = r.valor })
        whatsappRetiro = cfgMap.whatsapp || null
        const itemsTexto = itemsVerificados.map((it, idx) => {
          const orig = items[idx]
          return `• x${it.cantidad} — Gs. ${it.precio_total.toLocaleString('es-PY')}`
        }).join('\n')
        mensajeRetiro = encodeURIComponent(
          `Hola! Quiero retirar mi pedido *${numeroPedido}*\n${itemsTexto}\n*Total: Gs. ${total.toLocaleString('es-PY')}*`
        )
      } catch (_) {}
    }

    const mensajeDelivery = `Tu pedido ${numeroPedido} fue recibido. Nos comunicaremos al ${telefonoLimpio} para coordinar la entrega.`
    const mensajeRetiroTexto = `Tu pedido ${numeroPedido} fue registrado. Coordiná la retirada por WhatsApp.`

    res.status(201).json({
      pedido_id: ordenId,
      numero: numeroPedido,
      total,
      tipo_entrega,
      mensaje: tipo_entrega === 'retiro' ? mensajeRetiroTexto : mensajeDelivery,
      ...(tipo_entrega === 'retiro' && whatsappRetiro ? {
        whatsapp_url: `https://wa.me/${whatsappRetiro.replace(/\D/g, '')}?text=${mensajeRetiro}`,
      } : {}),
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    manejarError(res, error)
  } finally {
    client.release()
  }
})

// ════════════════════════════════════════════════════════════════
// RUTAS ADMIN — requieren autenticación dashboard
// ════════════════════════════════════════════════════════════════

// ─── GET /api/ecommerce/admin/config ──────────────────────────
router.get('/admin/config', autenticar, async (req, res) => {
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
router.put('/admin/config', autenticar, async (req, res) => {
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

// ─── GET /api/ecommerce/admin/banners ─────────────────────────
router.get('/admin/banners', autenticar, async (req, res) => {
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
router.post('/admin/banners', autenticar, async (req, res) => {
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
router.patch('/admin/banners/:id', autenticar, async (req, res) => {
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
router.delete('/admin/banners/:id', autenticar, async (req, res) => {
  try {
    await db.query(`DELETE FROM ecommerce_banners WHERE id = $1`, [req.params.id])
    res.json({ ok: true })
  } catch (error) {
    manejarError(res, error)
  }
})

// ─── GET /api/ecommerce/admin/productos ───────────────────────
// Lista presentaciones con campos editables para el ecommerce
router.get('/admin/productos', autenticar, async (req, res) => {
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
         p.id AS producto_id,
         p.nombre AS producto_nombre,
         p.descripcion,
         p.imagen_url,
         COALESCE(p.es_novedad, false) AS es_novedad,
         COALESCE(p.es_destacado, false) AS es_destacado,
         c.nombre AS categoria_nombre,
         m.nombre AS marca_nombre
       FROM presentaciones pr
       JOIN productos p ON p.id = pr.producto_id
       LEFT JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN marcas m ON m.id = p.marca_id
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
router.patch('/admin/productos/:presentacionId', autenticar, async (req, res) => {
  try {
    const { presentacionId } = req.params
    const { imagen_url, es_novedad, es_destacado, disponible } = req.body

    // Actualizar disponible en la presentacion
    if (disponible !== undefined) {
      await db.query(
        `UPDATE presentaciones SET disponible = $1 WHERE id = $2`,
        [disponible, presentacionId]
      )
    }

    // Obtener producto_id de esta presentacion
    const pr = await db.query(`SELECT producto_id FROM presentaciones WHERE id = $1`, [presentacionId])
    if (!pr.rows.length) return res.status(404).json({ error: 'Presentación no encontrada' })
    const productoId = pr.rows[0].producto_id

    // Actualizar campos en producto (COALESCE para no pisar con null si no vienen)
    const sets = []
    const vals = []
    let i = 1
    if (imagen_url !== undefined) { sets.push(`imagen_url = $${i++}`); vals.push(imagen_url) }
    if (es_novedad !== undefined) { sets.push(`es_novedad = $${i++}`); vals.push(es_novedad) }
    if (es_destacado !== undefined) { sets.push(`es_destacado = $${i++}`); vals.push(es_destacado) }

    if (sets.length) {
      vals.push(productoId)
      await db.query(`UPDATE productos SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    }

    res.json({ ok: true })
  } catch (error) {
    manejarError(res, error)
  }
})

module.exports = router
