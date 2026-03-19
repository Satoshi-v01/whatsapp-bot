const express = require('express')
const router = express.Router()
const db = require('../db/index')

// 1. Ver todas las ventas
router.get('/', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT v.*, 
                    pr.nombre as presentacion_nombre,
                    pr.precio_compra,
                    p.nombre as producto_nombre,
                    u.nombre as agente_nombre,
                    c.nombre as cliente_nombre,
                    (v.precio - pr.precio_compra) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN usuarios u ON v.agente_id = u.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
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
                    pr.precio_compra,
                    p.nombre as producto_nombre,
                    c.nombre as cliente_nombre,
                    (v.precio - pr.precio_compra) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
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
                    pr.precio_compra,
                    p.nombre as producto_nombre,
                    c.nombre as cliente_nombre,
                    (v.precio - pr.precio_compra) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
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

// 5. Registrar venta presencial
router.post('/presencial', async (req, res) => {
    try {
        const {
            cliente_id,
            presentacion_id,
            cantidad,
            precio,
            metodo_pago,
            quiere_factura,
            ruc_factura,
            razon_social,
            agente_id,
            es_de_whatsapp,
            sesion_numero
        } = req.body

        if (!presentacion_id || !cantidad || !precio) {
            return res.status(400).json({ error: 'Presentación, cantidad y precio son requeridos' })
        }

        // Verificar stock
        const stock = await db.query(
            `SELECT stock, nombre FROM presentaciones WHERE id = $1`,
            [presentacion_id]
        )

        if (stock.rows.length === 0) {
            return res.status(404).json({ error: 'Presentación no encontrada' })
        }

        if (stock.rows[0].stock < cantidad) {
            return res.status(400).json({ error: `Stock insuficiente. Disponible: ${stock.rows[0].stock}` })
        }

        // Registrar venta
        const venta = await db.query(
            `INSERT INTO ventas (cliente_id, presentacion_id, cantidad, precio, canal, estado, quiere_factura, ruc_factura, razon_social, agente_id)
             VALUES ($1, $2, $3, $4, 'presencial', 'pagado', $5, $6, $7, $8)
             RETURNING *`,
            [cliente_id || null, presentacion_id, cantidad, precio,
             quiere_factura || false, ruc_factura || null, razon_social || null, agente_id || null]
        )

        // Descontar stock
        await db.query(
            `UPDATE presentaciones SET stock = stock - $1 WHERE id = $2`,
            [cantidad, presentacion_id]
        )

        // Si viene de una conversación de WhatsApp, marcar delivery como en_camino
        if (es_de_whatsapp && sesion_numero) {
            await db.query(
                `UPDATE deliveries SET estado = 'en_camino', updated_at = NOW()
                 WHERE cliente_numero = $1
                 AND estado IN ('pendiente', 'confirmado')
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [sesion_numero]
            )
        }

        res.status(201).json({ ok: true, venta: venta.rows[0] })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

module.exports = router