const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { enviarMensaje } = require('../services/whatsapp')
const { guardarMensaje } = require('../services/mensajes')
const { recalcularStats } = require('./clientes')


// GET /ordenes — listar órdenes
router.get('/', async (req, res) => {
    try {
        const { estado, canal, limite = 50 } = req.query

        let condiciones = []
        let valores = []
        let i = 1

        if (estado) { condiciones.push(`op.estado = $${i++}`); valores.push(estado) }
        if (canal) { condiciones.push(`op.canal = $${i++}`); valores.push(canal) }

        const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''

        const resultado = await db.query(
            `SELECT
                op.*,
                c.nombre as cliente_nombre,
                c.telefono as cliente_telefono,
                json_agg(
                    json_build_object(
                        'id', opi.id,
                        'presentacion_id', opi.presentacion_id,
                        'cantidad', opi.cantidad,
                        'precio_unitario', opi.precio_unitario,
                        'precio_total', opi.precio_total,
                        'producto_nombre', p.nombre,
                        'presentacion_nombre', pr.nombre,
                        'marca_nombre', m.nombre
                    )
                ) as items
             FROM ordenes_pedido op
             LEFT JOIN clientes c ON op.cliente_id = c.id
             LEFT JOIN ordenes_pedido_items opi ON op.id = opi.orden_id
             LEFT JOIN presentaciones pr ON opi.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             ${where}
             GROUP BY op.id, c.nombre, c.telefono
             ORDER BY op.created_at DESC
             LIMIT $${i}`,
            [...valores, parseInt(limite)]
        )

        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})


// GET /ordenes/:id — detalle de una orden
router.get('/:id', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT
                op.*,
                c.nombre as cliente_nombre,
                c.telefono as cliente_telefono,
                c.email as cliente_email,
                json_agg(
                    json_build_object(
                        'id', opi.id,
                        'presentacion_id', opi.presentacion_id,
                        'cantidad', opi.cantidad,
                        'precio_unitario', opi.precio_unitario,
                        'precio_total', opi.precio_total,
                        'producto_nombre', p.nombre,
                        'presentacion_nombre', pr.nombre,
                        'marca_nombre', m.nombre
                    )
                ) as items
             FROM ordenes_pedido op
             LEFT JOIN clientes c ON op.cliente_id = c.id
             LEFT JOIN ordenes_pedido_items opi ON op.id = opi.orden_id
             LEFT JOIN presentaciones pr ON opi.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE op.id = $1
             GROUP BY op.id, c.nombre, c.telefono, c.email`,
            [req.params.id]
        )

        if (!resultado.rows.length) return res.status(404).json({ error: 'Orden no encontrada' })
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})


// POST /ordenes — crear orden (desde dashboard/caja)
router.post('/', async (req, res) => {
    const client = await db.pool.connect()
    try {
        const {
            canal, cliente_id, cliente_nuevo,
            items, // [{ presentacion_id, cantidad, precio_unitario }]
            modalidad, ubicacion, referencia, horario,
            contacto_entrega, metodo_pago, zona_delivery,
            costo_delivery, zona_id,
            quiere_factura, ruc_factura, razon_social,
            notas
        } = req.body

        if (!items?.length) return res.status(400).json({ error: 'Se requiere al menos un producto' })

        // Obtener tiempo de reserva de configuración
        const configRes = await db.query(
            `SELECT valor FROM configuracion WHERE clave = 'op_tiempo_reserva_horas'`
        )
        const horas = parseInt(configRes.rows[0]?.valor || '2')
        const expira_at = new Date(Date.now() + horas * 60 * 60 * 1000)

        await client.query('BEGIN')

        // Crear cliente si es nuevo
        let clienteIdFinal = cliente_id || null
        if (!clienteIdFinal && cliente_nuevo?.nombre) {
            const nuevo = await client.query(
                `INSERT INTO clientes (nombre, telefono, tipo, ruc, ciudad, direccion, origen)
                 VALUES ($1, $2, $3, $4, $5, $6, 'manual') RETURNING id`,
                [cliente_nuevo.nombre, cliente_nuevo.telefono || null,
                 cliente_nuevo.tipo || 'persona', cliente_nuevo.ruc || null,
                 cliente_nuevo.ciudad || null, cliente_nuevo.direccion || null]
            )
            clienteIdFinal = nuevo.rows[0].id
        }

        // Calcular total
        const total = items.reduce((sum, i) => sum + (i.precio_unitario * i.cantidad), 0) + (costo_delivery || 0)

        // Crear orden
        const orden = await client.query(
            `INSERT INTO ordenes_pedido (
                canal, cliente_id, modalidad, ubicacion, referencia,
                horario, contacto_entrega, metodo_pago, zona_delivery,
                costo_delivery, zona_id, quiere_factura, ruc_factura,
                razon_social, notas, expira_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
             RETURNING *`,
            [canal, clienteIdFinal, modalidad || null, ubicacion || null,
             referencia || null, horario || null, contacto_entrega || null,
             metodo_pago || null, zona_delivery || null, costo_delivery || 0,
             zona_id || null, quiere_factura || false, ruc_factura || null,
             razon_social || null, notas || null, expira_at]
        )

        const ordenId = orden.rows[0].id

        // Insertar items
        for (const item of items) {
            await client.query(
                `INSERT INTO ordenes_pedido_items (orden_id, presentacion_id, cantidad, precio_unitario, precio_total)
                 VALUES ($1, $2, $3, $4, $5)`,
                [ordenId, item.presentacion_id, item.cantidad,
                 item.precio_unitario, item.precio_unitario * item.cantidad]
            )
        }

        await client.query('COMMIT')
        res.status(201).json({ ok: true, orden: orden.rows[0] })

    } catch (error) {
        await client.query('ROLLBACK')
        manejarError(res, error)
    } finally {
        client.release()
    }
})


// POST /ordenes/:id/confirmar — confirmar y convertir a venta
router.post('/:id/confirmar', async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { id } = req.params
        const { modalidad, metodo_pago, ubicacion, referencia, horario, contacto_entrega } = req.body

        // Obtener orden con items
        const ordenRes = await db.query(
            `SELECT op.*, json_agg(
                json_build_object(
                    'presentacion_id', opi.presentacion_id,
                    'cantidad', opi.cantidad,
                    'precio_unitario', opi.precio_unitario,
                    'precio_total', opi.precio_total
                )
             ) as items
             FROM ordenes_pedido op
             JOIN ordenes_pedido_items opi ON op.id = opi.orden_id
             WHERE op.id = $1 AND op.estado = 'pendiente'
             GROUP BY op.id`,
            [id]
        )

        if (!ordenRes.rows.length) {
            return res.status(404).json({ error: 'Orden no encontrada o ya procesada' })
        }

        const orden = ordenRes.rows[0]
        const items = orden.items
        const modalidadFinal = modalidad || orden.modalidad
        const metodoPagoFinal = metodo_pago || orden.metodo_pago || 'efectivo'

        await client.query('BEGIN')

        const ventasIds = []

        // Crear ventas por cada item
        for (let i = 0; i < items.length; i++) {
            const item = items[i]

            const venta = await client.query(
                `INSERT INTO ventas (
                    cliente_id, cliente_numero, presentacion_id, cantidad, precio,
                    canal, estado, metodo_pago,
                    quiere_factura, ruc_factura, razon_social,
                    costo_delivery, zona_delivery
                 ) VALUES ($1,$2,$3,$4,$5,$6,'pagado',$7,$8,$9,$10,$11,$12)
                 RETURNING id`,
                [
                    orden.cliente_id, orden.cliente_numero,
                    item.presentacion_id, item.cantidad,
                    item.precio_total,
                    modalidadFinal === 'delivery' ? 'agente_delivery' : 'agente_presencial',
                    metodoPagoFinal,
                    orden.quiere_factura, orden.ruc_factura, orden.razon_social,
                    i === 0 ? (orden.costo_delivery || 0) : 0,
                    i === 0 ? (orden.zona_delivery || null) : null
                ]
            )

            // Descontar stock
            await client.query(
                `UPDATE presentaciones SET stock = stock - $1 WHERE id = $2`,
                [item.cantidad, item.presentacion_id]
            )

            ventasIds.push(venta.rows[0].id)
        }

        // Crear delivery si corresponde
        if (modalidadFinal === 'delivery') {
            await client.query(
                `INSERT INTO deliveries (
                    venta_id, cliente_numero, ubicacion, referencia,
                    horario, contacto_entrega, metodo_pago, estado
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pendiente')`,
                [
                    ventasIds[0],
                    orden.cliente_numero,
                    ubicacion || orden.ubicacion,
                    referencia || orden.referencia,
                    horario || orden.horario,
                    contacto_entrega || orden.contacto_entrega,
                    metodoPagoFinal
                ]
            )
        }

        // Marcar orden como confirmada
        await client.query(
            `UPDATE ordenes_pedido
             SET estado = 'confirmada',
                 confirmada_at = NOW(),
                 venta_id = $1,
                 modalidad = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [ventasIds[0], modalidadFinal, id]
        )

        await client.query('COMMIT')

        // Notificar al cliente por WhatsApp si vino del bot
        if (orden.cliente_numero) {
            try {
                const msg = `Tu orden *${orden.numero}* fue confirmada y procesada. Gracias por elegirnos! 🐾`
                await enviarMensaje(orden.cliente_numero, msg)
                await guardarMensaje(orden.cliente_numero, msg, 'bot')
            } catch (e) {}
        }

        // Recalcular stats
        if (orden.cliente_id) recalcularStats(orden.cliente_id).catch(() => {})

        res.json({ ok: true, ventas_ids: ventasIds })

    } catch (error) {
        await client.query('ROLLBACK')
        manejarError(res, error)
    } finally {
        client.release()
    }
})


// PATCH /ordenes/:id/cancelar
router.patch('/:id/cancelar', async (req, res) => {
    try {
        const { motivo } = req.body
        const resultado = await db.query(
            `UPDATE ordenes_pedido
             SET estado = 'cancelada',
                 cancelada_at = NOW(),
                 notas = COALESCE(notas || ' | ', '') || $1,
                 updated_at = NOW()
             WHERE id = $2 AND estado = 'pendiente'
             RETURNING *`,
            [motivo || 'Cancelada por agente', req.params.id]
        )
        if (!resultado.rows.length) return res.status(404).json({ error: 'Orden no encontrada o ya procesada' })

        // Notificar al cliente
        const orden = resultado.rows[0]
        if (orden.cliente_numero) {
            try {
                const msg = `Tu orden *${orden.numero}* fue cancelada. Si fue un error, escribinos y te ayudamos 🐾`
                await enviarMensaje(orden.cliente_numero, msg)
                await guardarMensaje(orden.cliente_numero, msg, 'bot')
            } catch (e) {}
        }

        res.json({ ok: true, orden: resultado.rows[0] })
    } catch (error) {
        manejarError(res, error)
    }
})


// GET /ordenes/stats/resumen — para el dashboard
router.get('/stats/resumen', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT
                COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
                COUNT(*) FILTER (WHERE estado = 'confirmada') as confirmadas,
                COUNT(*) FILTER (WHERE estado = 'expirada') as expiradas,
                COUNT(*) FILTER (WHERE estado = 'cancelada') as canceladas,
                COUNT(*) FILTER (WHERE estado = 'pendiente' AND expira_at < NOW() + INTERVAL '30 minutes') as por_expirar
             FROM ordenes_pedido
             WHERE created_at >= NOW() - INTERVAL '24 hours'`
        )
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router