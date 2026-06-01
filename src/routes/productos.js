const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { registrarLog } = require('../middleware/auditoria')
const { autenticar, verificarPermiso } = require('../middleware/auth')
const XLSX = require('xlsx')

// 1. Ver todos los productos con sus presentaciones
router.get('/', autenticar, verificarPermiso('inventario', 'ver'), async (req, res) => {
    try {
        const productos = await db.query(
            `SELECT p.*, c.nombre as categoria_nombre, m.nombre as marca_nombre, sc.nombre as subcategoria_nombre
             FROM productos p
             LEFT JOIN categorias c ON p.categoria_id = c.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             LEFT JOIN subcategorias sc ON p.subcategoria_id = sc.id
             ORDER BY p.nombre ASC`
        )
        const presentaciones = await db.query(
            `SELECT pr.id, pr.producto_id, pr.nombre, pr.precio_venta, pr.precio_tarjeta, pr.precio_compra,
                    pr.precio_descuento, pr.descuento_activo, pr.descuento_desde,
                    pr.descuento_hasta, pr.descuento_stock, pr.stock, pr.disponible, pr.codigo_barras,
                    (SELECT MIN(l.fecha_vencimiento) FROM lotes l
                     WHERE l.presentacion_id = pr.id AND l.activo = true AND l.stock_actual > 0
                     AND l.fecha_vencimiento IS NOT NULL) as fecha_vencimiento_proxima,
                    (SELECT COUNT(*) FROM lotes l
                     WHERE l.presentacion_id = pr.id AND l.activo = true AND l.stock_actual > 0
                     AND l.fecha_vencimiento IS NOT NULL) as lotes_con_vencimiento
             FROM presentaciones pr ORDER BY pr.producto_id, pr.nombre ASC`
        )
        const resultado = productos.rows.map(producto => ({
            ...producto,
            presentaciones: presentaciones.rows.filter(pr => pr.producto_id === producto.id)
        }))
        res.json(resultado)
    } catch (error) {
        manejarError(res, error)
    }
})

// 2. Ver categorias
router.get('/categorias', autenticar, verificarPermiso('inventario', 'ver'), async (req, res) => {
    try {
        const { seccion } = req.query
        const resultado = seccion
            ? await db.query(`SELECT * FROM categorias WHERE seccion = $1 ORDER BY nombre ASC`, [seccion])
            : await db.query(`SELECT * FROM categorias ORDER BY nombre ASC`)
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Crear categoría
router.post('/categorias', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { nombre, descripcion, seccion } = req.body
        if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' })
        const resultado = await db.query(
            `INSERT INTO categorias (nombre, descripcion, seccion) VALUES ($1, $2, $3) RETURNING *`,
            [nombre, descripcion || null, seccion || null]
        )
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'inventario', entidad: 'categoria', entidad_id: resultado.rows[0].id, descripcion: `Categoría creada: ${resultado.rows[0].nombre}`, dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Editar categoría
router.patch('/categorias/:id', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, descripcion, disponible, seccion } = req.body
        const anterior = await db.query(`SELECT * FROM categorias WHERE id = $1`, [id])
        const resultado = await db.query(
            `UPDATE categorias SET nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion), disponible = COALESCE($3, disponible), seccion = COALESCE($4, seccion) WHERE id = $5 RETURNING *`,
            [nombre, descripcion, disponible, seccion, id]
        )
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' })
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'inventario', entidad: 'categoria', entidad_id: parseInt(id), descripcion: `Categoría editada: ${resultado.rows[0].nombre}`, dato_anterior: anterior.rows[0], dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Confirmar eliminación de categoría
router.delete('/categorias/:id/confirmar', autenticar, verificarPermiso('inventario', 'eliminar'), async (req, res) => {
    try {
        const { id } = req.params
        const anterior = await db.query(`SELECT * FROM categorias WHERE id = $1`, [id])
        await db.query(`UPDATE productos SET categoria_id = NULL WHERE categoria_id = $1`, [id])
        await db.query(`DELETE FROM categorias WHERE id = $1`, [id])
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'eliminar', modulo: 'inventario', entidad: 'categoria', entidad_id: parseInt(id), descripcion: `Categoría eliminada: ${anterior.rows[0]?.nombre}`, dato_anterior: anterior.rows[0], ip: req.ip }).catch(() => {})
        res.json({ ok: true })
    } catch (error) {
        manejarError(res, error)
    }
})

// Verificar si se puede eliminar categoría
router.delete('/categorias/:id', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { id } = req.params
        const productosAsociados = await db.query(`SELECT COUNT(*) as cantidad FROM productos WHERE categoria_id = $1`, [id])
        res.json({ ok: true, productos_asociados: parseInt(productosAsociados.rows[0].cantidad) })
    } catch (error) {
        manejarError(res, error)
    }
})

