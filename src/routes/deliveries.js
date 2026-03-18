const express = require('express')
const router = express.Router()
const db = require('../db/index')

// Ver todos los deliveries
router.get('/', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT d.*,
                    v.precio,
                    v.estado as estado_venta,
                    pr.nombre as presentacion_nombre,
                    p.nombre as producto_nombre,
                    c.nombre as cliente_nombre,
                    c.ruc as cliente_ruc
             FROM deliveries d
             JOIN ventas v ON d.venta_id = v.id
             JOIN presentaciones pr ON v.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             ORDER BY d.created_at DESC`
        )
        res.json(resultado.rows)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Ver deliveries por estado
router.get('/estado/:estado', async (req, res) => {
    try {
        const { estado } = req.params
        const resultado = await db.query(
            `SELECT d.*,
                    v.precio,
                    pr.nombre as presentacion_nombre,
                    p.nombre as producto_nombre,
                    c.nombre as cliente_nombre,
                    c.ruc as cliente_ruc
             FROM deliveries d
             JOIN ventas v ON d.venta_id = v.id
             JOIN presentaciones pr ON v.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE d.estado = $1
             ORDER BY d.created_at DESC`,
            [estado]
        )
        res.json(resultado.rows)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Actualizar estado del delivery
router.patch('/:id/estado', async (req, res) => {
    try {
        const { id } = req.params
        const { estado, notas } = req.body

        const estadosValidos = ['pendiente', 'confirmado', 'en_camino', 'entregado', 'cancelado']
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' })
        }

        const resultado = await db.query(
            `UPDATE deliveries
             SET estado = $1, notas = COALESCE($2, notas), updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [estado, notas, id]
        )

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery no encontrado' })
        }

        res.json({ ok: true, delivery: resultado.rows[0] })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

module.exports = router