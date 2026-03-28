const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { validarVentaPresencial, validarEstado, validarId } = require('../middleware/validar')
const { recalcularStats } = require('./clientes')
const { manejarError } = require('../middleware/validar')
const { descontarStockFEFO } = require('../services/stock')
const { registrarLog } = require('../middleware/auditoria')


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
router.get('/historial', async (req, res) => {
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
                    (v.precio - COALESCE(pr.precio_compra, 0)) as ganancia
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
router.get('/:id', validarId, async (req, res) => {
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

// 7. Registrar venta presencial
router.post('/presencial', validarVentaPresencial, async (req, res) => {
    const client = await db.pool.connect()
    try {
        const {
            cliente_id,
            presentacion_id,
            cantidad,
            precio,
            metodo_pago,
            subtipo_pago,
            quiere_factura,
            ruc_factura,
            razon_social,
            agente_id,
            canal,
            es_de_whatsapp,
            sesion_numero
        } = req.body

        await client.query('BEGIN')

        const stock = await client.query(
            `SELECT stock, nombre FROM presentaciones WHERE id = $1 FOR UPDATE`,
            [presentacion_id]
        )

        if (stock.rows.length === 0) {
            await client.query('ROLLBACK')
            return res.status(404).json({ error: 'Presentación no encontrada' })
        }

        if (stock.rows[0].stock < cantidad) {
            await client.query('ROLLBACK')
            return res.status(400).json({ error: `Stock insuficiente. Disponible: ${stock.rows[0].stock}` })
        }

        const canalFinal = canal || 'en_tienda'

        const venta = await client.query(
            `INSERT INTO ventas (cliente_id, presentacion_id, cantidad, precio, canal, estado, metodo_pago, subtipo_pago, quiere_factura, ruc_factura, razon_social, agente_id)
            VALUES ($1, $2, $3, $4, $5, 'pagado', $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [cliente_id || null, presentacion_id, cantidad, precio, canalFinal,
            metodo_pago, subtipo_pago || null, quiere_factura || false, ruc_factura || null,
            razon_social || null, agente_id || null]
        )

        
        // Si hay lotes cargados, descontar por FEFO. Si no, descontar directo.
        const lotesExisten = await client.query(
            `SELECT COUNT(*) as total FROM lotes WHERE presentacion_id = $1 AND activo = true AND stock_actual > 0`,
            [presentacion_id]
        )

        if (parseInt(lotesExisten.rows[0].total) > 0) {
            await descontarStockFEFO(client, presentacion_id, cantidad)
        } else {
            await client.query(
                `UPDATE presentaciones SET stock = stock - $1 WHERE id = $2`,
                [cantidad, presentacion_id]
            )
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

            // Recalcular stats del cliente en background (no bloquea la respuesta)
            if (cliente_id) {
                recalcularStats(cliente_id).catch(() => {})
            }

            registrarLog({
                usuario_id: req.usuario?.id || null,
                usuario_nombre: req.usuario?.nombre || 'Sistema',
                accion: 'crear',
                modulo: 'ventas',
                entidad: 'venta',
                entidad_id: venta.rows[0].id,
                descripcion: `Venta registrada — ${stock.rows[0].nombre} x${cantidad} — Gs. ${precio.toLocaleString()}`,
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