// 3. Ver marcas
router.get('/marcas', autenticar, verificarPermiso('inventario', 'ver'), async (req, res) => {
    try {
        const resultado = await db.query(`SELECT * FROM marcas WHERE disponible = true ORDER BY nombre ASC`)
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

router.delete('/marcas/:id', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { id } = req.params
        const productosAsociados = await db.query(`SELECT COUNT(*) as cantidad FROM productos WHERE marca_id = $1`, [id])
        res.json({ ok: true, productos_asociados: parseInt(productosAsociados.rows[0].cantidad) })
    } catch (error) {
        manejarError(res, error)
    }
})

router.delete('/marcas/:id/confirmar', autenticar, verificarPermiso('inventario', 'eliminar'), async (req, res) => {
    try {
        const { id } = req.params
        const anterior = await db.query(`SELECT * FROM marcas WHERE id = $1`, [id])
        await db.query(`UPDATE productos SET marca_id = NULL WHERE marca_id = $1`, [id])
        await db.query(`DELETE FROM marcas WHERE id = $1`, [id])
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'eliminar', modulo: 'inventario', entidad: 'marca', entidad_id: parseInt(id), descripcion: `Marca eliminada: ${anterior.rows[0]?.nombre}`, dato_anterior: anterior.rows[0], ip: req.ip }).catch(() => {})
        res.json({ ok: true })
    } catch (error) {
        manejarError(res, error)
    }
})

// Subcategorias
router.get('/subcategorias', autenticar, verificarPermiso('inventario', 'ver'), async (req, res) => {
    try {
        const { seccion } = req.query
        const resultado = seccion
            ? await db.query(`SELECT * FROM subcategorias WHERE seccion = $1 ORDER BY nombre ASC`, [seccion])
            : await db.query(`SELECT * FROM subcategorias ORDER BY nombre ASC`)
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

router.post('/subcategorias', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { nombre, descripcion, seccion, ecommerce_categoria, ecommerce_campo, ecommerce_valor } = req.body
        if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' })
        const resultado = await db.query(
            `INSERT INTO subcategorias (nombre, descripcion, seccion, ecommerce_categoria, ecommerce_campo, ecommerce_valor)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [nombre, descripcion || null, seccion || null, ecommerce_categoria || null, ecommerce_campo || null, ecommerce_valor || null]
        )
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'inventario', entidad: 'subcategoria', entidad_id: resultado.rows[0].id, descripcion: `Subcategoría creada: ${resultado.rows[0].nombre}`, dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

router.patch('/subcategorias/:id', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, descripcion, seccion, ecommerce_categoria, ecommerce_campo, ecommerce_valor } = req.body
        const anterior = await db.query(`SELECT * FROM subcategorias WHERE id = $1`, [id])
        const resultado = await db.query(
            `UPDATE subcategorias SET
               nombre = COALESCE($1, nombre),
               descripcion = COALESCE($2, descripcion),
               seccion = COALESCE($3, seccion),
               ecommerce_categoria = $4,
               ecommerce_campo     = $5,
               ecommerce_valor     = $6
             WHERE id = $7 RETURNING *`,
            [nombre, descripcion, seccion, ecommerce_categoria || null, ecommerce_campo || null, ecommerce_valor || null, id]
        )
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Subcategoría no encontrada' })

        // Cascade: actualizar productos que usan esta subcategoria
        const sub = resultado.rows[0]
        if (sub.ecommerce_categoria || (sub.ecommerce_campo && sub.ecommerce_valor)) {
            await db.query(
                `UPDATE productos SET
                   ecommerce_categoria = COALESCE($1, ecommerce_categoria),
                   atributos = CASE
                     WHEN $2 IS NOT NULL AND $3 IS NOT NULL
                     THEN jsonb_build_object($2::text, $3::text)
                     ELSE COALESCE(atributos, '{}')
                   END
                 WHERE subcategoria_id = $4`,
                [sub.ecommerce_categoria || null, sub.ecommerce_campo || null, sub.ecommerce_valor || null, id]
            )
        }

        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'inventario', entidad: 'subcategoria', entidad_id: parseInt(id), descripcion: `Subcategoría editada: ${sub.nombre}`, dato_anterior: anterior.rows[0], dato_nuevo: sub, ip: req.ip }).catch(() => {})
        res.json(sub)
    } catch (error) {
        manejarError(res, error)
    }
})

router.delete('/subcategorias/:id/confirmar', autenticar, verificarPermiso('inventario', 'eliminar'), async (req, res) => {
    try {
        const { id } = req.params
        const anterior = await db.query(`SELECT * FROM subcategorias WHERE id = $1`, [id])
        await db.query(`UPDATE productos SET subcategoria_id = NULL WHERE subcategoria_id = $1`, [id])
        await db.query(`DELETE FROM subcategorias WHERE id = $1`, [id])
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'eliminar', modulo: 'inventario', entidad: 'subcategoria', entidad_id: parseInt(id), descripcion: `Subcategoría eliminada: ${anterior.rows[0]?.nombre}`, dato_anterior: anterior.rows[0], ip: req.ip }).catch(() => {})
        res.json({ ok: true })
    } catch (error) {
        manejarError(res, error)
    }
})

router.delete('/subcategorias/:id', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { id } = req.params
        const productosAsociados = await db.query(`SELECT COUNT(*) as cantidad FROM productos WHERE subcategoria_id = $1`, [id])
        res.json({ ok: true, productos_asociados: parseInt(productosAsociados.rows[0].cantidad) })
    } catch (error) {
        manejarError(res, error)
    }
})

// ─── Secciones de inventario ─────────────────────────────────
router.get('/secciones', autenticar, verificarPermiso('inventario', 'ver'), async (req, res) => {
    try {
        const r = await db.query(`SELECT * FROM secciones_inventario ORDER BY orden ASC, id ASC`)
        res.json(r.rows)
    } catch (error) {
        if (error.code === '42P01') return res.json([])
        manejarError(res, error)
    }
})

router.post('/secciones', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { nombre, slug, color = '#1a1a2e', orden = 0, tipo = 'generico' } = req.body
        if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })
        if (!slug?.trim()) return res.status(400).json({ error: 'El slug es requerido' })
        if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).json({ error: 'El slug solo puede tener letras minusculas, numeros, guiones y guiones bajos' })
        const tiposValidos = ['generico', 'con_especie', 'con_calidad_especie']
        if (!tiposValidos.includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' })
        const r = await db.query(
            `INSERT INTO secciones_inventario (nombre, slug, color, orden, tipo) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [nombre.trim(), slug.trim(), color, orden, tipo]
        )
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'inventario', entidad: 'seccion', entidad_id: r.rows[0].id, descripcion: `Sección creada: ${nombre}`, dato_nuevo: r.rows[0], ip: req.ip }).catch(() => {})
        res.status(201).json(r.rows[0])
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Ya existe una sección con ese slug' })
        manejarError(res, error)
    }
})

