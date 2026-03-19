const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')

// 1. Buscar/listar clientes
router.get('/', async (req, res) => {
    try {
        const { buscar, tipo, origen } = req.query

        let condiciones = ['c.activo = true']
        let valores = []
        let i = 1

        if (buscar) {
            condiciones.push(`(LOWER(c.nombre) ILIKE $${i} OR c.ruc ILIKE $${i} OR c.telefono ILIKE $${i})`)
            valores.push(`%${buscar.toLowerCase()}%`)
            i++
        }

        if (tipo) {
            condiciones.push(`c.tipo = $${i}`)
            valores.push(tipo)
            i++
        }

        if (origen) {
            condiciones.push(`c.origen = $${i}`)
            valores.push(origen)
            i++
        }

        const resultado = await db.query(
            `SELECT c.*,
                COUNT(v.id) as total_compras,
                COALESCE(SUM(v.precio), 0) as monto_total,
                MAX(v.created_at) as ultima_compra
             FROM clientes c
             LEFT JOIN ventas v ON v.cliente_id = c.id
             WHERE ${condiciones.join(' AND ')}
             GROUP BY c.id
             ORDER BY c.nombre ASC`,
            valores
        )

        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// 2. Buscar cliente por teléfono (para el bot)
router.get('/telefono/:telefono', async (req, res) => {
    try {
        const { telefono } = req.params
        const resultado = await db.query(
            `SELECT * FROM clientes WHERE telefono = $1 AND activo = true`,
            [telefono]
        )
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' })
        }
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 3. Ver perfil completo de un cliente
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params

        const cliente = await db.query(
            `SELECT * FROM clientes WHERE id = $1`,
            [id]
        )

        if (cliente.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' })
        }

        const ventas = await db.query(
            `SELECT v.*,
                    pr.nombre as presentacion_nombre,
                    p.nombre as producto_nombre,
                    m.nombre as marca_nombre
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE v.cliente_id = $1
             ORDER BY v.created_at DESC`,
            [id]
        )

        const estadisticas = await db.query(
            `SELECT
                COUNT(*) as total_compras,
                COALESCE(SUM(v.precio), 0) as monto_total,
                COALESCE(AVG(v.precio), 0) as ticket_promedio,
                MAX(v.created_at) as ultima_compra,
                MIN(v.created_at) as primera_compra
             FROM ventas v
             WHERE v.cliente_id = $1`,
            [id]
        )

        const productoFavorito = await db.query(
            `SELECT p.nombre as producto, m.nombre as marca, COUNT(*) as cantidad
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE v.cliente_id = $1
             GROUP BY p.nombre, m.nombre
             ORDER BY cantidad DESC
             LIMIT 1`,
            [id]
        )

        res.json({
            ...cliente.rows[0],
            ventas: ventas.rows,
            estadisticas: estadisticas.rows[0],
            producto_favorito: productoFavorito.rows[0] || null
        })
    } catch (error) {
        manejarError(res, error)
    }
})

// 4. Crear cliente
router.post('/', async (req, res) => {
    try {
        const { tipo, nombre, ruc, telefono, email, direccion, ciudad, notas, origen } = req.body

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es requerido' })
        }

        const resultado = await db.query(
            `INSERT INTO clientes (tipo, nombre, ruc, telefono, email, direccion, ciudad, notas, origen)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [tipo || 'persona', nombre, ruc, telefono, email, direccion, ciudad, notas, origen || 'manual']
        )

        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 5. Editar cliente
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { tipo, nombre, ruc, telefono, email, direccion, ciudad, notas, activo } = req.body

        const resultado = await db.query(
            `UPDATE clientes
             SET tipo = COALESCE($1, tipo),
                 nombre = COALESCE($2, nombre),
                 ruc = COALESCE($3, ruc),
                 telefono = COALESCE($4, telefono),
                 email = COALESCE($5, email),
                 direccion = COALESCE($6, direccion),
                 ciudad = COALESCE($7, ciudad),
                 notas = COALESCE($8, notas),
                 activo = COALESCE($9, activo),
                 updated_at = NOW()
             WHERE id = $10
             RETURNING *`,
            [tipo, nombre, ruc, telefono, email, direccion, ciudad, notas, activo, id]
        )

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' })
        }

        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 6. Buscar cliente por RUC o nombre para autocompletar
router.get('/buscar/autocomplete', async (req, res) => {
    try {
        const { q } = req.query
        if (!q || q.length < 2) return res.json([])

        const resultado = await db.query(
            `SELECT id, nombre, ruc, telefono, tipo
             FROM clientes
             WHERE activo = true
             AND (LOWER(nombre) ILIKE $1 OR ruc ILIKE $1 OR telefono ILIKE $1)
             ORDER BY nombre ASC
             LIMIT 10`,
            [`%${q.toLowerCase()}%`]
        )

        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router