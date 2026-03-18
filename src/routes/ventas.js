const express = require('express')
const router = express.Router()
const db = require('../db/index')

// Resumen del día
router.get('/resumen', async (req, res) => {
    try {
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)

        const ventasHoy = await db.query(
            `SELECT 
                COUNT(*) as cantidad,
                COALESCE(SUM(v.precio), 0) as total,
                COALESCE(SUM(v.precio - pr.precio_compra), 0) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             WHERE v.created_at >= $1
             AND v.estado != 'cancelado'`,
            [hoy]
        )

        const pendientes = await db.query(
            `SELECT COUNT(*) as cantidad FROM ventas 
             WHERE estado = 'pendiente_pago'`
        )

        const deliveries = await db.query(
            `SELECT COUNT(*) as cantidad FROM ventas 
             WHERE estado = 'pendiente_pago' 
             AND canal = 'whatsapp'`
        )

        const esperandoAgente = await db.query(
            `SELECT COUNT(*) as cantidad FROM sesiones 
             WHERE modo = 'esperando_agente'`
        )

        const stockBajo = await db.query(
            `SELECT p.nombre, pr.nombre as presentacion, pr.stock
             FROM presentaciones pr
             JOIN productos p ON pr.producto_id = p.id
             WHERE pr.stock <= 3 AND pr.disponible = true
             ORDER BY pr.stock ASC`
        )

        res.json({
            ventas_hoy: {
                cantidad: parseInt(ventasHoy.rows[0].cantidad),
                total: parseInt(ventasHoy.rows[0].total),
                ganancia: parseInt(ventasHoy.rows[0].ganancia)
            },
            pendientes: parseInt(pendientes.rows[0].cantidad),
            deliveries: parseInt(deliveries.rows[0].cantidad),
            esperando_agente: parseInt(esperandoAgente.rows[0].cantidad),
            stock_bajo: stockBajo.rows
        })

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Ventas por los últimos 7 días
router.get('/ventas-semana', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT 
                DATE(v.created_at) as fecha,
                COUNT(*) as cantidad,
                COALESCE(SUM(v.precio), 0) as total,
                COALESCE(SUM(v.precio - pr.precio_compra), 0) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             WHERE v.created_at >= NOW() - INTERVAL '7 days'
             AND v.estado != 'cancelado'
             GROUP BY DATE(v.created_at)
             ORDER BY fecha ASC`
        )
        res.json(resultado.rows)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Productos más vendidos del mes
router.get('/top-productos', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT 
                p.nombre as producto,
                pr.nombre as presentacion,
                COUNT(*) as cantidad_vendida,
                SUM(v.precio) as total_generado,
                SUM(v.precio - pr.precio_compra) as ganancia_generada
             FROM ventas v
             JOIN presentaciones pr ON v.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             WHERE v.created_at >= DATE_TRUNC('month', NOW())
             AND v.estado != 'cancelado'
             GROUP BY p.nombre, pr.nombre
             ORDER BY cantidad_vendida DESC
             LIMIT 5`
        )
        res.json(resultado.rows)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Notificaciones activas
router.get('/notificaciones', async (req, res) => {
    try {
        const chats = await db.query(
            `SELECT cliente_numero, ultimo_mensaje 
             FROM sesiones WHERE modo = 'esperando_agente'
             ORDER BY ultimo_mensaje ASC`
        )

        const stockBajo = await db.query(
            `SELECT p.nombre as producto, pr.nombre as presentacion, pr.stock
             FROM presentaciones pr
             JOIN productos p ON pr.producto_id = p.id
             WHERE pr.stock <= 3 AND pr.disponible = true
             ORDER BY pr.stock ASC`
        )

        const notificaciones = [
            ...chats.rows.map(c => ({
                tipo: 'chat',
                mensaje: `${c.cliente_numero} requiere un agente`,
                tiempo: c.ultimo_mensaje,
                urgente: true
            })),
            ...stockBajo.rows.map(s => ({
                tipo: 'stock',
                mensaje: `${s.producto} ${s.presentacion} — solo ${s.stock} unidades`,
                tiempo: new Date(),
                urgente: s.stock === 0
            }))
        ]

        res.json(notificaciones)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

module.exports = router