const express = require('express')
const router = express.Router()
const db = require('../db/index')

// 1. Ver todos los productos con sus presentaciones
router.get('/', async (req, res) => {
    try {
        const productos = await db.query(
            `SELECT p.*, c.nombre as categoria_nombre
             FROM productos p
             LEFT JOIN categorias c ON p.categoria_id = c.id
             ORDER BY p.nombre ASC`
        )

        const presentaciones = await db.query(
            `SELECT * FROM presentaciones ORDER BY producto_id, nombre ASC`
        )

        const resultado = productos.rows.map(producto => ({
            ...producto,
            presentaciones: presentaciones.rows.filter(
                pr => pr.producto_id === producto.id
            )
        }))

        res.json(resultado)
    } catch (error) {
        res.status(500).json({ error: error.message })
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
        res.status(500).json({ error: error.message })
    }
})

// 3. Ver un producto específico
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const producto = await db.query(
            `SELECT p.*, c.nombre as categoria_nombre
             FROM productos p
             LEFT JOIN categorias c ON p.categoria_id = c.id
             WHERE p.id = $1`,
            [id]
        )

        if (producto.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' })
        }

        const presentaciones = await db.query(
            `SELECT * FROM presentaciones WHERE producto_id = $1 ORDER BY nombre ASC`,
            [id]
        )

        res.json({
            ...producto.rows[0],
            presentaciones: presentaciones.rows
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 4. Crear producto
router.post('/', async (req, res) => {
    try {
        const { categoria_id, nombre, descripcion, calidad } = req.body

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es requerido' })
        }

        const resultado = await db.query(
            `INSERT INTO productos (categoria_id, nombre, descripcion, calidad)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [categoria_id, nombre, descripcion, calidad || 'standard']
        )

        res.status(201).json(resultado.rows[0])
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 5. Editar producto
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, descripcion, calidad, disponible, categoria_id } = req.body

        const resultado = await db.query(
            `UPDATE productos
             SET nombre = COALESCE($1, nombre),
                 descripcion = COALESCE($2, descripcion),
                 calidad = COALESCE($3, calidad),
                 disponible = COALESCE($4, disponible),
                 categoria_id = COALESCE($5, categoria_id)
             WHERE id = $6
             RETURNING *`,
            [nombre, descripcion, calidad, disponible, categoria_id, id]
        )

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' })
        }

        res.json(resultado.rows[0])
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 6. Agregar presentación a un producto
router.post('/:id/presentaciones', async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, precio, stock } = req.body

        if (!nombre || !precio) {
            return res.status(400).json({ error: 'Nombre y precio son requeridos' })
        }

        const resultado = await db.query(
            `INSERT INTO presentaciones (producto_id, nombre, precio, stock)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, nombre, precio, stock || 0]
        )

        res.status(201).json(resultado.rows[0])
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 7. Actualizar stock de una presentación
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
        res.status(500).json({ error: error.message })
    }
})

// 8. Desactivar presentación
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
        res.status(500).json({ error: error.message })
    }
})

module.exports = router