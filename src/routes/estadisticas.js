const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { autenticar, verificarPermiso } = require('../middleware/auth')

router.use(autenticar, verificarPermiso('reportes', 'ver'))

// Ganancia real de una venta: suma el margen por producto desde ventas_items
// (donde SIEMPRE se registran todos los productos de la venta, sea 1 o varios).
// Antes esto se calculaba contra v.presentacion_id/v.cantidad de la cabecera de
// `ventas`, que quedan NULL cuando la venta tiene mas de un producto -> el JOIN
// no encontraba nada y la "ganancia" terminaba siendo el precio total de la
// venta (0% de costo descontado). Fallback a la cabecera solo para ventas
// legacy que no tienen filas en ventas_items (ej. las creadas directo desde
// deliveries.js, que no inserta items).
//
// El costo de delivery NUNCA es ganancia ni costo nuestro: el cliente lo paga
// y va integro para el repartidor, es plata de paso por la caja. vi.precio_total
// (ventas_items) ya es solo precio de producto, pero v.precio de la cabecera SI
// incluye costo_delivery -> se resta antes de calcular margen en el fallback.
const GANANCIA_VENTA = `COALESCE(
    (SELECT SUM(vi.precio_total - COALESCE(pri.precio_compra, 0) * vi.cantidad)
     FROM ventas_items vi
     LEFT JOIN presentaciones pri ON vi.presentacion_id = pri.id
     WHERE vi.venta_id = v.id),
    (v.precio - COALESCE(v.costo_delivery, 0)) - COALESCE(pr.precio_compra, 0) * COALESCE(v.cantidad, 0)
)`

// v.precio incluye costo_delivery (plata de paso para el repartidor, no es
// venta nuestra). "Ventas del dia" y demas totales de ingresos deben
// mostrar solo lo que efectivamente es venta de productos.
const VENTA_SIN_DELIVERY = `(v.precio - COALESCE(v.costo_delivery, 0))`

// Fuente unica de "items vendidos" para los reportes por producto (top-productos,
// ranking-productos, rentabilidad). Combina ventas_items (caso normal) con un
// fallback por venta para las que NO tienen filas ahi (ej. deliveries.js, que
// inserta directo en `ventas` con presentacion_id/cantidad en la cabecera y
// nunca crea ventas_items). Antes estos reportes hacian JOIN directo contra
// `ventas`, lo que los rompio dos veces: primero excluia ventas multi-producto
// (header NULL), y al migrar a ventas_items paso a excluir SIN AVISAR las
// ventas que nunca tuvieron items (las de delivery manual) -- se perdian
// enteras, no solo su margen. Este UNION ALL las devuelve TODAS: unicamente se
// resta costo_delivery del precio (no se toca ni se descarta la venta).
const ITEMS_VENTA_CTE = `WITH items_venta AS (
    SELECT vi.venta_id, vi.presentacion_id, vi.cantidad, vi.precio_total
    FROM ventas_items vi
    UNION ALL
    SELECT v2.id as venta_id, v2.presentacion_id, v2.cantidad,
           (v2.precio - COALESCE(v2.costo_delivery, 0)) as precio_total
    FROM ventas v2
    WHERE v2.presentacion_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM ventas_items vix WHERE vix.venta_id = v2.id)
)
`

