const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { enviarMensaje } = require('../services/whatsapp')
const { guardarMensaje } = require('../services/mensajes')
const { autenticar, verificarPermiso } = require('../middleware/auth')



// GET /ordenes — listar órdenes
router.get('/', autenticar, verificarPermiso('ventas', 'ver'), async (req, res) => {
    try {
        const { estado, canal, limite = 50, fecha_desde, fecha_hasta, buscar } = req.query

        let condiciones = []
        let valores = []
        let i = 1

        if (estado) { condiciones.push(`op.estado = $${i++}`); valores.push(estado) }
        if (canal) {
            const canales = canal.split(',').filter(Boolean)
            if (canales.length === 1) { condiciones.push(`op.canal = $${i++}`); valores.push(canales[0]) }
            else { condiciones.push(`op.canal = ANY($${i++})`); valores.push(canales) }
        }
        if (fecha_desde) { condiciones.push(`op.created_at >= $${i++}`); valores.push(fecha_desde) }
        if (fecha_hasta) { condiciones.push(`op.created_at < ($${i++}::date + INTERVAL '1 day')`); valores.push(fecha_hasta) }
        if (buscar) {
            const like = `%${buscar}%`
            condiciones.push(`(c.nombre ILIKE $${i++} OR op.numero_pedido ILIKE $${i++})`)
            valores.push(like, like)
        }

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


// GET /ordenes/stats/resumen — para el dashboard
router.get('/stats/resumen', autenticar, verificarPermiso('ventas', 'ver'), async (req, res) => {
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


// GET /ordenes/:id — detalle de una orden
router.get('/:id', autenticar, verificarPermiso('ventas', 'ver'), async (req, res) => {
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
router.post('/', autenticar, verificarPermiso('ventas', 'crear'), async (req, res) => {
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


// POST /ordenes/:id/reclamar — reservar la orden para procesarla en Caja
//
// Transicion atomica pendiente -> procesando. Debe llamarse ANTES de crear
// ninguna venta (POST /presencial), para que dos agentes no puedan abrir la
// misma orden 'pendiente' en Caja y crear cada uno su propio set de ventas
// antes de que ninguno llegue a /confirmar. Si la orden ya fue reclamada por
// otro agente, devuelve 409.
router.post('/:id/reclamar', autenticar, verificarPermiso('ventas', 'editar'), async (req, res) => {
    try {
        const resultado = await db.query(
            `UPDATE ordenes_pedido
             SET estado = 'procesando', updated_at = NOW()
             WHERE id = $1 AND estado = 'pendiente'
             RETURNING *`,
            [req.params.id]
        )
        if (!resultado.rows.length) {
            const actual = await db.query(`SELECT estado FROM ordenes_pedido WHERE id = $1`, [req.params.id])
            if (!actual.rows.length) return res.status(404).json({ error: 'Orden no encontrada' })
            return res.status(409).json({ error: 'La orden ya esta siendo procesada por otro agente o ya fue confirmada' })
        }
        res.json({ ok: true, orden: resultado.rows[0] })
    } catch (error) {
        manejarError(res, error)
    }
})


// POST /ordenes/:id/liberar — devolver una orden reclamada a 'pendiente'
//
// Best-effort: se llama cuando falla el procesamiento en Caja despues de
// reclamar la orden (sin llegar a confirmar), para que no quede trabada en
// 'procesando' para siempre.
router.post('/:id/liberar', autenticar, verificarPermiso('ventas', 'editar'), async (req, res) => {
    try {
        const resultado = await db.query(
            `UPDATE ordenes_pedido
             SET estado = 'pendiente', updated_at = NOW()
             WHERE id = $1 AND estado = 'procesando'
             RETURNING *`,
            [req.params.id]
        )
        if (!resultado.rows.length) return res.status(404).json({ error: 'Orden no encontrada o no estaba en procesamiento' })
        res.json({ ok: true, orden: resultado.rows[0] })
    } catch (error) {
        manejarError(res, error)
    }
})


// POST /ordenes/:id/confirmar — marcar la orden como confirmada
//
// Las ventas ya fueron creadas por el caller (Caja.jsx llama a POST /presencial
// por cada linea antes de llegar aca, que a su vez descuenta stock y crea el
// delivery si corresponde). Este endpoint solo enlaza la orden con esas ventas
// y dispara los efectos que le son propios (notificar al cliente, liberar el
// carrito). Antes este endpoint volvia a insertar en ventas/stock/deliveries,
// duplicando todo lo que /presencial ya habia hecho.
//
// Requiere que la orden haya sido reclamada primero (estado = 'procesando'
// via POST /:id/reclamar), y valida que el venta_id recibido efectivamente
// corresponda a esta orden antes de enlazarlo.
router.post('/:id/confirmar', autenticar, verificarPermiso('ventas', 'editar'), async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { id } = req.params
        const { modalidad, venta_id, ventas_ids } = req.body

        const idsVentas = Array.isArray(ventas_ids) && ventas_ids.length > 0
            ? ventas_ids
            : (venta_id ? [venta_id] : [])
        if (idsVentas.length === 0) {
            return res.status(400).json({ error: 'Falta venta_id: la venta debe crearse antes de confirmar la orden' })
        }
        const ventaIdFinal = idsVentas[0]

        const ordenRes = await db.query(
            `SELECT * FROM ordenes_pedido WHERE id = $1 AND estado = 'procesando'`,
            [id]
        )
        if (!ordenRes.rows.length) {
            return res.status(404).json({ error: 'Orden no encontrada o no esta reclamada para procesamiento' })
        }
        const orden = ordenRes.rows[0]
        const modalidadFinal = modalidad || orden.modalidad

        const ventasRes = await db.query(`SELECT id, cliente_id FROM ventas WHERE id = ANY($1)`, [idsVentas])
        if (ventasRes.rows.length !== idsVentas.length) {
            return res.status(400).json({ error: 'Una o mas ventas indicadas no existen' })
        }
        const clienteMismatch = ventasRes.rows.find(v => orden.cliente_id && v.cliente_id && v.cliente_id !== orden.cliente_id)
        if (clienteMismatch) {
            return res.status(400).json({ error: 'Una de las ventas indicadas no corresponde al cliente de esta orden' })
        }
        const yaUsadas = await db.query(
            `SELECT venta_id FROM ordenes_pedido_ventas WHERE venta_id = ANY($1)
             UNION SELECT venta_id FROM ordenes_pedido WHERE venta_id = ANY($1) AND id != $2`,
            [idsVentas, id]
        )
        if (yaUsadas.rows.length) {
            return res.status(409).json({ error: 'Una de las ventas indicadas ya esta enlazada a otra orden' })
        }

        await client.query('BEGIN')

        await client.query(
            `UPDATE ordenes_pedido
             SET estado = 'confirmada',
                 confirmada_at = NOW(),
                 venta_id = $1,
                 modalidad = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [ventaIdFinal, modalidadFinal, id]
        )

        for (const ventaIdItem of idsVentas) {
            await client.query(
                `INSERT INTO ordenes_pedido_ventas (orden_id, venta_id) VALUES ($1, $2)
                 ON CONFLICT (venta_id) DO NOTHING`,
                [id, ventaIdItem]
            )
        }

        await client.query('COMMIT')

        await db.query(
            `DELETE FROM reservas_carrito WHERE cliente_numero = $1`,
            [orden.cliente_numero]
        )

        // Notificar al cliente por WhatsApp si vino del bot
        if (orden.cliente_numero) {
            try {
                const msg = `Tu orden *${orden.numero}* fue confirmada y procesada. Gracias por elegirnos! 🐾`
                await enviarMensaje(orden.cliente_numero, msg)
                await guardarMensaje(orden.cliente_numero, msg, 'bot')
            } catch (e) {}
        }

        res.json({ ok: true, ventas_ids: idsVentas })

    } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        manejarError(res, error)
    } finally {
        client.release()
    }
})


// PATCH /ordenes/:id/cancelar
router.patch('/:id/cancelar', autenticar, verificarPermiso('ventas', 'editar'), async (req, res) => {
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

module.exports = router