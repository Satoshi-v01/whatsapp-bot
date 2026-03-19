const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')


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
                    descuento_hasta, descuento_stock, stock, disponible
             FROM presentaciones ORDER BY producto_id, nombre ASC`
        )

        const resultado = productos.rows.map(producto => ({
            ...producto,
            presentaciones: presentaciones.rows.filter(
                pr => pr.producto_id === producto.id
            )
        }))

        res.json(resultado)
    } catch (error) {
        manejarError(res, error)
    }
})

// 2. Ver categorias
router.get('/categorias', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT * FROM categorias ORDER BY nombre ASC`
        )
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
            `INSERT INTO categorias (nombre, descripcion)
             VALUES ($1, $2)
             RETURNING *`,
            [nombre, descripcion || null]
        )
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

        const resultado = await db.query(
            `UPDATE categorias
             SET nombre = COALESCE($1, nombre),
                 descripcion = COALESCE($2, descripcion),
                 disponible = COALESCE($3, disponible)
             WHERE id = $4
             RETURNING *`,
            [nombre, descripcion, disponible, id]
        )

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' })
        }

        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Confirmar eliminación de categoría — DEBE IR ANTES DE DELETE /categorias/:id
router.delete('/categorias/:id/confirmar', async (req, res) => {
    try {
        const { id } = req.params
        await db.query(`UPDATE productos SET categoria_id = NULL WHERE categoria_id = $1`, [id])
        await db.query(`DELETE FROM categorias WHERE id = $1`, [id])
        res.json({ ok: true })
    } catch (error) {
        manejarError(res, error)
    }
})

// Verificar si se puede eliminar categoría
router.delete('/categorias/:id', async (req, res) => {
    try {
        const { id } = req.params
        const productosAsociados = await db.query(
            `SELECT COUNT(*) as cantidad FROM productos WHERE categoria_id = $1`,
            [id]
        )
        const cantidad = parseInt(productosAsociados.rows[0].cantidad)
        res.json({ ok: true, productos_asociados: cantidad })
    } catch (error) {
        manejarError(res, error)
    }
})

// 3. Ver marcas
router.get('/marcas', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT * FROM marcas WHERE disponible = true ORDER BY nombre ASC`
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})


router.delete('/marcas/:id', async (req, res) => {
    try {
        const { id } = req.params

        const productosAsociados = await db.query(
            `SELECT COUNT(*) as cantidad FROM productos WHERE marca_id = $1`,
            [id]
        )

        const cantidad = parseInt(productosAsociados.rows[0].cantidad)

        res.json({ ok: true, productos_asociados: cantidad })

        // Solo eliminar si el frontend confirma con force=true
    } catch (error) {
        manejarError(res, error)
    }
})

router.delete('/marcas/:id/confirmar', async (req, res) => {
    try {
        const { id } = req.params

        await db.query(`UPDATE productos SET marca_id = NULL WHERE marca_id = $1`, [id])
        await db.query(`DELETE FROM marcas WHERE id = $1`, [id])

        res.json({ ok: true })
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
             WHERE p.id = $1`,
            [id]
        )

        if (producto.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' })
        }

        const presentaciones = await db.query(
            `SELECT id, producto_id, nombre, precio_venta, precio_compra,
                    precio_descuento, descuento_activo, descuento_desde,
                    descuento_hasta, descuento_stock, stock, disponible
             FROM presentaciones WHERE producto_id = $1 ORDER BY nombre ASC`,
            [id]
        )

        res.json({
            ...producto.rows[0],
            presentaciones: presentaciones.rows
        })
    } catch (error) {
        manejarError(res, error)
    }
})

// 5. Crear producto
router.post('/', async (req, res) => {
    try {
        const { categoria_id, marca_id, nombre, descripcion, calidad } = req.body

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es requerido' })
        }

        const resultado = await db.query(
            `INSERT INTO productos (categoria_id, marca_id, nombre, descripcion, calidad)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [categoria_id, marca_id, nombre, descripcion, calidad || 'standard']
        )

        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 6. Editar producto
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, descripcion, calidad, disponible, categoria_id, marca_id } = req.body

        const resultado = await db.query(
            `UPDATE productos
             SET nombre = COALESCE($1, nombre),
                 descripcion = COALESCE($2, descripcion),
                 calidad = COALESCE($3, calidad),
                 disponible = COALESCE($4, disponible),
                 categoria_id = COALESCE($5, categoria_id),
                 marca_id = COALESCE($6, marca_id)
             WHERE id = $7
             RETURNING *`,
            [nombre, descripcion, calidad, disponible, categoria_id, marca_id, id]
        )

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' })
        }

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

        const resultado = await db.query(
            `INSERT INTO marcas (nombre) VALUES ($1) RETURNING *`,
            [nombre]
        )
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 8. Agregar presentación a un producto
router.post('/:id/presentaciones', async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, precio_venta, precio_compra, stock } = req.body

        if (!nombre || !precio_venta) {
            return res.status(400).json({ error: 'Nombre y precio de venta son requeridos' })
        }

        const resultado = await db.query(
            `INSERT INTO presentaciones (producto_id, nombre, precio_venta, precio_compra, stock)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [id, nombre, precio_venta, precio_compra || 0, stock || 0]
        )

        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 9. Actualizar precio y descuento de una presentación
router.patch('/presentaciones/:id/precio', async (req, res) => {
    try {
        const { id } = req.params
        const {
            precio_venta,
            precio_compra,
            precio_descuento,
            precio_compra_descuento,
            descuento_activo,
            descuento_desde,
            descuento_hasta,
            descuento_stock
        } = req.body

        const resultado = await db.query(
            `UPDATE presentaciones
            SET precio_venta = COALESCE($1, precio_venta),
                precio_compra = COALESCE($2, precio_compra),
                precio_descuento = $3,
                precio_compra_descuento = $4,
                descuento_activo = COALESCE($5, descuento_activo),
                descuento_desde = $6,
                descuento_hasta = $7,
                descuento_stock = $8
            WHERE id = $9
            RETURNING *`,
            [precio_venta, precio_compra, precio_descuento, precio_compra_descuento,
            descuento_activo, descuento_desde, descuento_hasta, descuento_stock, id]
        )

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Presentación no encontrada' })
        }

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

        if (stock === undefined || stock < 0) {
            return res.status(400).json({ error: 'Stock inválido' })
        }

        const resultado = await db.query(
            `UPDATE presentaciones SET stock = $1 WHERE id = $2 RETURNING *`,
            [stock, id]
        )

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Presentación no encontrada' })
        }

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

        const resultado = await db.query(
            `UPDATE presentaciones SET disponible = $1 WHERE id = $2 RETURNING *`,
            [disponible, id]
        )

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Presentación no encontrada' })
        }

        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router