router.patch('/secciones/:id', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { nombre, color, orden, tipo } = req.body
        const r = await db.query(
            `UPDATE secciones_inventario SET
               nombre = COALESCE($1, nombre),
               color  = COALESCE($2, color),
               orden  = COALESCE($3, orden),
               tipo   = COALESCE($4, tipo)
             WHERE id = $5 RETURNING *`,
            [nombre?.trim() || null, color || null, orden ?? null, tipo || null, req.params.id]
        )
        if (!r.rows.length) return res.status(404).json({ error: 'Sección no encontrada' })
        res.json(r.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

router.delete('/secciones/:id', autenticar, verificarPermiso('inventario', 'eliminar'), async (req, res) => {
    try {
        const seccion = await db.query(`SELECT * FROM secciones_inventario WHERE id = $1`, [req.params.id])
        if (!seccion.rows.length) return res.status(404).json({ error: 'Sección no encontrada' })
        const slug = seccion.rows[0].slug
        const enUso = await db.query(`SELECT COUNT(*) AS c FROM productos WHERE seccion_inventario = $1`, [slug])
        if (parseInt(enUso.rows[0].c) > 0) {
            return res.status(409).json({ error: `No se puede eliminar: hay ${enUso.rows[0].c} producto(s) en esta sección. Movalos primero.` })
        }
        await db.query(`DELETE FROM secciones_inventario WHERE id = $1`, [req.params.id])
        await db.query(`UPDATE categorias SET seccion = NULL WHERE seccion = $1`, [slug])
        await db.query(`UPDATE subcategorias SET seccion = NULL WHERE seccion = $1`, [slug])
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'eliminar', modulo: 'inventario', entidad: 'seccion', entidad_id: parseInt(req.params.id), descripcion: `Sección eliminada: ${slug}`, dato_anterior: seccion.rows[0], ip: req.ip }).catch(() => {})
        res.json({ ok: true })
    } catch (error) {
        manejarError(res, error)
    }
})

