const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')

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
        manejarError(res, error)
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
        manejarError(res, error)
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
        manejarError(res, error)
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
        manejarError(res, error)
    }
})

// Ventas por día para gráfico
router.get('/ventas-por-dia', async (req, res) => {
    try {
        const { periodo = 'semana', canal } = req.query

        let intervalo = `7 days`
        let groupBy = `DATE(v.created_at)`
        if (periodo === 'mes') intervalo = `30 days`
        if (periodo === 'anual') intervalo = `365 days`

        let condiciones = [`v.created_at >= NOW() - INTERVAL '${intervalo}'`, `v.estado != 'cancelado'`]
        let valores = []

        if (canal) {
            condiciones.push(`v.canal = $1`)
            valores.push(canal)
        }

        const resultado = await db.query(
            `SELECT
                ${groupBy} as fecha,
                COUNT(*) as cantidad,
                COALESCE(SUM(v.precio), 0) as total,
                COALESCE(SUM(v.precio - COALESCE(pr.precio_compra, 0)), 0) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             WHERE ${condiciones.join(' AND ')}
             GROUP BY ${groupBy}
             ORDER BY fecha ASC`,
            valores
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Ventas por canal para gráfico torta
router.get('/ventas-por-canal', async (req, res) => {
    try {
        const { periodo = 'mes' } = req.query

        let intervalo = '30 days'
        if (periodo === 'semana') intervalo = '7 days'
        if (periodo === 'anual') intervalo = '365 days'

        const resultado = await db.query(
            `SELECT
                v.canal,
                COUNT(*) as cantidad,
                COALESCE(SUM(v.precio), 0) as total
             FROM ventas v
             WHERE v.created_at >= NOW() - INTERVAL '${intervalo}'
             AND v.estado != 'cancelado'
             GROUP BY v.canal
             ORDER BY total DESC`
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Top y bottom productos
router.get('/ranking-productos', async (req, res) => {
    try {
        const { periodo = 'mes', limite = 10 } = req.query

        let intervalo = '30 days'
        if (periodo === 'semana') intervalo = '7 days'
        if (periodo === 'anual') intervalo = '365 days'

        const top = await db.query(
            `SELECT
                p.nombre as producto,
                pr.nombre as presentacion,
                m.nombre as marca,
                COUNT(*) as cantidad_vendida,
                COALESCE(SUM(v.precio), 0) as total_generado
             FROM ventas v
             JOIN presentaciones pr ON v.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE v.created_at >= NOW() - INTERVAL '${intervalo}'
             AND v.estado != 'cancelado'
             GROUP BY p.nombre, pr.nombre, m.nombre
             ORDER BY cantidad_vendida DESC
             LIMIT $1`,
            [parseInt(limite)]
        )

        const bottom = await db.query(
            `SELECT
                p.nombre as producto,
                pr.nombre as presentacion,
                m.nombre as marca,
                COUNT(*) as cantidad_vendida,
                COALESCE(SUM(v.precio), 0) as total_generado
             FROM ventas v
             JOIN presentaciones pr ON v.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE v.created_at >= NOW() - INTERVAL '${intervalo}'
             AND v.estado != 'cancelado'
             GROUP BY p.nombre, pr.nombre, m.nombre
             ORDER BY cantidad_vendida ASC
             LIMIT $1`,
            [parseInt(limite)]
        )

        res.json({ top: top.rows, bottom: bottom.rows })
    } catch (error) {
        manejarError(res, error)
    }
})

// Top clientes
router.get('/top-clientes', async (req, res) => {
    try {
        const { periodo = 'mes', limite = 10 } = req.query

        let intervalo = '30 days'
        if (periodo === 'semana') intervalo = '7 days'
        if (periodo === 'anual') intervalo = '365 days'

        const resultado = await db.query(
            `SELECT
                COALESCE(c.nombre, v.razon_social, 'Consumidor final') as cliente,
                c.ruc,
                COUNT(*) as cantidad_compras,
                COALESCE(SUM(v.precio), 0) as total_comprado
             FROM ventas v
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE v.created_at >= NOW() - INTERVAL '${intervalo}'
             AND v.estado != 'cancelado'
             GROUP BY c.nombre, v.razon_social, c.ruc
             ORDER BY total_comprado DESC
             LIMIT $1`,
            [parseInt(limite)]
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Métricas generales del período
router.get('/metricas', async (req, res) => {
    try {
        const { periodo = 'mes', canal, marca_id, categoria_id } = req.query

        let intervalo = '30 days'
        if (periodo === 'semana') intervalo = '7 days'
        if (periodo === 'anual') intervalo = '365 days'
        if (periodo === 'hoy') intervalo = '1 day'

        let condiciones = [
            `v.created_at >= NOW() - INTERVAL '${intervalo}'`,
            `v.estado != 'cancelado'`
        ]
        let valores = []
        let i = 1

        if (canal) {
            condiciones.push(`v.canal = $${i}`)
            valores.push(canal)
            i++
        }

        if (marca_id) {
            condiciones.push(`p.marca_id = $${i}`)
            valores.push(parseInt(marca_id))
            i++
        }

        if (categoria_id) {
            condiciones.push(`p.categoria_id = $${i}`)
            valores.push(parseInt(categoria_id))
            i++
        }

        const resultado = await db.query(
            `SELECT
                COUNT(*) as cantidad,
                COALESCE(SUM(v.precio), 0) as total,
                COALESCE(SUM(v.precio - COALESCE(pr.precio_compra, 0)), 0) as ganancia,
                COALESCE(AVG(v.precio), 0) as ticket_promedio,
                FLOOR(COALESCE(SUM(v.precio), 0) / 11) as iva_total
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             WHERE ${condiciones.join(' AND ')}`,
            valores
        )
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Estadísticas de delivery por zona
router.get('/delivery-zonas', async (req, res) => {
    try {
        const { periodo = 'mes' } = req.query
        let intervalo = '30 days'
        if (periodo === 'semana') intervalo = '7 days'
        if (periodo === 'anual') intervalo = '365 days'
        if (periodo === 'hoy') intervalo = '1 day'

        // Pedidos y recaudación por zona
        const porZona = await db.query(
            `SELECT
                COALESCE(v.zona_delivery, 'Sin zona') as zona,
                COUNT(DISTINCT d.id) as cantidad_pedidos,
                COALESCE(SUM(v.costo_delivery), 0) as total_delivery,
                COALESCE(SUM(v.precio), 0) as total_ventas
             FROM deliveries d
             JOIN ventas v ON d.venta_id = v.id
             WHERE d.created_at >= NOW() - INTERVAL '${intervalo}'
             AND d.estado != 'cancelado'
             GROUP BY v.zona_delivery
             ORDER BY cantidad_pedidos DESC`
        )

        // Clientes por zona (ciudad)
        const clientesPorZona = await db.query(
            `SELECT
                COALESCE(ciudad, 'Sin ciudad') as zona,
                COUNT(*) as total_clientes,
                COUNT(*) FILTER (WHERE activo = true) as clientes_activos,
                COUNT(*) FILTER (WHERE activo = false OR activo IS NULL) as clientes_inactivos
             FROM clientes
             WHERE ciudad IS NOT NULL AND ciudad != ''
             GROUP BY ciudad
             ORDER BY total_clientes DESC`
        )

        // Total recaudado por delivery en el período
        const totalDelivery = await db.query(
            `SELECT COALESCE(SUM(v.costo_delivery), 0) as total
             FROM ventas v
             JOIN deliveries d ON v.id = d.venta_id
             WHERE d.created_at >= NOW() - INTERVAL '${intervalo}'
             AND d.estado != 'cancelado'`
        )

        res.json({
            por_zona: porZona.rows,
            clientes_por_zona: clientesPorZona.rows,
            total_delivery_periodo: parseInt(totalDelivery.rows[0].total)
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

module.exports = router