// Resumen del día
router.get('/resumen', async (req, res) => {
    try {
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)

        const ventasHoy = await db.query(
            `SELECT
                COUNT(DISTINCT COALESCE(v.numero_factura, v.id::text)) as cantidad,
                COALESCE(SUM(${VENTA_SIN_DELIVERY}), 0) as total,
                COALESCE(SUM(${GANANCIA_VENTA}), 0) as ganancia
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
             WHERE pr.stock <= 3 AND pr.disponible = true AND p.disponible = true
             ORDER BY pr.stock ASC`
        )


        const creditoPendiente = await db.query(
            `SELECT COALESCE(SUM(v.precio), 0) as total, COUNT(*) as cantidad
            FROM ventas v
            WHERE v.tipo_venta = 'credito'
            AND v.estado = 'pendiente_pago'`
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
            stock_bajo: stockBajo.rows,
            credito_pendiente: {
            total: parseInt(creditoPendiente.rows[0].total),
            cantidad: parseInt(creditoPendiente.rows[0].cantidad)
        }
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
                DATE((v.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Asuncion') as fecha,
                COUNT(*) as cantidad,
                COALESCE(SUM(${VENTA_SIN_DELIVERY}), 0) as total,
                COALESCE(SUM(${GANANCIA_VENTA}), 0) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             WHERE v.created_at >= NOW() - INTERVAL '7 days'
             AND v.estado != 'cancelado'
             GROUP BY DATE((v.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Asuncion')
             ORDER BY fecha ASC`
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Productos más vendidos del mes
// Fuente: items_venta (ver ITEMS_VENTA_CTE) -- incluye TODAS las ventas
// (multi-producto y las de delivery manual sin ventas_items), restando
// solo costo_delivery cuando corresponde, nunca excluyendo la venta entera.
router.get('/top-productos', async (req, res) => {
    try {
        const resultado = await db.query(
            `${ITEMS_VENTA_CTE}
             SELECT
                p.nombre as producto,
                pr.nombre as presentacion,
                COUNT(*) as cantidad_vendida,
                COALESCE(SUM(iv.precio_total), 0) as total_generado,
                COALESCE(SUM(iv.precio_total - COALESCE(pr.precio_compra, 0) * iv.cantidad), 0) as ganancia_generada
             FROM items_venta iv
             JOIN ventas v ON iv.venta_id = v.id
             JOIN presentaciones pr ON iv.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             WHERE v.created_at >= DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion'
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
        const [chats, mensajesCliente, stockBajo, busquedasFallidas] = await Promise.all([
            db.query(
                `SELECT cliente_numero, ultimo_mensaje FROM sesiones WHERE modo = 'esperando_agente' ORDER BY ultimo_mensaje ASC`
            ),
            db.query(
                `SELECT id, cliente_numero, texto, created_at AT TIME ZONE 'UTC' AS created_at
                 FROM mensajes
                 WHERE origen = 'cliente' AND created_at > NOW() - INTERVAL '5 minutes'
                 ORDER BY created_at DESC
                 LIMIT 100`
            ),
            db.query(
                `SELECT p.nombre as producto, pr.nombre as presentacion, pr.stock
                 FROM presentaciones pr
                 JOIN productos p ON pr.producto_id = p.id
                 WHERE pr.stock <= 3 AND pr.disponible = true
                 ORDER BY pr.stock ASC`
            ),
            db.query(
                `SELECT cliente_numero,
                        datos->>'alerta_busqueda_fallida' as busqueda,
                        (datos->>'alerta_busqueda_at')::timestamptz as at
                 FROM sesiones
                 WHERE datos->>'alerta_busqueda_fallida' IS NOT NULL
                 AND (datos->>'alerta_busqueda_at')::timestamptz > NOW() - INTERVAL '4 hours'
                 ORDER BY (datos->>'alerta_busqueda_at')::timestamptz DESC`
            )
        ])

        const notificaciones = [
            ...chats.rows.map(c => ({
                tipo: 'agente',
                mensaje: `${c.cliente_numero} requiere un agente`,
                tiempo: c.ultimo_mensaje,
                numero: c.cliente_numero,
                urgente: true
            })),
            ...mensajesCliente.rows.map(m => ({
                tipo: 'mensaje',
                id: m.id,
                mensaje: `${m.cliente_numero}: "${m.texto.length > 60 ? m.texto.slice(0, 60) + '…' : m.texto}"`,
                tiempo: m.created_at,
                numero: m.cliente_numero,
                urgente: false
            })),
            ...busquedasFallidas.rows.map(r => ({
                tipo: 'producto_ausente',
                mensaje: `"${r.busqueda}" — producto no encontrado en inventario`,
                tiempo: r.at,
                numero: r.cliente_numero,
                urgente: false
            })),
            ...stockBajo.rows.map(s => ({
                tipo: 'stock',
                mensaje: `${s.producto} ${s.presentacion} — solo ${s.stock} unidades`,
                tiempo: new Date(),
                urgente: s.stock === 0
            }))
        ]

        res.json({
            notificaciones,
            chats_esperando: chats.rows.length
        })
    } catch (error) {
        manejarError(res, error)
    }
})

// Ventas por día para gráfico
router.get('/ventas-por-dia', async (req, res) => {
    try {
        const { periodo = 'semana', canal } = req.query

        const intervalos = { semana: '7 days', mes: '30 days', anual: '365 days', hoy: '1 day' }
        const intervalo = intervalos[periodo] || '7 days'

        let condiciones = [`v.created_at >= NOW() - ($1::interval)`, `v.estado != 'cancelado'`]
        let valores = [intervalo]
        let i = 2

        if (canal) {
            const mapCanal = {
                bot: `v.canal IN ('whatsapp_bot', 'whatsapp')`,
                tienda: `v.canal IN ('en_tienda', 'presencial', 'agente_presencial')`,
                delivery: `v.canal IN ('agente_delivery', 'whatsapp_delivery')`,
            }
            if (mapCanal[canal]) condiciones.push(mapCanal[canal])
            else { condiciones.push(`v.canal = $${i}`); valores.push(canal); i++ }
        }

        const resultado = await db.query(
            `SELECT
                DATE((v.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Asuncion') as fecha,
                COUNT(*) as cantidad,
                COALESCE(SUM(${VENTA_SIN_DELIVERY}), 0) as total,
                COALESCE(SUM(${GANANCIA_VENTA}), 0) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             WHERE ${condiciones.join(' AND ')}
             GROUP BY DATE((v.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Asuncion')
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
        const intervalos = { semana: '7 days', mes: '30 days', anual: '365 days', hoy: '1 day' }
        const intervalo = intervalos[periodo] || '30 days'

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
             WHERE v.created_at >= NOW() - ($1::interval)
             AND v.estado != 'cancelado'
             GROUP BY 1
             ORDER BY total DESC`,
            [intervalo]
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Transferencias recibidas por cuenta bancaria
router.get('/transferencias-por-cuenta', async (req, res) => {
    try {
        const { periodo = 'mes' } = req.query
        const intervalos = { semana: '7 days', mes: '30 days', anual: '365 days', hoy: '1 day' }
        const intervalo = intervalos[periodo] || '30 days'

        const resultado = await db.query(
            `SELECT
                ct.id as cuenta_id,
                ct.banco,
                ct.titular,
                ct.alias,
                COUNT(*) as cantidad,
                COALESCE(SUM(v.precio), 0) as total
             FROM ventas v
             LEFT JOIN cuentas_transferencia ct ON v.cuenta_transferencia_id = ct.id
             WHERE v.created_at >= NOW() - ($1::interval)
             AND v.estado != 'cancelado'
             AND v.metodo_pago = 'transferencia'
             GROUP BY ct.id, ct.banco, ct.titular, ct.alias
             ORDER BY total DESC`,
            [intervalo]
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Fuente: items_venta (ver ITEMS_VENTA_CTE, mismo motivo que /top-productos).
router.get('/ranking-productos', async (req, res) => {
    try {
        const { periodo = 'mes', limite = 10 } = req.query
        const intervalos = { semana: '7 days', mes: '30 days', anual: '365 days' }
        const intervalo = intervalos[periodo] || '30 days'

        const top = await db.query(
            `${ITEMS_VENTA_CTE}
             SELECT
                p.nombre as producto, pr.nombre as presentacion, m.nombre as marca,
                COUNT(*) as cantidad_vendida,
                COALESCE(SUM(iv.precio_total), 0) as total_generado,
                COALESCE(SUM(iv.precio_total - COALESCE(pr.precio_compra, 0) * iv.cantidad), 0) as ganancia_generada
             FROM items_venta iv
             JOIN ventas v ON iv.venta_id = v.id
             JOIN presentaciones pr ON iv.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE v.created_at >= NOW() - ($1::interval)
             AND v.estado != 'cancelado'
             GROUP BY p.nombre, pr.nombre, m.nombre
             ORDER BY cantidad_vendida DESC
             LIMIT $2`,
            [intervalo, parseInt(limite)]
        )

        const bottom = await db.query(
            `${ITEMS_VENTA_CTE}
             SELECT
                p.nombre as producto, pr.nombre as presentacion, m.nombre as marca,
                COUNT(*) as cantidad_vendida,
                COALESCE(SUM(iv.precio_total), 0) as total_generado
             FROM items_venta iv
             JOIN ventas v ON iv.venta_id = v.id
             JOIN presentaciones pr ON iv.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE v.created_at >= NOW() - ($1::interval)
             AND v.estado != 'cancelado'
             GROUP BY p.nombre, pr.nombre, m.nombre
             ORDER BY cantidad_vendida ASC
             LIMIT $2`,
            [intervalo, parseInt(limite)]
        )

        res.json({ top: top.rows, bottom: bottom.rows })
    } catch (error) {
        manejarError(res, error)
    }
})

router.get('/top-clientes', async (req, res) => {
    try {
        const { periodo = 'mes', limite = 10 } = req.query
        const intervalos = { semana: '7 days', mes: '30 days', anual: '365 days' }
        const intervalo = intervalos[periodo] || '30 days'

        const resultado = await db.query(
            `SELECT
                COALESCE(c.nombre, v.razon_social, 'Consumidor final') as cliente,
                c.id as cliente_id, c.ruc,
                COUNT(*) as cantidad_compras,
                COALESCE(SUM(v.precio), 0) as total_comprado,
                COALESCE(AVG(v.precio), 0) as ticket_promedio
             FROM ventas v
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE v.created_at >= NOW() - ($1::interval)
             AND v.estado != 'cancelado'
             GROUP BY c.nombre, v.razon_social, c.ruc, c.id
             ORDER BY total_comprado DESC
             LIMIT $2`,
            [intervalo, parseInt(limite)]
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Fuente: items_venta (ver ITEMS_VENTA_CTE, mismo motivo que /top-productos).
router.get('/rentabilidad', async (req, res) => {
    try {
        const { periodo = 'mes', agrupar = 'producto' } = req.query
        const intervalos = { semana: '7 days', mes: '30 days', anual: '365 days', hoy: '1 day' }
        const intervalo = intervalos[periodo] || '30 days'

        let selectGroup, groupBy

        if (agrupar === 'categoria') {
            selectGroup = `cat.nombre as nombre, 'categoria' as tipo`
            groupBy = `cat.nombre`
        } else if (agrupar === 'marca') {
            selectGroup = `COALESCE(m.nombre, 'Sin marca') as nombre, 'marca' as tipo`
            groupBy = `m.nombre`
        } else {
            selectGroup = `CONCAT(COALESCE(m.nombre, ''), ' ', p.nombre, ' — ', pr.nombre) as nombre, 'producto' as tipo`
            groupBy = `m.nombre, p.nombre, pr.nombre`
        }

        const resultado = await db.query(
            `${ITEMS_VENTA_CTE}
             SELECT
                ${selectGroup},
                COUNT(*) as unidades_vendidas,
                COALESCE(SUM(iv.precio_total), 0) as ingresos,
                COALESCE(SUM(COALESCE(pr.precio_compra, 0) * iv.cantidad), 0) as costo,
                COALESCE(SUM(iv.precio_total - COALESCE(pr.precio_compra, 0) * iv.cantidad), 0) as ganancia,
                CASE
                    WHEN SUM(iv.precio_total) > 0
                    THEN ROUND((SUM(iv.precio_total - COALESCE(pr.precio_compra, 0) * iv.cantidad) * 100.0 / SUM(iv.precio_total))::numeric, 1)
                    ELSE 0
                END as margen_pct,
                CASE
                    WHEN SUM(COALESCE(pr.precio_compra, 0) * iv.cantidad) > 0
                    THEN ROUND((SUM(iv.precio_total - COALESCE(pr.precio_compra, 0) * iv.cantidad) * 100.0 / SUM(COALESCE(pr.precio_compra, 0) * iv.cantidad))::numeric, 1)
                    ELSE 0
                END as markup_pct
             FROM items_venta iv
             JOIN ventas v ON iv.venta_id = v.id
             JOIN presentaciones pr ON iv.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             LEFT JOIN categorias cat ON p.categoria_id = cat.id
             WHERE v.created_at >= NOW() - ($1::interval)
             AND v.estado != 'cancelado'
             GROUP BY ${groupBy}
             ORDER BY ganancia DESC`,
            [intervalo]
        )

        // Resumen total
        const resumen = await db.query(
            `${ITEMS_VENTA_CTE}
             SELECT
                COALESCE(SUM(iv.precio_total), 0) as ingresos_total,
                COALESCE(SUM(COALESCE(pr.precio_compra, 0) * iv.cantidad), 0) as costo_total,
                COALESCE(SUM(iv.precio_total - COALESCE(pr.precio_compra, 0) * iv.cantidad), 0) as ganancia_total,
                CASE
                    WHEN SUM(iv.precio_total) > 0
                    THEN ROUND((SUM(iv.precio_total - COALESCE(pr.precio_compra, 0) * iv.cantidad) * 100.0 / SUM(iv.precio_total))::numeric, 1)
                    ELSE 0
                END as margen_promedio_pct,
                CASE
                    WHEN SUM(COALESCE(pr.precio_compra, 0) * iv.cantidad) > 0
                    THEN ROUND((SUM(iv.precio_total - COALESCE(pr.precio_compra, 0) * iv.cantidad) * 100.0 / SUM(COALESCE(pr.precio_compra, 0) * iv.cantidad))::numeric, 1)
                    ELSE 0
                END as markup_promedio_pct
             FROM items_venta iv
             JOIN ventas v ON iv.venta_id = v.id
             JOIN presentaciones pr ON iv.presentacion_id = pr.id
             WHERE v.created_at >= NOW() - ($1::interval)
             AND v.estado != 'cancelado'`,
            [intervalo]
        )

        res.json({
            detalle: resultado.rows,
            resumen: resumen.rows[0]
        })
    } catch (error) {
        manejarError(res, error)
    }
})

router.get('/metricas', async (req, res) => {
    try {
        const { periodo = 'mes', canal, marca_id, categoria_id } = req.query

        const intervalos = { semana: '7 days', mes: '30 days', anual: '365 days', hoy: '1 day' }
        const intervalo = intervalos[periodo] || '30 days'

        let condiciones = [`v.created_at >= NOW() - ($1::interval)`, `v.estado != 'cancelado'`]
        let valores = [intervalo]
        let i = 2

        if (canal) {
            const mapCanal = {
                bot: `v.canal IN ('whatsapp_bot', 'whatsapp')`,
                tienda: `v.canal IN ('en_tienda', 'presencial', 'agente_presencial')`,
                delivery: `v.canal IN ('agente_delivery', 'whatsapp_delivery')`,
                web: `v.canal = 'pagina_web'`
            }
            if (mapCanal[canal]) condiciones.push(mapCanal[canal])
            else { condiciones.push(`v.canal = $${i}`); valores.push(canal); i++ }
        }

        if (marca_id) { condiciones.push(`p.marca_id = $${i}`); valores.push(parseInt(marca_id)); i++ }
        if (categoria_id) { condiciones.push(`p.categoria_id = $${i}`); valores.push(parseInt(categoria_id)); i++ }

        const resultado = await db.query(
            `SELECT
                COUNT(*) as cantidad,
                COALESCE(SUM(${VENTA_SIN_DELIVERY}), 0) as total,
                COALESCE(SUM(${GANANCIA_VENTA}), 0) as ganancia,
                COALESCE(AVG(${VENTA_SIN_DELIVERY}), 0) as ticket_promedio,
                FLOOR(COALESCE(SUM(${VENTA_SIN_DELIVERY}), 0) / 11) as iva_total
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

        const PY = `NOW() AT TIME ZONE 'America/Asuncion'`
        let intervaloActual, intervaloAnterior
        if (periodo === 'semana') {
            intervaloActual = `DATE_TRUNC('week', ${PY}) AT TIME ZONE 'America/Asuncion'`
            intervaloAnterior = `DATE_TRUNC('week', ${PY}) AT TIME ZONE 'America/Asuncion' - INTERVAL '7 days'`
        } else if (periodo === 'anual') {
            intervaloActual = `DATE_TRUNC('year', ${PY}) AT TIME ZONE 'America/Asuncion'`
            intervaloAnterior = `DATE_TRUNC('year', ${PY}) AT TIME ZONE 'America/Asuncion' - INTERVAL '1 year'`
        } else {
            intervaloActual = `DATE_TRUNC('month', ${PY}) AT TIME ZONE 'America/Asuncion'`
            intervaloAnterior = `DATE_TRUNC('month', ${PY}) AT TIME ZONE 'America/Asuncion' - INTERVAL '1 month'`
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
             WHERE created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion'
             AND created_at < DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion' + INTERVAL '1 day'
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
        const intervalos = { semana: '7 days', mes: '30 days', anual: '365 days', hoy: '1 day' }
        const intervalo = intervalos[periodo] || '30 days'

        // Pedidos y recaudación por zona
        const porZona = await db.query(
            `SELECT
                COALESCE(v.zona_delivery, 'Sin zona') as zona,
                COUNT(DISTINCT d.id) as cantidad_pedidos,
                COALESCE(SUM(v.costo_delivery), 0) as total_delivery,
                COALESCE(SUM(v.precio), 0) as total_ventas
            FROM deliveries d
            JOIN ventas v ON d.venta_id = v.id
            WHERE d.created_at >= NOW() - ($1::interval)
            AND d.estado != 'cancelado'
            GROUP BY v.zona_delivery
            ORDER BY cantidad_pedidos DESC`,
            [intervalo]
        )

        // Clientes por zona (ciudad)
        // Clientes por zona (ciudad) — normalizado
        const clientesPorZona = await db.query(
            `SELECT
                INITCAP(TRIM(LOWER(
                    TRANSLATE(MIN(ciudad),
                        'áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜâêîôûÂÊÎÔÛñÑ',
                        'aeiouAEIOUaeiouAEIOUaeiouAEIOUaeiouAEIOUnN'
                    )
                ))) as zona,
                COUNT(*) as total_clientes,
                COUNT(*) FILTER (WHERE activo = true) as clientes_activos,
                COUNT(*) FILTER (WHERE activo = false OR activo IS NULL) as clientes_inactivos
            FROM clientes
            WHERE ciudad IS NOT NULL AND ciudad != ''
            GROUP BY LOWER(TRIM(TRANSLATE(ciudad,
                'áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜâêîôûÂÊÎÔÛñÑ',
                'aeiouAEIOUaeiouAEIOUaeiouAEIOUaeiouAEIOUnN'
            )))
            ORDER BY total_clientes DESC`
        )

        // Total recaudado por delivery en el período
        const totalDelivery = await db.query(
            `SELECT COALESCE(SUM(v.costo_delivery), 0) as total
            FROM ventas v
            JOIN deliveries d ON v.id = d.venta_id
            WHERE d.created_at >= NOW() - ($1::interval)
            AND d.estado != 'cancelado'`,
            [intervalo]
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

// Estadistica APARTE de lo que se gana por delivery: el costo_delivery no es
// venta/ganancia nuestra (ver GANANCIA_VENTA), pero es plata real que pasa por
// la caja y hay que poder verla sola -- cuanto entro hoy/semana/mes/total,
// promedio diario/semanal/mensual, y a que zonas se entrega mas.
// Las semanas se cuentan de LUNES a DOMINGO: DATE_TRUNC('week', ...) en
// Postgres ya trunca al lunes de esa semana (ISO 8601), asi que no hace
// falta ningun ajuste manual de dia de la semana.
router.get('/delivery-ganancias', async (req, res) => {
    try {
        const HOY = `DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion'`
        const SEMANA_ACTUAL = `DATE_TRUNC('week', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion'`
        const MES_ACTUAL = `DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion'`
        // costo_delivery puede ser NULL en ventas viejas creadas por deliveries.js
        // sin ese dato -- COALESCE(...,0) explicito para que cantidad (COUNT, cuenta
        // el envio igual) y total (SUM) nunca representen conjuntos distintos.
        const COSTO = `COALESCE(v.costo_delivery, 0)`

        // Antes esto eran 12 queries en paralelo (4 totales + 4 por zona + 3
        // promedios + 1 de fechas), suficiente para saturar el pool (max: 10,
        // ver src/db/index.js) con una sola request. Ahora son 3: totales y
        // fechas de semana en una sola query con FILTER, zonas en otra con
        // FILTER, y los 3 promedios en una tercera via subqueries escalares.
        const [totales, zonas, promedios] = await Promise.all([
            db.query(
                `SELECT
                    COUNT(*) FILTER (WHERE d.created_at >= ${HOY}) as hoy_cantidad,
                    COALESCE(SUM(${COSTO}) FILTER (WHERE d.created_at >= ${HOY}), 0) as hoy_total,
                    COUNT(*) FILTER (WHERE d.created_at >= ${SEMANA_ACTUAL}) as semana_cantidad,
                    COALESCE(SUM(${COSTO}) FILTER (WHERE d.created_at >= ${SEMANA_ACTUAL}), 0) as semana_total,
                    COUNT(*) FILTER (WHERE d.created_at >= ${MES_ACTUAL}) as mes_cantidad,
                    COALESCE(SUM(${COSTO}) FILTER (WHERE d.created_at >= ${MES_ACTUAL}), 0) as mes_total,
                    COUNT(*) as total_cantidad,
                    COALESCE(SUM(${COSTO}), 0) as total_total,
                    (DATE_TRUNC('week', NOW() AT TIME ZONE 'America/Asuncion'))::date as semana_desde,
                    (DATE_TRUNC('week', NOW() AT TIME ZONE 'America/Asuncion') + INTERVAL '6 days')::date as semana_hasta
                 FROM deliveries d
                 JOIN ventas v ON d.venta_id = v.id
                 WHERE d.estado != 'cancelado'`
            ),
            db.query(
                `SELECT
                    COALESCE(v.zona_delivery, 'Sin zona') as zona,
                    COUNT(*) FILTER (WHERE d.created_at >= ${HOY}) as cantidad_hoy,
                    COALESCE(SUM(${COSTO}) FILTER (WHERE d.created_at >= ${HOY}), 0) as total_hoy,
                    COUNT(*) FILTER (WHERE d.created_at >= ${SEMANA_ACTUAL}) as cantidad_semana,
                    COALESCE(SUM(${COSTO}) FILTER (WHERE d.created_at >= ${SEMANA_ACTUAL}), 0) as total_semana,
                    COUNT(*) FILTER (WHERE d.created_at >= ${MES_ACTUAL}) as cantidad_mes,
                    COALESCE(SUM(${COSTO}) FILTER (WHERE d.created_at >= ${MES_ACTUAL}), 0) as total_mes,
                    COUNT(*) as cantidad_total,
                    COALESCE(SUM(${COSTO}), 0) as total_total
                 FROM deliveries d
                 JOIN ventas v ON d.venta_id = v.id
                 WHERE d.estado != 'cancelado'
                 GROUP BY v.zona_delivery`
            ),
            db.query(
                `SELECT
                    (SELECT COALESCE(AVG(total_dia), 0) FROM (
                        SELECT DATE((d.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Asuncion') as dia,
                               SUM(${COSTO}) as total_dia
                        FROM deliveries d JOIN ventas v ON d.venta_id = v.id
                        WHERE d.estado != 'cancelado' AND d.created_at >= NOW() - INTERVAL '30 days'
                        GROUP BY dia
                    ) t_dia) as promedio_diario,
                    (SELECT COALESCE(AVG(total_semana), 0) FROM (
                        SELECT DATE_TRUNC('week', (d.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Asuncion') as semana,
                               SUM(${COSTO}) as total_semana
                        FROM deliveries d JOIN ventas v ON d.venta_id = v.id
                        WHERE d.estado != 'cancelado' AND d.created_at >= NOW() - INTERVAL '84 days'
                        GROUP BY semana
                    ) t_semana) as promedio_semanal,
                    (SELECT COALESCE(AVG(total_mes), 0) FROM (
                        SELECT DATE_TRUNC('month', (d.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Asuncion') as mes,
                               SUM(${COSTO}) as total_mes
                        FROM deliveries d JOIN ventas v ON d.venta_id = v.id
                        WHERE d.estado != 'cancelado' AND d.created_at >= NOW() - INTERVAL '365 days'
                        GROUP BY mes
                    ) t_mes) as promedio_mensual`
            )
        ])

        const t = totales.rows[0]

        // El orden por cantidad (mayor a menor) que antes hacia SQL por
        // periodo ahora se hace en JS, ya sobre las 4 columnas ya traidas.
        const zonaPeriodo = (cantidadCol, totalCol) => zonas.rows
            .map(r => ({ zona: r.zona, cantidad: parseInt(r[cantidadCol]), total: parseInt(r[totalCol]) }))
            .filter(r => r.cantidad > 0)
            .sort((a, b) => b.cantidad - a.cantidad)

        res.json({
            hoy: { cantidad: parseInt(t.hoy_cantidad), total: parseInt(t.hoy_total) },
            semana_actual: {
                cantidad: parseInt(t.semana_cantidad),
                total: parseInt(t.semana_total),
                desde: t.semana_desde,
                hasta: t.semana_hasta
            },
            mes_actual: { cantidad: parseInt(t.mes_cantidad), total: parseInt(t.mes_total) },
            total_historico: { cantidad: parseInt(t.total_cantidad), total: parseInt(t.total_total) },
            promedios: {
                diario: Math.round(parseFloat(promedios.rows[0].promedio_diario)),
                semanal: Math.round(parseFloat(promedios.rows[0].promedio_semanal)),
                mensual: Math.round(parseFloat(promedios.rows[0].promedio_mensual))
            },
            zonas: {
                hoy: zonaPeriodo('cantidad_hoy', 'total_hoy'),
                semana: zonaPeriodo('cantidad_semana', 'total_semana'),
                mes: zonaPeriodo('cantidad_mes', 'total_mes'),
                total: zonaPeriodo('cantidad_total', 'total_total')
            }
        })
    } catch (error) {
        manejarError(res, error)
    }
})

router.get('/clientes-retencion', async (req, res) => {
    try {
        const { periodo = 'mes' } = req.query
        const intervalos = { semana: '7 days', mes: '30 days', anual: '365 days' }
        const intervalo = intervalos[periodo] || '30 days'
        const intervaloAnterior = intervalo === '7 days' ? '14 days' : intervalo === '30 days' ? '60 days' : '730 days'

        const activos = await db.query(
            `SELECT COUNT(DISTINCT cliente_id) as cantidad FROM ventas
             WHERE created_at >= NOW() - ($1::interval)
             AND cliente_id IS NOT NULL AND estado != 'cancelado'`,
            [intervalo]
        )

        const retenidos = await db.query(
            `SELECT COUNT(DISTINCT v1.cliente_id) as cantidad FROM ventas v1
             WHERE v1.created_at >= NOW() - ($1::interval)
             AND v1.cliente_id IS NOT NULL AND v1.estado != 'cancelado'
             AND EXISTS (
                 SELECT 1 FROM ventas v2
                 WHERE v2.cliente_id = v1.cliente_id
                 AND v2.created_at >= NOW() - ($2::interval)
                 AND v2.created_at < NOW() - ($1::interval)
                 AND v2.estado != 'cancelado'
             )`,
            [intervalo, intervaloAnterior]
        )

        const nuevos = await db.query(
            `SELECT COUNT(DISTINCT v.cliente_id) as cantidad FROM ventas v
             WHERE v.created_at >= NOW() - ($1::interval)
             AND v.cliente_id IS NOT NULL AND v.estado != 'cancelado'
             AND NOT EXISTS (
                 SELECT 1 FROM ventas v2
                 WHERE v2.cliente_id = v.cliente_id
                 AND v2.created_at < NOW() - ($1::interval)
                 AND v2.estado != 'cancelado'
             )`,
            [intervalo]
        )

        const perdidos = await db.query(
            `SELECT COUNT(DISTINCT v.cliente_id) as cantidad FROM ventas v
             WHERE v.created_at >= NOW() - ($2::interval)
             AND v.created_at < NOW() - ($1::interval)
             AND v.cliente_id IS NOT NULL AND v.estado != 'cancelado'
             AND NOT EXISTS (
                 SELECT 1 FROM ventas v2
                 WHERE v2.cliente_id = v.cliente_id
                 AND v2.created_at >= NOW() - ($1::interval)
                 AND v2.estado != 'cancelado'
             )`,
            [intervalo, intervaloAnterior]
        )

        const totalActivos = parseInt(activos.rows[0].cantidad)
        const totalRetenidos = parseInt(retenidos.rows[0].cantidad)

        res.json({
            activos: totalActivos,
            retenidos: totalRetenidos,
            nuevos: parseInt(nuevos.rows[0].cantidad),
            perdidos: parseInt(perdidos.rows[0].cantidad),
            tasa_retencion: totalActivos > 0 ? Math.round((totalRetenidos / totalActivos) * 100) : 0
        })
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router