// Buscar presentación por código de barras — ANTES de /:id
router.get('/codigo-barras/:codigo', autenticar, verificarPermiso('inventario', 'ver'), async (req, res) => {
    try {
        const { codigo } = req.params
        const resultado = await db.query(
            `SELECT pr.*, p.nombre as producto_nombre, p.id as producto_id,
                    m.nombre as marca_nombre, c.nombre as categoria_nombre,
                    p.calidad, p.categoria_id, p.marca_id, p.descripcion, p.sku
             FROM presentaciones pr
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             LEFT JOIN categorias c ON p.categoria_id = c.id
             WHERE pr.codigo_barras = $1
             AND pr.disponible = true
             AND pr.stock > 0`,
            [codigo]
        )
        if (!resultado.rows.length) {
            return res.status(404).json({ error: 'Producto no encontrado' })
        }
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Descargar template de stock pre-llenado con datos actuales
router.get('/template-stock', autenticar, verificarPermiso('inventario', 'ver'), async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT
                pr.id AS presentacion_id,
                p.nombre AS producto,
                COALESCE(m.nombre, '') AS marca,
                pr.nombre AS presentacion,
                COALESCE(pr.codigo_barras, '') AS codigo_barras,
                pr.stock AS stock_actual
             FROM presentaciones pr
             JOIN productos p ON p.id = pr.producto_id
             LEFT JOIN marcas m ON m.id = p.marca_id
             WHERE pr.disponible = true
             ORDER BY p.nombre ASC, pr.nombre ASC`
        )
        const filas = resultado.rows.map(r => ({
            presentacion_id: r.presentacion_id,
            producto: r.producto,
            marca: r.marca,
            presentacion: r.presentacion,
            codigo_barras: r.codigo_barras,
            stock_actual: r.stock_actual,
            stock_a_agregar: '',
            fecha_vencimiento: '',
            numero_lote: '',
        }))
        const ws = XLSX.utils.json_to_sheet(filas)
        ws['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 14 }]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Stock')
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
        res.setHeader('Content-Disposition', 'attachment; filename="template_stock.xlsx"')
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.send(buffer)
    } catch (error) {
        manejarError(res, error)
    }
})

// 4. Ver un producto específico
router.get('/:id', autenticar, verificarPermiso('inventario', 'ver'), async (req, res) => {
    try {
        const { id } = req.params
        const producto = await db.query(
            `SELECT p.*, c.nombre as categoria_nombre, m.nombre as marca_nombre
             FROM productos p
             LEFT JOIN categorias c ON p.categoria_id = c.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE p.id = $1`, [id]
        )
        if (producto.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' })
        const presentaciones = await db.query(
            `SELECT id, producto_id, nombre, precio_venta, precio_compra,
                    precio_descuento, descuento_activo, descuento_desde,
                    descuento_hasta, descuento_stock, stock, disponible, codigo_barras
             FROM presentaciones WHERE producto_id = $1 ORDER BY nombre ASC`, [id]
        )
        res.json({ ...producto.rows[0], presentaciones: presentaciones.rows })
    } catch (error) {
        manejarError(res, error)
    }
})

// Helper: derivar campos ecommerce desde subcategoria
async function ecommerceDesdeSubcategoria(subcategoria_id) {
    if (!subcategoria_id) return {}
    const sub = await db.query(`SELECT ecommerce_categoria, ecommerce_campo, ecommerce_valor FROM subcategorias WHERE id = $1`, [subcategoria_id])
    if (!sub.rows.length) return {}
    const { ecommerce_categoria, ecommerce_campo, ecommerce_valor } = sub.rows[0]
    const resultado = {}
    if (ecommerce_categoria) resultado.ecommerce_categoria = ecommerce_categoria
    if (ecommerce_campo && ecommerce_valor) resultado.atributos = { [ecommerce_campo]: ecommerce_valor }
    return resultado
}

// 5. Crear producto
router.post('/', autenticar, verificarPermiso('inventario', 'crear'), async (req, res) => {
    try {
        const { categoria_id, marca_id, nombre, descripcion, calidad, sku, especie, seccion_inventario, subcategoria_id } = req.body
        if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' })
        const eco = await ecommerceDesdeSubcategoria(subcategoria_id)
        const resultado = await db.query(
            `INSERT INTO productos (categoria_id, marca_id, nombre, descripcion, calidad, sku, especie, seccion_inventario, subcategoria_id, ecommerce_categoria, atributos)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [categoria_id || null, marca_id || null, nombre, descripcion || null, calidad || 'standard', sku || null, especie || null, seccion_inventario || null, subcategoria_id || null,
             eco.ecommerce_categoria || null, JSON.stringify(eco.atributos || {})]
        )
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'inventario', entidad: 'producto', entidad_id: resultado.rows[0].id, descripcion: `Producto creado: ${resultado.rows[0].nombre}`, dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 6. Editar producto
router.patch('/:id', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, descripcion, calidad, disponible, categoria_id, marca_id, sku, especie, seccion_inventario, subcategoria_id } = req.body
        const anterior = await db.query(`SELECT * FROM productos WHERE id = $1`, [id])

        // Si cambia la subcategoria, derivar campos ecommerce automáticamente
        const subcatCambio = subcategoria_id !== undefined && String(subcategoria_id) !== String(anterior.rows[0]?.subcategoria_id)
        const eco = subcatCambio ? await ecommerceDesdeSubcategoria(subcategoria_id) : {}

        const sets = [
            'nombre = COALESCE($1, nombre)',
            'descripcion = COALESCE($2, descripcion)',
            'calidad = COALESCE($3, calidad)',
            'disponible = COALESCE($4, disponible)',
            'categoria_id = COALESCE($5, categoria_id)',
            'marca_id = COALESCE($6, marca_id)',
            'sku = COALESCE($7, sku)',
            'especie = $8',
            'seccion_inventario = $9',
            'subcategoria_id = $10',
        ]
        const vals = [nombre, descripcion, calidad, disponible, categoria_id || null, marca_id || null, sku, especie || null, seccion_inventario || null, subcategoria_id || null]
        let n = 11

        if (subcatCambio && eco.ecommerce_categoria) { sets.push(`ecommerce_categoria = $${n++}`); vals.push(eco.ecommerce_categoria) }
        if (subcatCambio && eco.atributos) { sets.push(`atributos = $${n++}::jsonb`); vals.push(JSON.stringify(eco.atributos)) }

        vals.push(id)
        const resultado = await db.query(`UPDATE productos SET ${sets.join(', ')} WHERE id = $${n} RETURNING *`, vals)
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' })
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'inventario', entidad: 'producto', entidad_id: parseInt(id), descripcion: `Producto editado: ${resultado.rows[0].nombre}`, dato_anterior: anterior.rows[0], dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 7. Crear marca
router.post('/marcas', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { nombre } = req.body
        if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' })
        const resultado = await db.query(`INSERT INTO marcas (nombre) VALUES ($1) RETURNING *`, [nombre])
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'inventario', entidad: 'marca', entidad_id: resultado.rows[0].id, descripcion: `Marca creada: ${resultado.rows[0].nombre}`, dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 8. Agregar presentación a un producto
router.post('/:id/presentaciones', autenticar, verificarPermiso('inventario', 'crear'), async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, precio_venta, precio_tarjeta, precio_compra, stock, codigo_barras } = req.body
        if (!nombre || !precio_venta) return res.status(400).json({ error: 'Nombre y precio de venta son requeridos' })
        const resultado = await db.query(
            `INSERT INTO presentaciones (producto_id, nombre, precio_venta, precio_tarjeta, precio_compra, stock, codigo_barras)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [id, nombre, precio_venta, precio_tarjeta || null, precio_compra || 0, stock || 0, codigo_barras || null]
        )
        const producto = await db.query(`SELECT nombre FROM productos WHERE id = $1`, [id])
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'inventario', entidad: 'presentacion', entidad_id: resultado.rows[0].id, descripcion: `Presentación creada: ${nombre} — ${producto.rows[0]?.nombre} — Gs. ${precio_venta.toLocaleString()}`, dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 9. Actualizar precio y descuento de una presentación
router.patch('/presentaciones/:id/precio', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { id } = req.params
        const { precio_venta, precio_tarjeta, precio_compra, precio_descuento, precio_compra_descuento, descuento_activo, descuento_desde, descuento_hasta, descuento_stock } = req.body
        const anterior = await db.query(`SELECT * FROM presentaciones WHERE id = $1`, [id])
        const resultado = await db.query(
            `UPDATE presentaciones SET precio_venta = COALESCE($1, precio_venta), precio_tarjeta = $2, precio_compra = COALESCE($3, precio_compra), precio_descuento = $4, precio_compra_descuento = $5, descuento_activo = COALESCE($6, descuento_activo), descuento_desde = $7, descuento_hasta = $8, descuento_stock = $9 WHERE id = $10 RETURNING *`,
            [precio_venta, precio_tarjeta || null, precio_compra, precio_descuento, precio_compra_descuento, descuento_activo, descuento_desde, descuento_hasta, descuento_stock, id]
        )
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Presentación no encontrada' })
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'inventario', entidad: 'presentacion', entidad_id: parseInt(id), descripcion: `Precio actualizado: ${resultado.rows[0].nombre} — Gs. ${anterior.rows[0]?.precio_venta?.toLocaleString()} → Gs. ${precio_venta?.toLocaleString()}`, dato_anterior: { precio_venta: anterior.rows[0]?.precio_venta, precio_compra: anterior.rows[0]?.precio_compra }, dato_nuevo: { precio_venta, precio_compra }, ip: req.ip }).catch(() => {})
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 10. Actualizar stock (con sincronización FEFO de lotes)
router.patch('/presentaciones/:id/stock', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { id } = req.params
        const { stock } = req.body
        if (stock === undefined || stock < 0) return res.status(400).json({ error: 'Stock inválido' })

        await client.query('BEGIN')
        const anterior = await client.query(`SELECT stock, nombre FROM presentaciones WHERE id = $1`, [id])
        if (!anterior.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Presentación no encontrada' }) }

        const stockAnterior = anterior.rows[0].stock
        const delta = stock - stockAnterior

        if (delta < 0) {
            // Al bajar stock manualmente, descontar de lotes por FEFO
            const lotes = await client.query(
                `SELECT id, stock_actual FROM lotes WHERE presentacion_id = $1 AND activo = true AND stock_actual > 0 ORDER BY fecha_vencimiento ASC NULLS LAST`,
                [id]
            )
            let restante = Math.abs(delta)
            for (const lote of lotes.rows) {
                if (restante <= 0) break
                const aDescontar = Math.min(lote.stock_actual, restante)
                await client.query(`UPDATE lotes SET stock_actual = stock_actual - $1, updated_at = NOW() WHERE id = $2`, [aDescontar, lote.id])
                restante -= aDescontar
            }
        }
        // Si delta > 0: stock flotante sin lote asignado (ajuste manual hacia arriba)

        const resultado = await client.query(`UPDATE presentaciones SET stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [stock, id])
        await client.query('COMMIT')

        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'inventario', entidad: 'presentacion', entidad_id: parseInt(id), descripcion: `Stock actualizado: ${anterior.rows[0]?.nombre} — ${stockAnterior} → ${stock}`, dato_anterior: { stock: stockAnterior }, dato_nuevo: { stock }, ip: req.ip }).catch(() => {})
        res.json(resultado.rows[0])
    } catch (error) {
        await client.query('ROLLBACK')
        manejarError(res, error)
    } finally {
        client.release()
    }
})

