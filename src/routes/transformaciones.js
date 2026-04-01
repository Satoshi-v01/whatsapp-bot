const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { registrarLog } = require('../middleware/auditoria')

// ─────────────────────────────────────────────
// GET historial de transformaciones
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT t.*,
                po.nombre as presentacion_origen_nombre,
                prod_o.nombre as producto_origen_nombre,
                pd.nombre as presentacion_destino_nombre,
                prod_d.nombre as producto_destino_nombre,
                u.nombre as usuario_nombre
             FROM transformaciones_stock t
             JOIN presentaciones po ON t.presentacion_origen_id = po.id
             JOIN productos prod_o ON po.producto_id = prod_o.id
             JOIN presentaciones pd ON t.presentacion_destino_id = pd.id
             JOIN productos prod_d ON pd.producto_id = prod_d.id
             LEFT JOIN usuarios u ON t.usuario_id = u.id
             ORDER BY t.created_at DESC
             LIMIT 100`,
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// ─────────────────────────────────────────────
// POST registrar transformación (transacción atómica)
// ─────────────────────────────────────────────
router.post('/', async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { presentacion_origen_id, cantidad_origen, presentacion_destino_id, cantidad_destino, nota } = req.body
        const usuario_id = req.usuario?.id
        const usuario_nombre = req.usuario?.nombre

        if (!presentacion_origen_id) return res.status(400).json({ error: 'Presentación origen requerida' })
        if (!presentacion_destino_id) return res.status(400).json({ error: 'Presentación destino requerida' })
        if (!cantidad_origen || cantidad_origen < 1) return res.status(400).json({ error: 'Cantidad origen debe ser mayor a 0' })
        if (!cantidad_destino || cantidad_destino < 1) return res.status(400).json({ error: 'Cantidad destino debe ser mayor a 0' })
        if (presentacion_origen_id === presentacion_destino_id) return res.status(400).json({ error: 'Origen y destino no pueden ser la misma presentación' })

        await client.query('BEGIN')

        // Verificar stock disponible en origen
        const origenRes = await client.query(
            `SELECT id, nombre, stock, producto_id FROM presentaciones WHERE id = $1 FOR UPDATE`,
            [presentacion_origen_id]
        )
        if (origenRes.rows.length === 0) {
            await client.query('ROLLBACK')
            return res.status(404).json({ error: 'Presentación origen no encontrada' })
        }
        const origen = origenRes.rows[0]
        if (origen.stock < cantidad_origen) {
            await client.query('ROLLBACK')
            return res.status(400).json({ error: `Stock insuficiente. Disponible: ${origen.stock}` })
        }

        // Verificar que destino existe
        const destinoRes = await client.query(
            `SELECT id, nombre, stock, producto_id FROM presentaciones WHERE id = $1 FOR UPDATE`,
            [presentacion_destino_id]
        )
        if (destinoRes.rows.length === 0) {
            await client.query('ROLLBACK')
            return res.status(404).json({ error: 'Presentación destino no encontrada' })
        }
        const destino = destinoRes.rows[0]

        // Descontar stock origen
        await client.query(
            `UPDATE presentaciones SET stock = stock - $1, updated_at = NOW() WHERE id = $2`,
            [cantidad_origen, presentacion_origen_id]
        )

        // Sumar stock destino
        await client.query(
            `UPDATE presentaciones SET stock = stock + $1, updated_at = NOW() WHERE id = $2`,
            [cantidad_destino, presentacion_destino_id]
        )

        // Registrar transformación
        const transRes = await client.query(
            `INSERT INTO transformaciones_stock
                (presentacion_origen_id, cantidad_origen, presentacion_destino_id, cantidad_destino, usuario_id, nota)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [presentacion_origen_id, cantidad_origen, presentacion_destino_id, cantidad_destino, usuario_id || null, nota || null]
        )

        await client.query('COMMIT')

        registrarLog({
            usuario_id,
            usuario_nombre,
            accion: 'transformacion_stock',
            modulo: 'inventario',
            entidad: 'transformaciones_stock',
            entidad_id: transRes.rows[0].id,
            descripcion: `Transformación: ${cantidad_origen}x "${origen.nombre}" → ${cantidad_destino}x "${destino.nombre}"`,
            dato_anterior: { stock_origen: origen.stock, stock_destino: destino.stock },
            dato_nuevo: { stock_origen: origen.stock - cantidad_origen, stock_destino: destino.stock + cantidad_destino },
            ip: req.ip
        })

        res.status(201).json(transRes.rows[0])
    } catch (error) {
        await client.query('ROLLBACK')
        manejarError(res, error)
    } finally {
        client.release()
    }
})

module.exports = router
