const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { validarVentaPresencial, validarEstado, validarId } = require('../middleware/validar')
const { recalcularStats } = require('./clientes')
const { manejarError } = require('../middleware/validar')
const { descontarStockFEFO } = require('../services/stock')
const { registrarLog } = require('../middleware/auditoria')
const { autenticar, verificarPermiso } = require('../middleware/auth')



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
                    (v.precio - COALESCE(pr.precio_compra, 0)) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN usuarios u ON v.agente_id = u.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             ORDER BY v.created_at DESC`
        )
        res.json(resultado.rows)
    } catch (error) {
    manejarError(res, error)
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
                    (v.precio - COALESCE(pr.precio_compra, 0)) as ganancia
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
    manejarError(res, error)
}
})

// 3. Historial con filtros y paginación
router.get('/historial', autenticar, verificarPermiso('ventas', 'ver'), async (req, res) => {
    try {
       const {
            periodo = 'recientes',
            buscar,
            metodo_pago,
            canal,
            estado,        // ← agregar aquí
            fecha_desde,
            fecha_hasta,
            pagina = 1,
            por_pagina = 20
        } = req.query

        const offset = (parseInt(pagina) - 1) * parseInt(por_pagina)

        let condiciones = ['1=1']
        let valores = []
        let i = 1

        if (periodo === 'recientes') {
            condiciones.push(`v.created_at >= NOW() - INTERVAL '24 hours'`)
        } else if (periodo === 'semanal') {
            condiciones.push(`v.created_at >= DATE_TRUNC('week', NOW())`)
        } else if (periodo === 'mensual') {
            condiciones.push(`v.created_at >= DATE_TRUNC('month', NOW())`)
        } else if (periodo === 'anual') {
            condiciones.push(`v.created_at >= DATE_TRUNC('year', NOW())`)
        } else if (periodo === 'personalizado' && fecha_desde && fecha_hasta) {
            condiciones.push(`v.created_at >= $${i} AND v.created_at <= $${i + 1}`)
            valores.push(fecha_desde, fecha_hasta)
            i += 2
        }
        if (estado) {
            condiciones.push(`v.estado = $${i}`)
            valores.push(estado)
            i++
        }

        if (buscar) {
            condiciones.push(`(
                CAST(v.id AS TEXT) ILIKE $${i} OR
                LOWER(COALESCE(c.nombre, '')) ILIKE $${i} OR
                COALESCE(v.cliente_numero, '') ILIKE $${i}
            )`)
            valores.push(`%${buscar.toLowerCase()}%`)
            i++
        }

        if (metodo_pago) {
            condiciones.push(`v.metodo_pago = $${i}`)
            valores.push(metodo_pago)
            i++
        }

        if (canal) {
            condiciones.push(`v.canal = $${i}`)
            valores.push(canal)
            i++
        }

        const where = condiciones.join(' AND ')

        const total = await db.query(
            `SELECT COUNT(*) as total
             FROM ventas v
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE ${where}`,
            valores
        )

        const ventas = await db.query(
            `SELECT v.*,
                    pr.nombre as presentacion_nombre,
                    pr.precio_compra,
                    p.nombre as producto_nombre,
                    m.nombre as marca_nombre,
                    c.nombre as cliente_nombre,
                    c.ruc as cliente_ruc,
                    (v.precio - COALESCE(pr.precio_compra, 0)) as ganancia,
                    (SELECT JSON_AGG(JSON_BUILD_OBJECT(
                        'id', vi.id,
                        'presentacion_id', vi.presentacion_id,
                        'cantidad', vi.cantidad,
                        'precio_unitario', vi.precio_unitario,
                        'precio_total', vi.precio_total,
                        'tipo_iva', vi.tipo_iva,
                        'producto_nombre', p2.nombre,
                        'presentacion_nombre', pr2.nombre,
                        'marca_nombre', m2.nombre,
                        'precio_compra', pr2.precio_compra
                    ) ORDER BY vi.id)
                    FROM ventas_items vi
                    JOIN presentaciones pr2 ON vi.presentacion_id = pr2.id
                    JOIN productos p2 ON pr2.producto_id = p2.id
                    LEFT JOIN marcas m2 ON p2.marca_id = m2.id
                    WHERE vi.venta_id = v.id) as items
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE ${where}
             ORDER BY v.created_at DESC
             LIMIT $${i} OFFSET $${i + 1}`,
            [...valores, parseInt(por_pagina), offset]
        )

        const resumenDia = await db.query(
            `SELECT COUNT(*) as cantidad,
                    COALESCE(SUM(v.precio), 0) as total,
                    COALESCE(SUM(v.precio - COALESCE(pr.precio_compra, 0)), 0) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             WHERE v.created_at >= CURRENT_DATE AND v.estado != 'cancelado'`
        )

        const resumenSemana = await db.query(
            `SELECT COUNT(*) as cantidad,
                    COALESCE(SUM(v.precio), 0) as total
             FROM ventas v
             WHERE v.created_at >= DATE_TRUNC('week', NOW()) AND v.estado != 'cancelado'`
        )

        const resumenMes = await db.query(
            `SELECT COUNT(*) as cantidad,
                    COALESCE(SUM(v.precio), 0) as total
             FROM ventas v
             WHERE v.created_at >= DATE_TRUNC('month', NOW()) AND v.estado != 'cancelado'`
        )

        res.json({
            ventas: ventas.rows,
            paginacion: {
                total: parseInt(total.rows[0].total),
                pagina: parseInt(pagina),
                por_pagina: parseInt(por_pagina),
                total_paginas: Math.ceil(parseInt(total.rows[0].total) / parseInt(por_pagina))
            },
            resumen: {
                dia: resumenDia.rows[0],
                semana: resumenSemana.rows[0],
                mes: resumenMes.rows[0]
            }
        })

    } catch (error) {
    manejarError(res, error)
}
})

// Libro de ventas (SET)
router.get('/libro-ventas', async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query

        if (!fecha_desde || !fecha_hasta) {
            return res.status(400).json({ error: 'Fecha desde y hasta son requeridas' })
        }

        const resultado = await db.query(
            `SELECT
                DATE(v.created_at AT TIME ZONE 'America/Asuncion') as fecha,
                v.id,
                v.tipo_iva,
                v.precio as total,
                v.ruc_factura,
                v.razon_social,
                c.nombre as cliente_nombre,
                c.ruc as cliente_ruc
             FROM ventas v
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE v.created_at >= $1
             AND v.created_at <= $2
             AND v.estado != 'cancelado'
             ORDER BY v.created_at ASC`,
            [fecha_desde, fecha_hasta + 'T23:59:59']
        )

        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// 4. Reporte para exportar — ANTES de /:id
router.get('/reporte/exportar', async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta, canal } = req.query

        if (!fecha_desde || !fecha_hasta) {
            return res.status(400).json({ error: 'Fecha desde y hasta son requeridas' })
        }

        let condiciones = [
            `v.created_at >= $1`,
            `v.created_at < $2`,
            `v.estado != 'cancelado'`
        ]
        let valores = [fecha_desde, fecha_hasta]
        let i = 3

        if (canal) {
            condiciones.push(`v.canal = $${i}`)
            valores.push(canal)
            i++
        }

        const where = condiciones.join(' AND ')

        const resultado = await db.query(
            `SELECT
                DATE(v.created_at) as fecha,
                COALESCE(c.nombre, v.razon_social, 'Consumidor final') as cliente,
                COALESCE(c.ruc, v.ruc_factura, '') as ruc,
                COALESCE(c.telefono, v.cliente_numero, '') as telefono,
                m.nombre as marca,
                p.nombre as producto,
                pr.nombre as presentacion,
                v.cantidad,
                v.precio as monto,
                FLOOR(v.precio::numeric / 11) as iva,
                v.canal,
                v.metodo_pago,
                v.estado
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE ${where}
             ORDER BY v.created_at ASC`,
            valores
        )

        res.json(resultado.rows)
    } catch (error) {
    manejarError(res, error)
}
})

// 5. Ver una venta específica
router.get('/:id', autenticar, verificarPermiso('ventas', 'editar'), async (req, res) => {
    try {
        const { id } = req.params
        const resultado = await db.query(
            `SELECT v.*,
                    pr.nombre as presentacion_nombre,
                    pr.precio_compra,
                    p.nombre as producto_nombre,
                    c.nombre as cliente_nombre,
                    (v.precio - COALESCE(pr.precio_compra, 0)) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE v.id = $1`,
            [parseInt(id)]
        )
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Venta no encontrada' })
        }
        res.json(resultado.rows[0])
    } catch (error) {
    manejarError(res, error)
}
})

// 6. Actualizar estado de una venta
router.patch('/:id/estado', validarId, validarEstado, async (req, res) => {
    try {
        const { id } = req.params
        const { estado, agente_id } = req.body

        const resultado = await db.query(
            `UPDATE ventas 
             SET estado = $1, agente_id = $2
             WHERE id = $3
             RETURNING *`,
            [estado, agente_id, parseInt(id)]
        )

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Venta no encontrada' })
        }

        registrarLog({
            usuario_id: req.usuario?.id || null,
            usuario_nombre: req.usuario?.nombre || 'Sistema',
            accion: 'editar',
            modulo: 'ventas',
            entidad: 'venta',
            entidad_id: parseInt(id),
            descripcion: `Estado de venta cambiado a ${estado}`,
            dato_anterior: { estado: resultado.rows[0].estado },
            dato_nuevo: { estado },
            ip: req.ip
        }).catch(() => {})

        res.json({ ok: true, venta: resultado.rows[0] })
    } catch (error) {
    manejarError(res, error)
}
})

// 7. Registrar venta presencial (soporta multi-producto via items[])
router.post('/presencial', autenticar, verificarPermiso('ventas', 'crear'), async (req, res) => {
    const client = await db.pool.connect()
    try {
        const {
            cliente_id,
            items,            // [{presentacion_id, cantidad, precio_unitario, tipo_iva}]
            precio,           // total de la venta (sin delivery)
            metodo_pago,
            subtipo_pago,
            quiere_factura,
            ruc_factura,
            razon_social,
            agente_id,
            canal,
            es_de_whatsapp,
            sesion_numero,
            tipo_venta,
            plazo_dias,
            tipo_iva,
            costo_delivery,
            zona_delivery,
            // backward compat single-product
            presentacion_id,
            cantidad,
        } = req.body

        // Normalizar a array de items
        const itemsNorm = (Array.isArray(items) && items.length > 0)
            ? items
            : [{ presentacion_id: parseInt(presentacion_id), cantidad: parseInt(cantidad) || 1, precio_unitario: Math.round(parseInt(precio) / (parseInt(cantidad) || 1)), tipo_iva: tipo_iva || '10' }]

        const subtotal = itemsNorm.reduce((s, it) => s + (parseInt(it.precio_unitario) * parseInt(it.cantidad)), 0)
        const totalPrecio = subtotal + (parseInt(costo_delivery) || 0)

        await client.query('BEGIN')

        // Validar stock de todos los items antes de insertar
        for (const item of itemsNorm) {
            const stock = await client.query(
                `SELECT stock, nombre FROM presentaciones WHERE id = $1 FOR UPDATE`,
                [parseInt(item.presentacion_id)]
            )
            if (stock.rows.length === 0) {
                await client.query('ROLLBACK')
                return res.status(404).json({ error: `Presentación ${item.presentacion_id} no encontrada` })
            }
            if (stock.rows[0].stock < parseInt(item.cantidad)) {
                await client.query('ROLLBACK')
                return res.status(400).json({ error: `Stock insuficiente para "${stock.rows[0].nombre}". Disponible: ${stock.rows[0].stock}` })
            }
        }

        const fecha_vencimiento_credito = tipo_venta === 'credito' && plazo_dias
            ? new Date(Date.now() + parseInt(plazo_dias) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
            : null

        const canalFinal = canal || 'agente_presencial'
        const estadoVenta = (tipo_venta === 'credito' || canalFinal === 'agente_delivery' || canalFinal === 'whatsapp_delivery')
            ? 'pendiente_pago'
            : 'pagado'

        // Para backward compat: si es un solo item, guardar presentacion_id en la venta header
        const ventaPresentacionId = itemsNorm.length === 1 ? parseInt(itemsNorm[0].presentacion_id) : null
        const ventaCantidad = itemsNorm.length === 1 ? parseInt(itemsNorm[0].cantidad) : null
        const ventaTipoIva = itemsNorm.length === 1 ? (itemsNorm[0].tipo_iva || '10') : '10'

        const venta = await client.query(
            `INSERT INTO ventas (cliente_id, presentacion_id, cantidad, precio, canal, estado, metodo_pago, subtipo_pago, quiere_factura, ruc_factura, razon_social, agente_id, tipo_venta, plazo_dias, fecha_vencimiento_credito, tipo_iva, costo_delivery, zona_delivery)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *`,
            [cliente_id || null, ventaPresentacionId, ventaCantidad, totalPrecio, canalFinal, estadoVenta,
            metodo_pago, subtipo_pago || null, quiere_factura || false, ruc_factura || null,
            razon_social || null, agente_id || null,
            tipo_venta || 'contado', plazo_dias || null, fecha_vencimiento_credito, ventaTipoIva,
            costo_delivery || 0, zona_delivery || null]
        )

        const ventaId = venta.rows[0].id

        // Insertar items en ventas_items
        for (const item of itemsNorm) {
            await client.query(
                `INSERT INTO ventas_items (venta_id, presentacion_id, cantidad, precio_unitario, precio_total, tipo_iva)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [ventaId, parseInt(item.presentacion_id), parseInt(item.cantidad),
                 parseInt(item.precio_unitario), parseInt(item.precio_unitario) * parseInt(item.cantidad),
                 item.tipo_iva || '10']
            )
        }

        // Descontar stock por cada item (FEFO si hay lotes)
        for (const item of itemsNorm) {
            const lotesExisten = await client.query(
                `SELECT COUNT(*) as total FROM lotes WHERE presentacion_id = $1 AND activo = true AND stock_actual > 0`,
                [parseInt(item.presentacion_id)]
            )
            if (parseInt(lotesExisten.rows[0].total) > 0) {
                await descontarStockFEFO(client, parseInt(item.presentacion_id), parseInt(item.cantidad))
            } else {
                await client.query(
                    `UPDATE presentaciones SET stock = stock - $1 WHERE id = $2`,
                    [parseInt(item.cantidad), parseInt(item.presentacion_id)]
                )
            }
        }

        if (es_de_whatsapp && sesion_numero) {
            await client.query(
                `UPDATE deliveries SET estado = 'en_camino', updated_at = NOW()
                 WHERE cliente_numero = $1
                 AND estado IN ('pendiente', 'confirmado')
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [sesion_numero]
            )
        }

        await client.query('COMMIT')

        if (cliente_id) {
            recalcularStats(cliente_id).catch(() => {})
        }

        const descripcion = itemsNorm.length === 1
            ? `Venta registrada — ${itemsNorm[0].cantidad}x item — Gs. ${totalPrecio.toLocaleString()}`
            : `Venta registrada — ${itemsNorm.length} productos — Gs. ${totalPrecio.toLocaleString()}`

        registrarLog({
            usuario_id: req.usuario?.id || null,
            usuario_nombre: req.usuario?.nombre || 'Sistema',
            accion: 'crear',
            modulo: 'ventas',
            entidad: 'venta',
            entidad_id: ventaId,
            descripcion,
            dato_nuevo: venta.rows[0],
            ip: req.ip
        }).catch(() => {})

        res.status(201).json({ ok: true, venta: venta.rows[0] })

    } catch (error) {
        await client.query('ROLLBACK')
        manejarError(res, error)
    } finally {
        client.release()
    }
})

module.exports = router