const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { registrarLog } = require('../middleware/auditoria')

// 1. Ver todos los productos con sus presentaciones
router.get('/', async (req, res) => {
    try {
        const productos = await db.query(
            `SELECT p.*, c.nombre as categoria_nombre, m.nombre as marca_nombre
             FROM productos p
             LEFT JOIN categorias c ON p.categoria_id = c.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             ORDER BY p.nombre ASC`
        )
        const presentaciones = await db.query(
            `SELECT id, producto_id, nombre, precio_venta, precio_compra,
                    precio_descuento, descuento_activo, descuento_desde,
                    descuento_hasta, descuento_stock, stock, disponible, codigo_barras
             FROM presentaciones ORDER BY producto_id, nombre ASC`
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
router.get('/categorias', async (req, res) => {
    try {
        const resultado = await db.query(`SELECT * FROM categorias ORDER BY nombre ASC`)
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Crear categoría
router.post('/categorias', async (req, res) => {
    try {
        const { nombre, descripcion } = req.body
        if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' })
        const resultado = await db.query(
            `INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *`,
            [nombre, descripcion || null]
        )
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'inventario', entidad: 'categoria', entidad_id: resultado.rows[0].id, descripcion: `Categoría creada: ${resultado.rows[0].nombre}`, dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Editar categoría
router.patch('/categorias/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, descripcion, disponible } = req.body
        const anterior = await db.query(`SELECT * FROM categorias WHERE id = $1`, [id])
        const resultado = await db.query(
            `UPDATE categorias SET nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion), disponible = COALESCE($3, disponible) WHERE id = $4 RETURNING *`,
            [nombre, descripcion, disponible, id]
        )
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' })
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'inventario', entidad: 'categoria', entidad_id: parseInt(id), descripcion: `Categoría editada: ${resultado.rows[0].nombre}`, dato_anterior: anterior.rows[0], dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Confirmar eliminación de categoría
router.delete('/categorias/:id/confirmar', async (req, res) => {
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
router.delete('/categorias/:id', async (req, res) => {
    try {
        const { id } = req.params
        const productosAsociados = await db.query(`SELECT COUNT(*) as cantidad FROM productos WHERE categoria_id = $1`, [id])
        res.json({ ok: true, productos_asociados: parseInt(productosAsociados.rows[0].cantidad) })
    } catch (error) {
        manejarError(res, error)
    }
})

// 3. Ver marcas
router.get('/marcas', async (req, res) => {
    try {
        const resultado = await db.query(`SELECT * FROM marcas WHERE disponible = true ORDER BY nombre ASC`)
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

router.delete('/marcas/:id', async (req, res) => {
    try {
        const { id } = req.params
        const productosAsociados = await db.query(`SELECT COUNT(*) as cantidad FROM productos WHERE marca_id = $1`, [id])
        res.json({ ok: true, productos_asociados: parseInt(productosAsociados.rows[0].cantidad) })
    } catch (error) {
        manejarError(res, error)
    }
})

router.delete('/marcas/:id/confirmar', async (req, res) => {
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

// Buscar presentación por código de barras — ANTES de /:id
router.get('/codigo-barras/:codigo', async (req, res) => {
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

// 4. Ver un producto específico
router.get('/:id', async (req, res) => {
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

// 5. Crear producto
router.post('/', async (req, res) => {
    try {
        const { categoria_id, marca_id, nombre, descripcion, calidad, sku } = req.body
        if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' })
        const resultado = await db.query(
            `INSERT INTO productos (categoria_id, marca_id, nombre, descripcion, calidad, sku)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [categoria_id, marca_id, nombre, descripcion, calidad || 'standard', sku || null]
        )
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'inventario', entidad: 'producto', entidad_id: resultado.rows[0].id, descripcion: `Producto creado: ${resultado.rows[0].nombre}`, dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 6. Editar producto
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, descripcion, calidad, disponible, categoria_id, marca_id, sku } = req.body
        const anterior = await db.query(`SELECT * FROM productos WHERE id = $1`, [id])
        const resultado = await db.query(
            `UPDATE productos SET nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion), calidad = COALESCE($3, calidad), disponible = COALESCE($4, disponible), categoria_id = COALESCE($5, categoria_id), marca_id = COALESCE($6, marca_id), sku = COALESCE($7, sku) WHERE id = $8 RETURNING *`,
            [nombre, descripcion, calidad, disponible, categoria_id, marca_id, sku, id]
        )
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' })
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'inventario', entidad: 'producto', entidad_id: parseInt(id), descripcion: `Producto editado: ${resultado.rows[0].nombre}`, dato_anterior: anterior.rows[0], dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 7. Crear marca
router.post('/marcas', async (req, res) => {
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
router.post('/:id/presentaciones', async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, precio_venta, precio_compra, stock, codigo_barras } = req.body
        if (!nombre || !precio_venta) return res.status(400).json({ error: 'Nombre y precio de venta son requeridos' })
        const resultado = await db.query(
            `INSERT INTO presentaciones (producto_id, nombre, precio_venta, precio_compra, stock, codigo_barras)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [id, nombre, precio_venta, precio_compra || 0, stock || 0, codigo_barras || null]
        )
        const producto = await db.query(`SELECT nombre FROM productos WHERE id = $1`, [id])
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'inventario', entidad: 'presentacion', entidad_id: resultado.rows[0].id, descripcion: `Presentación creada: ${nombre} — ${producto.rows[0]?.nombre} — Gs. ${precio_venta.toLocaleString()}`, dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 9. Actualizar precio y descuento de una presentación
router.patch('/presentaciones/:id/precio', async (req, res) => {
    try {
        const { id } = req.params
        const { precio_venta, precio_compra, precio_descuento, precio_compra_descuento, descuento_activo, descuento_desde, descuento_hasta, descuento_stock } = req.body
        const anterior = await db.query(`SELECT * FROM presentaciones WHERE id = $1`, [id])
        const resultado = await db.query(
            `UPDATE presentaciones SET precio_venta = COALESCE($1, precio_venta), precio_compra = COALESCE($2, precio_compra), precio_descuento = $3, precio_compra_descuento = $4, descuento_activo = COALESCE($5, descuento_activo), descuento_desde = $6, descuento_hasta = $7, descuento_stock = $8 WHERE id = $9 RETURNING *`,
            [precio_venta, precio_compra, precio_descuento, precio_compra_descuento, descuento_activo, descuento_desde, descuento_hasta, descuento_stock, id]
        )
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Presentación no encontrada' })
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'inventario', entidad: 'presentacion', entidad_id: parseInt(id), descripcion: `Precio actualizado: ${resultado.rows[0].nombre} — Gs. ${anterior.rows[0]?.precio_venta?.toLocaleString()} → Gs. ${precio_venta?.toLocaleString()}`, dato_anterior: { precio_venta: anterior.rows[0]?.precio_venta, precio_compra: anterior.rows[0]?.precio_compra }, dato_nuevo: { precio_venta, precio_compra }, ip: req.ip }).catch(() => {})
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 10. Actualizar stock
router.patch('/presentaciones/:id/stock', async (req, res) => {
    try {
        const { id } = req.params
        const { stock } = req.body
        if (stock === undefined || stock < 0) return res.status(400).json({ error: 'Stock inválido' })
        const anterior = await db.query(`SELECT stock, nombre FROM presentaciones WHERE id = $1`, [id])
        const stockAnterior = anterior.rows[0]?.stock
        const resultado = await db.query(`UPDATE presentaciones SET stock = $1 WHERE id = $2 RETURNING *`, [stock, id])
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Presentación no encontrada' })
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'inventario', entidad: 'presentacion', entidad_id: parseInt(id), descripcion: `Stock actualizado: ${anterior.rows[0]?.nombre} — ${stockAnterior} → ${stock}`, dato_anterior: { stock: stockAnterior }, dato_nuevo: { stock }, ip: req.ip }).catch(() => {})
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 11. Desactivar presentación
router.patch('/presentaciones/:id/disponible', async (req, res) => {
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
router.patch('/presentaciones/:id/codigos', async (req, res) => {
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

module.exports = router