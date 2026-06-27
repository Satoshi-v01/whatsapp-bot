const express = require('express')
const router = express.Router()
const db = require('../db/index')

const idempotenciaCache = new Map()
const { validarVentaPresencial, validarEstado, validarId } = require('../middleware/validar')
const { recalcularStats } = require('./clientes')
const { manejarError } = require('../middleware/validar')
const { descontarStockFEFO } = require('../services/stock')
const { registrarLog } = require('../middleware/auditoria')
const { autenticar, verificarPermiso } = require('../middleware/auth')



// 1. Ver todas las ventas
router.get('/', autenticar, verificarPermiso('ventas', 'ver'), async (req, res) => {
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
router.get('/estado/:estado', autenticar, verificarPermiso('ventas', 'ver'), async (req, res) => {
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
            estado,
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
            condiciones.push(`v.created_at >= DATE_TRUNC('week', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion'`)
        } else if (periodo === 'mensual') {
            condiciones.push(`v.created_at >= DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion'`)
        } else if (periodo === 'anual') {
            condiciones.push(`v.created_at >= DATE_TRUNC('year', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion'`)
        } else if (periodo === 'personalizado' && fecha_desde && fecha_hasta) {
            condiciones.push(`v.created_at >= ($${i}::timestamp AT TIME ZONE 'America/Asuncion') AND v.created_at <= ($${i + 1}::timestamp AT TIME ZONE 'America/Asuncion')`)
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
                COALESCE(v.numero_factura, '') ILIKE $${i} OR
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

        // Contar facturas agrupadas, no filas individuales
        const total = await db.query(
            `SELECT COUNT(*) as total FROM (
                SELECT COALESCE(v.numero_factura, v.id::text) as grupo
                FROM ventas v
                LEFT JOIN clientes c ON v.cliente_id = c.id
                WHERE ${where}
                GROUP BY COALESCE(v.numero_factura, v.id::text)
             ) g`,
            valores
        )

        // CTE: agrupa ventas por numero_factura (o por id si no tiene factura)
        // Suma el precio de todas las lineas y agrega los productos como items_heredados
        const cteGrupos = `
            WITH grupos AS (
                SELECT
                    MIN(v.id) as id,
                    MIN(v.numero_factura) as numero_factura,
                    MIN(v.created_at) as created_at,
                    MIN(v.cliente_id) as cliente_id,
                    SUM(v.precio) as precio,
                    CASE
                        WHEN BOOL_AND(v.estado = 'cancelado') THEN 'cancelado'
                        WHEN BOOL_OR(v.estado = 'pagado') THEN 'pagado'
                        ELSE 'pendiente_pago'
                    END as estado,
                    MIN(v.metodo_pago) as metodo_pago,
                    MIN(v.subtipo_pago) as subtipo_pago,
                    MIN(v.canal) as canal,
                    MIN(v.agente_id) as agente_id,
                    BOOL_OR(v.quiere_factura) as quiere_factura,
                    MIN(v.ruc_factura) as ruc_factura,
                    MIN(v.razon_social) as razon_social,
                    MIN(v.tipo_venta) as tipo_venta,
                    SUM(COALESCE(v.costo_delivery, 0)) as costo_delivery,
                    MIN(v.zona_delivery) as zona_delivery,
                    MIN(v.cliente_numero) as cliente_numero,
                    MIN(v.tipo_iva) as tipo_iva,
                    MIN(pr.nombre) as presentacion_nombre,
                    MIN(p.nombre) as producto_nombre,
                    MIN(m.nombre) as marca_nombre,
                    MIN(c.nombre) as cliente_nombre,
                    MIN(c.ruc) as cliente_ruc,
                    SUM(v.precio - COALESCE(pr.precio_compra, 0)) as ganancia,
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'id', v.id,
                        'presentacion_id', v.presentacion_id,
                        'cantidad', v.cantidad,
                        'precio_unitario', v.precio,
                        'precio_total', v.precio,
                        'tipo_iva', v.tipo_iva,
                        'producto_nombre', p.nombre,
                        'presentacion_nombre', pr.nombre,
                        'marca_nombre', m.nombre,
                        'precio_compra', pr.precio_compra
                    ) ORDER BY v.id) FILTER (WHERE v.presentacion_id IS NOT NULL) as items_heredados
                FROM ventas v
                LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
                LEFT JOIN productos p ON pr.producto_id = p.id
                LEFT JOIN marcas m ON p.marca_id = m.id
                LEFT JOIN clientes c ON v.cliente_id = c.id
                WHERE ${where}
                GROUP BY COALESCE(v.numero_factura, v.id::text)
                ORDER BY MIN(v.created_at) DESC
                LIMIT $${i} OFFSET $${i + 1}
            )`

        const selectConItems = cteGrupos + `
            SELECT g.id, g.numero_factura, g.created_at, g.cliente_id, g.precio, g.estado,
                   g.metodo_pago, g.subtipo_pago, g.canal, g.agente_id, g.quiere_factura,
                   g.ruc_factura, g.razon_social, g.tipo_venta, g.costo_delivery, g.zona_delivery,
                   g.cliente_numero, g.tipo_iva, g.presentacion_nombre, g.producto_nombre,
                   g.marca_nombre, g.cliente_nombre, g.cliente_ruc, g.ganancia,
                   COALESCE(
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
                       WHERE vi.venta_id = g.id),
                       g.items_heredados
                   ) as items
            FROM grupos g`

        const selectSinItems = cteGrupos + `
            SELECT g.id, g.numero_factura, g.created_at, g.cliente_id, g.precio, g.estado,
                   g.metodo_pago, g.subtipo_pago, g.canal, g.agente_id, g.quiere_factura,
                   g.ruc_factura, g.razon_social, g.tipo_venta, g.costo_delivery, g.zona_delivery,
                   g.cliente_numero, g.tipo_iva, g.presentacion_nombre, g.producto_nombre,
                   g.marca_nombre, g.cliente_nombre, g.cliente_ruc, g.ganancia,
                   g.items_heredados as items
            FROM grupos g`

        let ventas
        try {
            ventas = await db.query(selectConItems, [...valores, parseInt(por_pagina), offset])
        } catch (err) {
            // 42P01 = tabla ventas_items no existe aún
            if (err.code === '42P01') {
                ventas = await db.query(selectSinItems, [...valores, parseInt(por_pagina), offset])
            } else {
                throw err
            }
        }

        const resumenDia = await db.query(
            `SELECT COUNT(*) as cantidad,
                    COALESCE(SUM(v.precio), 0) as total,
                    COALESCE(SUM(v.precio - COALESCE(pr.precio_compra, 0)), 0) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             WHERE v.created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion' AND v.estado != 'cancelado'`
        )

        const resumenSemana = await db.query(
            `SELECT COUNT(*) as cantidad,
                    COALESCE(SUM(v.precio), 0) as total
             FROM ventas v
             WHERE v.created_at >= DATE_TRUNC('week', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion' AND v.estado != 'cancelado'`
        )

        const resumenMes = await db.query(
            `SELECT COUNT(*) as cantidad,
                    COALESCE(SUM(v.precio), 0) as total
             FROM ventas v
             WHERE v.created_at >= DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion' AND v.estado != 'cancelado'`
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
router.get('/libro-ventas', autenticar, verificarPermiso('ventas', 'ver'), async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query

        if (!fecha_desde || !fecha_hasta) {
            return res.status(400).json({ error: 'Fecha desde y hasta son requeridas' })
        }

        const resultado = await db.query(
            `SELECT
                DATE(v.created_at AT TIME ZONE 'America/Asuncion') as fecha,
                v.id,
                v.numero_factura,
                v.tipo_iva,
                v.precio as total,
                v.estado,
                v.ruc_factura,
                v.razon_social,
                c.nombre as cliente_nombre,
                c.ruc as cliente_ruc
             FROM ventas v
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE v.created_at >= $1
             AND v.created_at <= $2
             ORDER BY v.created_at ASC`,
            [fecha_desde, fecha_hasta + 'T23:59:59']
        )

        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// 4. Reporte para exportar — ANTES de /:id
router.get('/reporte/exportar', autenticar, verificarPermiso('ventas', 'ver'), async (req, res) => {
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

// 6. Actualizar estado de una venta (actualiza todas las lineas del mismo numero_factura)
router.patch('/:id/estado', autenticar, verificarPermiso('ventas', 'editar'), validarId, validarEstado, async (req, res) => {
    try {
        const { id } = req.params
        const { estado, agente_id } = req.body

        const ventaRef = await db.query(`SELECT numero_factura FROM ventas WHERE id = $1`, [parseInt(id)])
        if (!ventaRef.rows.length) return res.status(404).json({ error: 'Venta no encontrada' })

        const { numero_factura } = ventaRef.rows[0]

        const resultado = numero_factura
            ? await db.query(
                `UPDATE ventas SET estado = $1, agente_id = $2 WHERE numero_factura = $3 RETURNING *`,
                [estado, agente_id, numero_factura]
              )
            : await db.query(
                `UPDATE ventas SET estado = $1, agente_id = $2 WHERE id = $3 RETURNING *`,
                [estado, agente_id, parseInt(id)]
              )

        if (!resultado.rows.length) return res.status(404).json({ error: 'Venta no encontrada' })

        registrarLog({
            usuario_id: req.usuario?.id || null,
            usuario_nombre: req.usuario?.nombre || 'Sistema',
            accion: 'editar',
            modulo: 'ventas',
            entidad: 'venta',
            entidad_id: parseInt(id),
            descripcion: `Estado${numero_factura ? ` de factura ${numero_factura}` : ''} cambiado a ${estado} (${resultado.rows.length} linea/s)`,
            dato_nuevo: { estado },
            ip: req.ip
        }).catch(() => {})

        res.json({ ok: true, venta: resultado.rows[0] })
    } catch (error) {
        manejarError(res, error)
    }
})

// 7. Anular venta — anula todas las lineas del mismo numero_factura y devuelve stock
router.post('/:id/anular', autenticar, verificarPermiso('ventas', 'cancelar'), async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { id } = req.params

        const ventaRes = await client.query(`SELECT * FROM ventas WHERE id = $1`, [parseInt(id)])
        if (!ventaRes.rows.length) return res.status(404).json({ error: 'Venta no encontrada' })
        const venta = ventaRes.rows[0]

        if (venta.estado === 'cancelado') {
            return res.status(400).json({ error: 'La venta ya está anulada' })
        }

        // Obtener todas las filas de la misma factura (o solo esta si no tiene numero_factura)
        const filasRes = venta.numero_factura
            ? await client.query(
                `SELECT * FROM ventas WHERE numero_factura = $1 AND estado != 'cancelado'`,
                [venta.numero_factura]
              )
            : await client.query(
                `SELECT * FROM ventas WHERE id = $1 AND estado != 'cancelado'`,
                [parseInt(id)]
              )

        const filas = filasRes.rows

        await client.query('BEGIN')

        for (const fila of filas) {
            // Intentar devolver stock desde ventas_items; fallback a columna directa
            let itemsRes
            try {
                itemsRes = await client.query(
                    `SELECT presentacion_id, cantidad FROM ventas_items WHERE venta_id = $1`,
                    [fila.id]
                )
            } catch { itemsRes = { rows: [] } }

            const items = itemsRes.rows.length > 0
                ? itemsRes.rows
                : (fila.presentacion_id ? [{ presentacion_id: fila.presentacion_id, cantidad: fila.cantidad }] : [])

            for (const item of items) {
                await client.query(
                    `UPDATE presentaciones SET stock = stock + $1 WHERE id = $2`,
                    [parseInt(item.cantidad), parseInt(item.presentacion_id)]
                )
            }
        }

        if (venta.numero_factura) {
            await client.query(`UPDATE ventas SET estado = 'cancelado' WHERE numero_factura = $1`, [venta.numero_factura])
        } else {
            await client.query(`UPDATE ventas SET estado = 'cancelado' WHERE id = $1`, [parseInt(id)])
        }

        await client.query('COMMIT')

        registrarLog({
            usuario_id: req.usuario?.id || null,
            usuario_nombre: req.usuario?.nombre || 'Sistema',
            accion: 'cancelar',
            modulo: 'ventas',
            entidad: 'venta',
            entidad_id: parseInt(id),
            descripcion: `Factura ${venta.numero_factura || `#${id}`} anulada — stock devuelto (${filas.length} linea/s)`,
            dato_anterior: { estado: venta.estado },
            dato_nuevo: { estado: 'cancelado' },
            ip: req.ip
        }).catch(() => {})

        res.json({ ok: true })
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        manejarError(res, error)
    } finally {
        client.release()
    }
})

// 8. Registrar venta presencial (soporta multi-producto via items[])
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
            numero_factura,
            // backward compat single-product
            presentacion_id,
            cantidad,
        } = req.body

        // Normalizar a array de items
        const itemsNorm = (Array.isArray(items) && items.length > 0)
            ? items
            : [{ presentacion_id: parseInt(presentacion_id), cantidad: parseInt(cantidad) || 1, precio_unitario: Math.round(parseInt(precio) / (parseInt(cantidad) || 1)), tipo_iva: tipo_iva || '10' }]

        const canalFinal = canal || 'agente_presencial'

        // Fingerprint de contenido: mismo cliente + mismos artículos + misma cantidad + mismo método + misma modalidad
        const itemsOrdenados = [...itemsNorm]
            .sort((a, b) => parseInt(a.presentacion_id) - parseInt(b.presentacion_id))
            .map(it => `${parseInt(it.presentacion_id)}x${parseInt(it.cantidad)}`)
            .join(',')
        const fingerprint = `${cliente_id ?? 'anon'}-${itemsOrdenados}-${metodo_pago || ''}-${canalFinal}`

        const ventaCached = idempotenciaCache.get(fingerprint)
        if (ventaCached && Date.now() - ventaCached.ts < 60000) {
            return res.status(200).json({ ok: true, venta: ventaCached.venta, duplicado: true })
        }

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

        // Verificar duplicado en DB dentro de la transacción.
        // El FOR UPDATE del stock ya serializó los requests sobre el mismo producto,
        // así que esta query ve filas confirmadas + las bloqueadas por esta tx.
        if (itemsNorm.length === 1) {
            const dup = await client.query(
                `SELECT id FROM ventas
                 WHERE (cliente_id IS NOT DISTINCT FROM $1)
                   AND presentacion_id = $2
                   AND cantidad = $3
                   AND metodo_pago = $4
                   AND canal = $5
                   AND created_at > NOW() - INTERVAL '60 seconds'
                   AND estado != 'cancelado'
                 LIMIT 1`,
                [cliente_id || null,
                 parseInt(itemsNorm[0].presentacion_id),
                 parseInt(itemsNorm[0].cantidad),
                 metodo_pago,
                 canalFinal]
            )
            if (dup.rows.length > 0) {
                await client.query('ROLLBACK')
                const ventaExist = await db.query(`SELECT * FROM ventas WHERE id = $1`, [dup.rows[0].id])
                return res.status(200).json({ ok: true, venta: ventaExist.rows[0], duplicado: true })
            }
        }

        const fecha_vencimiento_credito = tipo_venta === 'credito' && plazo_dias
            ? new Date(Date.now() + parseInt(plazo_dias) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
            : null

        const estadoVenta = (tipo_venta === 'credito' || canalFinal === 'agente_delivery' || canalFinal === 'whatsapp_delivery')
            ? 'pendiente_pago'
            : 'pagado'

        // Para backward compat: si es un solo item, guardar presentacion_id en la venta header
        const ventaPresentacionId = itemsNorm.length === 1 ? parseInt(itemsNorm[0].presentacion_id) : null
        const ventaCantidad = itemsNorm.length === 1 ? parseInt(itemsNorm[0].cantidad) : null
        const ventaTipoIva = itemsNorm.length === 1 ? (itemsNorm[0].tipo_iva || '10') : '10'

        const venta = await client.query(
            `INSERT INTO ventas (cliente_id, presentacion_id, cantidad, precio, canal, estado, metodo_pago, subtipo_pago, quiere_factura, ruc_factura, razon_social, agente_id, tipo_venta, plazo_dias, fecha_vencimiento_credito, tipo_iva, costo_delivery, zona_delivery, numero_factura)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *`,
            [cliente_id || null, ventaPresentacionId, ventaCantidad, totalPrecio, canalFinal, estadoVenta,
            metodo_pago, subtipo_pago || null, quiere_factura || false, ruc_factura || null,
            razon_social || null, agente_id || null,
            tipo_venta || 'contado', plazo_dias || null, fecha_vencimiento_credito, ventaTipoIva,
            costo_delivery || 0, zona_delivery || null, numero_factura || null]
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

        idempotenciaCache.set(fingerprint, { venta: venta.rows[0], ts: Date.now() })
        setTimeout(() => idempotenciaCache.delete(fingerprint), 70000)

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