// 11. Toggle disponible de un producto completo
router.patch('/:id/disponible', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { id } = req.params
        const { disponible } = req.body
        if (typeof disponible !== 'boolean') return res.status(400).json({ error: 'disponible debe ser boolean' })
        const anterior = await db.query(`SELECT nombre, disponible FROM productos WHERE id = $1`, [id])
        const resultado = await db.query(`UPDATE productos SET disponible = $1 WHERE id = $2 RETURNING *`, [disponible, id])
        if (!resultado.rows.length) return res.status(404).json({ error: 'Producto no encontrado' })
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'inventario', entidad: 'producto', entidad_id: parseInt(id), descripcion: `Producto ${disponible ? 'activado' : 'desactivado'}: ${anterior.rows[0]?.nombre}`, dato_anterior: { disponible: anterior.rows[0]?.disponible }, dato_nuevo: { disponible }, ip: req.ip }).catch(() => {})
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 12. Desactivar presentación
router.patch('/presentaciones/:id/disponible', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { id } = req.params
        const { disponible } = req.body
        const anterior = await db.query(`SELECT nombre, disponible FROM presentaciones WHERE id = $1`, [id])
        const resultado = await db.query(`UPDATE presentaciones SET disponible = $1 WHERE id = $2 RETURNING *`, [disponible, id])
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Presentación no encontrada' })
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'inventario', entidad: 'presentacion', entidad_id: parseInt(id), descripcion: `Presentación ${disponible ? 'activada' : 'desactivada'}: ${anterior.rows[0]?.nombre}`, dato_anterior: { disponible: anterior.rows[0]?.disponible }, dato_nuevo: { disponible }, ip: req.ip }).catch(() => {})
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 12. Actualizar codigo de barras de una presentación
router.patch('/presentaciones/:id/codigos', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    try {
        const { id } = req.params
        const { codigo_barras } = req.body
        const anterior = await db.query(`SELECT nombre, codigo_barras FROM presentaciones WHERE id = $1`, [id])
        const resultado = await db.query(`UPDATE presentaciones SET codigo_barras = $1 WHERE id = $2 RETURNING *`, [codigo_barras || null, id])
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Presentacion no encontrada' })
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'inventario', entidad: 'presentacion', entidad_id: parseInt(id), descripcion: `Código de barras actualizado: ${anterior.rows[0]?.nombre}`, dato_anterior: { codigo_barras: anterior.rows[0]?.codigo_barras }, dato_nuevo: { codigo_barras }, ip: req.ip }).catch(() => {})
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Eliminar presentacion
router.delete('/presentaciones/:id', autenticar, verificarPermiso('inventario', 'eliminar'), async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { id } = req.params
        const pr = await client.query(`SELECT pr.*, p.nombre as producto_nombre FROM presentaciones pr JOIN productos p ON p.id = pr.producto_id WHERE pr.id = $1`, [id])
        if (!pr.rows.length) return res.status(404).json({ error: 'Presentación no encontrada' })

        const enVentas = await client.query(
            `SELECT COUNT(*) as c FROM ventas_items WHERE presentacion_id = $1
             UNION ALL
             SELECT COUNT(*) as c FROM ordenes_pedido_items WHERE presentacion_id = $1`,
            [id]
        )
        const totalEnVentas = enVentas.rows.reduce((sum, r) => sum + parseInt(r.c), 0)
        if (totalEnVentas > 0) {
            return res.status(409).json({ error: `No se puede eliminar: esta presentación tiene ${totalEnVentas} movimiento(s) en ventas/pedidos.` })
        }

        await client.query('BEGIN')
        await client.query(`DELETE FROM lotes WHERE presentacion_id = $1`, [id])
        await client.query(`DELETE FROM presentaciones WHERE id = $1`, [id])
        await client.query('COMMIT')

        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'eliminar', modulo: 'inventario', entidad: 'presentacion', entidad_id: parseInt(id), descripcion: `Presentación eliminada: ${pr.rows[0].nombre} — ${pr.rows[0].producto_nombre}`, dato_anterior: pr.rows[0], ip: req.ip }).catch(() => {})
        res.json({ ok: true })
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        manejarError(res, error)
    } finally {
        client.release()
    }
})

