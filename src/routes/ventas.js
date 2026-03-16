const express = require('express')
const router = express.Router()
const db = require('../db/index')

// 1. Ver todas las ventas
router.get('/', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT v.*, 
                    pr.nombre as presentacion_nombre,
                    p.nombre as producto_nombre,
                    u.nombre as agente_nombre
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN usuarios u ON v.agente_id = u.id
             ORDER BY v.created_at DESC`
        )
        res.json(resultado.rows)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 2. Ver ventas por estado
router.get('/estado/:estado', async (req, res) => {
    try {
        const { estado } = req.params
        const resultado = await db.query(
            `SELECT v.*,
                    pr.nombre as presentacion_nombre,
                    p.nombre as producto_nombre
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             WHERE v.estado = $1
             ORDER BY v.created_at DESC`,
            [estado]
        )
        res.json(resultado.rows)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 3. Ver una venta específica
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const resultado = await db.query(
            `SELECT v.*,
                    pr.nombre as presentacion_nombre,
                    p.nombre as producto_nombre
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             WHERE v.id = $1`,
            [id]
        )
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Venta no encontrada' })
        }
        res.json(resultado.rows[0])
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 4. Actualizar estado de una venta
router.patch('/:id/estado', async (req, res) => {
    try {
        const { id } = req.params
        const { estado, agente_id } = req.body

        const estadosValidos = ['pendiente_pago', 'pagado', 'entregado', 'cancelado']
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ 
                error: `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}` 
            })
        }

        const resultado = await db.query(
            `UPDATE ventas 
             SET estado = $1, agente_id = $2
             WHERE id = $3
             RETURNING *`,
            [estado, agente_id, id]
        )

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Venta no encontrada' })
        }

        res.json({ ok: true, venta: resultado.rows[0] })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

module.exports = router