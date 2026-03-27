const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')

// ─────────────────────────────────────────────
// GET lotes de una presentación
// ─────────────────────────────────────────────
router.get('/presentacion/:id', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT l.*,
                pr.nombre as presentacion_nombre,
                p.nombre as producto_nombre,
                m.nombre as marca_nombre,
                CURRENT_DATE - l.fecha_vencimiento as dias_vencido,
                l.fecha_vencimiento - CURRENT_DATE as dias_para_vencer
             FROM lotes l
             JOIN presentaciones pr ON l.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE l.presentacion_id = $1 AND l.activo = true
             ORDER BY l.fecha_vencimiento ASC`,
            [req.params.id]
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// ─────────────────────────────────────────────
// GET todos los lotes con alertas
// ─────────────────────────────────────────────
router.get('/alertas', async (req, res) => {
    try {
        const { dias = 30 } = req.query

        const proximos = await db.query(
            `SELECT l.*,
                pr.nombre as presentacion_nombre,
                p.nombre as producto_nombre,
                m.nombre as marca_nombre,
                l.fecha_vencimiento - CURRENT_DATE as dias_para_vencer
             FROM lotes l
             JOIN presentaciones pr ON l.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE l.activo = true
             AND l.stock_actual > 0
             AND l.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + $1::integer * INTERVAL '1 day'
             ORDER BY l.fecha_vencimiento ASC`,
            [dias]
        )

        const vencidos = await db.query(
            `SELECT l.*,
                pr.nombre as presentacion_nombre,
                p.nombre as producto_nombre,
                m.nombre as marca_nombre,
                CURRENT_DATE - l.fecha_vencimiento as dias_vencido
             FROM lotes l
             JOIN presentaciones pr ON l.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE l.activo = true
             AND l.stock_actual > 0
             AND l.fecha_vencimiento < CURRENT_DATE
             ORDER BY l.fecha_vencimiento ASC`
        )

        res.json({
            proximos_vencer: proximos.rows,
            vencidos: vencidos.rows
        })
    } catch (error) {
        manejarError(res, error)
    }
})

// ─────────────────────────────────────────────
// POST crear lote
// ─────────────────────────────────────────────
router.post('/', async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { presentacion_id, numero_lote, fecha_vencimiento, stock_inicial } = req.body

        if (!presentacion_id) return res.status(400).json({ error: 'Presentación requerida' })
        if (!fecha_vencimiento) return res.status(400).json({ error: 'Fecha de vencimiento requerida' })
        if (!stock_inicial || stock_inicial < 1) return res.status(400).json({ error: 'Stock inicial debe ser mayor a 0' })

        await client.query('BEGIN')

        const lote = await client.query(
            `INSERT INTO lotes (presentacion_id, numero_lote, fecha_vencimiento, stock_inicial, stock_actual)
             VALUES ($1, $2, $3, $4, $4) RETURNING *`,
            [presentacion_id, numero_lote || null, fecha_vencimiento, stock_inicial]
        )

        // Actualizar stock de la presentación
        await client.query(
            `UPDATE presentaciones SET stock = stock + $1, updated_at = NOW() WHERE id = $2`,
            [stock_inicial, presentacion_id]
        )

        await client.query('COMMIT')
        res.status(201).json(lote.rows[0])
    } catch (error) {
        await client.query('ROLLBACK')
        manejarError(res, error)
    } finally {
        client.release()
    }
})

// ─────────────────────────────────────────────
// PATCH editar lote
// ─────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
    try {
        const { numero_lote, fecha_vencimiento, stock_actual } = req.body
        const resultado = await db.query(
            `UPDATE lotes SET
                numero_lote = COALESCE($1, numero_lote),
                fecha_vencimiento = COALESCE($2, fecha_vencimiento),
                stock_actual = COALESCE($3, stock_actual),
                updated_at = NOW()
             WHERE id = $4 RETURNING *`,
            [numero_lote, fecha_vencimiento, stock_actual, req.params.id]
        )
        if (!resultado.rows.length) return res.status(404).json({ error: 'Lote no encontrado' })
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// ─────────────────────────────────────────────
// DELETE (desactivar) lote
// ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    const client = await db.pool.connect()
    try {
        await client.query('BEGIN')

        const lote = await client.query(
            `UPDATE lotes SET activo = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
            [req.params.id]
        )
        if (!lote.rows.length) {
            await client.query('ROLLBACK')
            return res.status(404).json({ error: 'Lote no encontrado' })
        }

        // Restar stock de la presentación
        await client.query(
            `UPDATE presentaciones SET stock = GREATEST(stock - $1, 0), updated_at = NOW() WHERE id = $2`,
            [lote.rows[0].stock_actual, lote.rows[0].presentacion_id]
        )

        await client.query('COMMIT')
        res.json({ ok: true })
    } catch (error) {
        await client.query('ROLLBACK')
        manejarError(res, error)
    } finally {
        client.release()
    }
})

module.exports = router