// Eliminar producto completo
router.delete('/:id', autenticar, verificarPermiso('inventario', 'eliminar'), async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { id } = req.params
        const producto = await client.query(`SELECT * FROM productos WHERE id = $1`, [id])
        if (!producto.rows.length) return res.status(404).json({ error: 'Producto no encontrado' })

        const presentaciones = await client.query(`SELECT id FROM presentaciones WHERE producto_id = $1`, [id])
        const ids = presentaciones.rows.map(r => r.id)

        if (ids.length > 0) {
            const enVentas = await client.query(
                `SELECT (SELECT COUNT(*) FROM ventas_items WHERE presentacion_id = ANY($1)) +
                        (SELECT COUNT(*) FROM ordenes_pedido_items WHERE presentacion_id = ANY($1)) AS total`,
                [ids]
            )
            if (parseInt(enVentas.rows[0].total) > 0) {
                return res.status(409).json({ error: `No se puede eliminar: el producto tiene movimientos en ventas/pedidos.` })
            }
        }

        await client.query('BEGIN')
        if (ids.length > 0) {
            await client.query(`DELETE FROM lotes WHERE presentacion_id = ANY($1)`, [ids])
            await client.query(`DELETE FROM presentaciones WHERE producto_id = $1`, [id])
        }
        await client.query(`DELETE FROM productos WHERE id = $1`, [id])
        await client.query('COMMIT')

        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'eliminar', modulo: 'inventario', entidad: 'producto', entidad_id: parseInt(id), descripcion: `Producto eliminado: ${producto.rows[0].nombre}`, dato_anterior: producto.rows[0], ip: req.ip }).catch(() => {})
        res.json({ ok: true })
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        manejarError(res, error)
    } finally {
        client.release()
    }
})

