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
            CASE
                WHEN canal IN ('whatsapp_bot', 'whatsapp') THEN 'bot'
                WHEN canal IN ('en_tienda', 'presencial', 'agente_presencial') THEN 'tienda'
                WHEN canal IN ('agente_delivery', 'whatsapp_delivery') THEN 'delivery'
                WHEN canal = 'pagina_web' THEN 'web'
                ELSE 'otro'
            END as canal,
            COUNT(*) as cantidad,
            COALESCE(SUM(v.precio), 0) as total
        FROM ventas v
        WHERE v.created_at >= NOW() - INTERVAL '${intervalo}'
        AND v.estado != 'cancelado'
        GROUP BY 1
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
            // Mapear canal unificado a canales reales
            const mapCanal = {
                bot: `v.canal IN ('whatsapp_bot', 'whatsapp')`,
                tienda: `v.canal IN ('en_tienda', 'presencial', 'agente_presencial')`,
                delivery: `v.canal IN ('agente_delivery', 'whatsapp_delivery')`,
                web: `v.canal = 'pagina_web'`
            }
            if (mapCanal[canal]) {
                condiciones.push(mapCanal[canal])
            } else {
                condiciones.push(`v.canal = $${i}`)
                valores.push(canal)
                i++
            }
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

router.get('/comparativas', async (req, res) => {
    try {
        const { periodo = 'mes' } = req.query

        let intervaloActual, intervaloAnterior
        if (periodo === 'semana') {
            intervaloActual = `DATE_TRUNC('week', NOW())`
            intervaloAnterior = `DATE_TRUNC('week', NOW()) - INTERVAL '7 days'`
        } else if (periodo === 'anual') {
            intervaloActual = `DATE_TRUNC('year', NOW())`
            intervaloAnterior = `DATE_TRUNC('year', NOW()) - INTERVAL '1 year'`
        } else {
            intervaloActual = `DATE_TRUNC('month', NOW())`
            intervaloAnterior = `DATE_TRUNC('month', NOW()) - INTERVAL '1 month'`
        }

        // Ventas período actual vs anterior
        const ventasActual = await db.query(
            `SELECT COUNT(*) as cantidad, COALESCE(SUM(precio), 0) as total
             FROM ventas
             WHERE created_at >= ${intervaloActual}
             AND estado != 'cancelado'`
        )
        const ventasAnterior = await db.query(
            `SELECT COUNT(*) as cantidad, COALESCE(SUM(precio), 0) as total
             FROM ventas
             WHERE created_at >= ${intervaloAnterior}
             AND created_at < ${intervaloActual}
             AND estado != 'cancelado'`
        )

        // Nuevos clientes — primera compra en período actual vs anterior
        const nuevosActual = await db.query(
            `SELECT COUNT(DISTINCT v.cliente_id) as cantidad
             FROM ventas v
             WHERE v.created_at >= ${intervaloActual}
             AND v.cliente_id IS NOT NULL
             AND v.estado != 'cancelado'
             AND NOT EXISTS (
                 SELECT 1 FROM ventas v2
                 WHERE v2.cliente_id = v.cliente_id
                 AND v2.created_at < ${intervaloActual}
                 AND v2.estado != 'cancelado'
             )`
        )
        const nuevosAnterior = await db.query(
            `SELECT COUNT(DISTINCT v.cliente_id) as cantidad
             FROM ventas v
             WHERE v.created_at >= ${intervaloAnterior}
             AND v.created_at < ${intervaloActual}
             AND v.cliente_id IS NOT NULL
             AND v.estado != 'cancelado'
             AND NOT EXISTS (
                 SELECT 1 FROM ventas v2
                 WHERE v2.cliente_id = v.cliente_id
                 AND v2.created_at < ${intervaloAnterior}
                 AND v2.estado != 'cancelado'
             )`
        )

        // Promedio diario del período anterior para comparar con hoy
        const hoy = await db.query(
            `SELECT COALESCE(SUM(precio), 0) as total, COUNT(*) as cantidad
             FROM ventas
             WHERE created_at >= CURRENT_DATE
             AND created_at < CURRENT_DATE + INTERVAL '1 day'
             AND estado != 'cancelado'`
        )
        const promedioDiario = await db.query(
            `SELECT COALESCE(AVG(total_dia), 0) as promedio, COALESCE(AVG(cantidad_dia), 0) as promedio_cantidad
             FROM (
                 SELECT DATE(created_at) as dia,
                        SUM(precio) as total_dia,
                        COUNT(*) as cantidad_dia
                 FROM ventas
                 WHERE created_at >= ${intervaloAnterior}
                 AND created_at < ${intervaloActual}
                 AND estado != 'cancelado'
                 GROUP BY DATE(created_at)
             ) dias`
        )

        // Calcular % de cambio
        function calcPct(actual, anterior) {
            if (!anterior || anterior == 0) return actual > 0 ? 100 : 0
            return Math.round(((actual - anterior) / anterior) * 100)
        }

        const totalActual = parseInt(ventasActual.rows[0].total)
        const totalAnterior = parseInt(ventasAnterior.rows[0].total)
        const cantActual = parseInt(ventasActual.rows[0].cantidad)
        const cantAnterior = parseInt(ventasAnterior.rows[0].cantidad)
        const nuevosAct = parseInt(nuevosActual.rows[0].cantidad)
        const nuevosAnt = parseInt(nuevosAnterior.rows[0].cantidad)
        const totalHoy = parseInt(hoy.rows[0].total)
        const promedio = parseInt(promedioDiario.rows[0].promedio)

        res.json({
            ventas: {
                actual: { total: totalActual, cantidad: cantActual },
                anterior: { total: totalAnterior, cantidad: cantAnterior },
                pct_total: calcPct(totalActual, totalAnterior),
                pct_cantidad: calcPct(cantActual, cantAnterior)
            },
            nuevos_clientes: {
                actual: nuevosAct,
                anterior: nuevosAnt,
                pct: calcPct(nuevosAct, nuevosAnt)
            },
            dia_vs_promedio: {
                hoy: totalHoy,
                promedio_diario: promedio,
                pct: calcPct(totalHoy, promedio),
                cantidad_hoy: parseInt(hoy.rows[0].cantidad),
                promedio_cantidad: Math.round(parseFloat(promedioDiario.rows[0].promedio_cantidad))
            }
        })
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