// Importar lista de precios desde Excel (ya parseado a JSON en el frontend)
router.post('/importar', autenticar, verificarPermiso('inventario', 'crear'), async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { filas } = req.body
        if (!Array.isArray(filas) || filas.length === 0) {
            return res.status(400).json({ error: 'No hay filas para importar' })
        }

        await client.query('BEGIN')

        let creados = 0
        let actualizados = 0
        const errores = []

        for (const [idx, fila] of filas.entries()) {
            try {
                const nombre = String(fila.nombre_producto || '').trim()
                const nombrePres = String(fila.presentacion || '').trim()
                if (!nombre || !nombrePres) {
                    errores.push({ fila: idx + 2, mensaje: 'Falta nombre_producto o presentacion' })
                    continue
                }
                const precioVenta = parseInt(fila.precio_venta) || 0
                if (!precioVenta) {
                    errores.push({ fila: idx + 2, mensaje: `${nombre} — ${nombrePres}: precio_venta requerido` })
                    continue
                }

                // 1. Buscar o crear marca
                let marcaId = null
                if (fila.marca?.trim()) {
                    const marcaExist = await client.query(`SELECT id FROM marcas WHERE LOWER(nombre) = LOWER($1)`, [fila.marca.trim()])
                    if (marcaExist.rows.length > 0) {
                        marcaId = marcaExist.rows[0].id
                    } else {
                        const nuevaMarca = await client.query(`INSERT INTO marcas (nombre) VALUES ($1) RETURNING id`, [fila.marca.trim()])
                        marcaId = nuevaMarca.rows[0].id
                    }
                }

                // 2. Buscar o crear producto
                let productoId
                const prodExist = await client.query(
                    `SELECT id FROM productos WHERE LOWER(nombre) = LOWER($1) AND COALESCE(marca_id, 0) = COALESCE($2, 0)`,
                    [nombre, marcaId]
                )
                if (prodExist.rows.length > 0) {
                    productoId = prodExist.rows[0].id
                } else {
                    const calidades = ['standard', 'premium', 'premium_special', 'super_premium']
                    const calidad = calidades.includes(fila.calidad) ? fila.calidad : 'standard'
                    const especies = ['perro', 'gato', 'ambos']
                    const especie = especies.includes(fila.especie) ? fila.especie : null
                    const categorias = ['balanceados', 'accesorios', 'medicamentos', 'higiene', 'snacks']
                    const seccion = categorias.includes(fila.categoria) ? fila.categoria : null

                    // Buscar subcategoría por nombre si se proporcionó
                    let subcategoriaId = null
                    if (fila.subcategoria?.trim()) {
                        const subRes = await client.query(
                            `SELECT id FROM subcategorias WHERE LOWER(nombre) = LOWER($1) LIMIT 1`,
                            [fila.subcategoria.trim()]
                        )
                        if (subRes.rows.length > 0) subcategoriaId = subRes.rows[0].id
                    }

                    const sku = fila.sku?.trim() || null

                    const nuevoProd = await client.query(
                        `INSERT INTO productos (nombre, calidad, especie, seccion_inventario, marca_id, sku, subcategoria_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                        [nombre, calidad, especie, seccion, marcaId, sku, subcategoriaId]
                    )
                    productoId = nuevoProd.rows[0].id
                    creados++
                }

                // 3. Buscar o crear presentación
                const presExist = await client.query(
                    `SELECT id FROM presentaciones WHERE producto_id = $1 AND LOWER(nombre) = LOWER($2)`,
                    [productoId, nombrePres]
                )
                const precioCompra = parseInt(fila.precio_compra) || 0
                const precioTarjeta = parseInt(fila.precio_tarjeta) || null
                const stock = parseInt(fila.stock) || 0

                if (presExist.rows.length > 0) {
                    await client.query(
                        `UPDATE presentaciones SET precio_venta = $1, precio_compra = $2, precio_tarjeta = COALESCE($3, precio_tarjeta)
                         WHERE id = $4`,
                        [precioVenta, precioCompra, precioTarjeta, presExist.rows[0].id]
                    )
                    actualizados++
                } else {
                    await client.query(
                        `INSERT INTO presentaciones (producto_id, nombre, precio_venta, precio_compra, precio_tarjeta, stock)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [productoId, nombrePres, precioVenta, precioCompra, precioTarjeta, stock]
                    )
                    actualizados++
                }
            } catch (e) {
                errores.push({ fila: idx + 2, mensaje: e.message })
            }
        }

        await client.query('COMMIT')

        registrarLog({
            usuario_id: req.usuario?.id,
            usuario_nombre: req.usuario?.nombre,
            accion: 'crear',
            modulo: 'inventario',
            entidad: 'importacion',
            descripcion: `Importación: ${creados} productos nuevos, ${actualizados} presentaciones, ${errores.length} errores`,
            ip: req.ip
        }).catch(() => {})

        res.json({ creados, actualizados, errores })
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        manejarError(res, error)
    } finally {
        client.release()
    }
})


// Importar stock: suma unidades, actualiza código de barras, crea lotes
router.post('/importar-stock', autenticar, verificarPermiso('inventario', 'editar'), async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { filas } = req.body
        if (!Array.isArray(filas) || filas.length === 0) {
            return res.status(400).json({ error: 'No hay filas para importar' })
        }

        await client.query('BEGIN')

        let actualizados = 0
        let lotesCreados = 0
        const errores = []

        for (const [idx, fila] of filas.entries()) {
            try {
                const presentacionId = parseInt(fila.presentacion_id)
                if (!presentacionId || isNaN(presentacionId)) {
                    errores.push({ fila: idx + 2, mensaje: 'presentacion_id inválido — no modificar esa columna' })
                    continue
                }

                const stockAgregar = parseInt(fila.stock_a_agregar) || 0
                if (stockAgregar <= 0 && !fila.codigo_barras?.trim() && !fila.fecha_vencimiento?.trim()) continue

                // Verificar que la presentación existe
                const prRes = await client.query(`SELECT id, stock FROM presentaciones WHERE id = $1`, [presentacionId])
                if (!prRes.rows.length) {
                    errores.push({ fila: idx + 2, mensaje: `Presentación ${presentacionId} no encontrada` })
                    continue
                }

                // Actualizar código de barras si se proporcionó
                const codigoBarras = fila.codigo_barras?.trim() || null

                if (stockAgregar > 0 && fila.fecha_vencimiento?.trim()) {
                    // Con vencimiento → crear lote + sumar stock
                    const fechaVenc = new Date(fila.fecha_vencimiento)
                    if (isNaN(fechaVenc.getTime())) {
                        errores.push({ fila: idx + 2, mensaje: 'fecha_vencimiento inválida (usar formato YYYY-MM-DD)' })
                        continue
                    }
                    await client.query(
                        `INSERT INTO lotes (presentacion_id, numero_lote, fecha_vencimiento, stock_inicial, stock_actual, activo)
                         VALUES ($1, $2, $3, $4, $4, true)`,
                        [presentacionId, fila.numero_lote?.trim() || null, fechaVenc.toISOString().split('T')[0], stockAgregar]
                    )
                    lotesCreados++
                }

                if (stockAgregar > 0 || codigoBarras) {
                    await client.query(
                        `UPDATE presentaciones
                         SET stock = stock + $1,
                             codigo_barras = COALESCE(NULLIF($2, ''), codigo_barras)
                         WHERE id = $3`,
                        [stockAgregar, codigoBarras, presentacionId]
                    )
                    actualizados++
                }
            } catch (e) {
                errores.push({ fila: idx + 2, mensaje: e.message })
            }
        }

        await client.query('COMMIT')

        registrarLog({
            usuario_id: req.usuario?.id,
            usuario_nombre: req.usuario?.nombre,
            accion: 'editar',
            modulo: 'inventario',
            entidad: 'importacion_stock',
            descripcion: `Importación stock: ${actualizados} presentaciones actualizadas, ${lotesCreados} lotes creados, ${errores.length} errores`,
            ip: req.ip
        }).catch(() => {})

        res.json({ actualizados, lotesCreados, errores })
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        manejarError(res, error)
    } finally {
        client.release()
    }
})

module.exports = router