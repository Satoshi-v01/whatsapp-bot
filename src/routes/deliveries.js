const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { enviarMensaje } = require('../services/whatsapp')
const { guardarMensaje } = require('../services/mensajes')
const { descontarStockFEFO } = require('../services/stock')
const { registrarLog } = require('../middleware/auditoria')
const { autenticar, verificarPermiso } = require('../middleware/auth')


// Ver todos los deliveries
router.get('/', autenticar, verificarPermiso('delivery', 'ver'), async (req, res) => {
    try {
        const { fecha } = req.query
        const fechaFiltro = fecha || new Date().toISOString().slice(0, 10)
        const resultado = await db.query(
            `SELECT d.*, v.precio, v.estado as estado_venta, v.metodo_pago, v.quiere_factura, v.ruc_factura, v.razon_social,
                    pr.nombre as presentacion_nombre, p.nombre as producto_nombre, m.nombre as marca_nombre,
                    c.nombre as cliente_nombre, c.ruc as cliente_ruc, c.telefono as cliente_telefono, c.id as cliente_id,
                    u.nombre as repartidor_nombre
             FROM deliveries d
             JOIN ventas v ON d.venta_id = v.id
             JOIN presentaciones pr ON v.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             LEFT JOIN usuarios u ON d.repartidor_id = u.id
             WHERE DATE(d.created_at AT TIME ZONE 'America/Asuncion') = $1
             ORDER BY d.created_at DESC`,
            [fechaFiltro]
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Asignar repartidor
router.patch('/:id/asignar', async (req, res) => {
    try {
        const { repartidor_id } = req.body
        const anterior = await db.query(`SELECT repartidor_id FROM deliveries WHERE id = $1`, [req.params.id])
        const resultado = await db.query(
            `UPDATE deliveries SET repartidor_id = $1, asignado_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *`,
            [repartidor_id || null, req.params.id]
        )
        if (!resultado.rows.length) return res.status(404).json({ error: 'Delivery no encontrado' })

        const repartidor = repartidor_id ? await db.query(`SELECT nombre FROM usuarios WHERE id = $1`, [repartidor_id]) : null
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'delivery', entidad: 'delivery', entidad_id: parseInt(req.params.id), descripcion: `Repartidor asignado: ${repartidor?.rows[0]?.nombre || 'Sin asignar'}`, dato_anterior: { repartidor_id: anterior.rows[0]?.repartidor_id }, dato_nuevo: { repartidor_id }, ip: req.ip }).catch(() => {})

        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Deliveries del repartidor
router.get('/mis-deliveries', async (req, res) => {
    try {
        const { repartidor_id } = req.query
        if (!repartidor_id) return res.status(400).json({ error: 'repartidor_id requerido' })
        const resultado = await db.query(
            `SELECT d.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
                v.precio as monto, v.metodo_pago, pr.nombre as presentacion_nombre,
                p.nombre as producto_nombre, u.nombre as repartidor_nombre,
                d.repartidor_id, d.asignado_at
             FROM deliveries d
             LEFT JOIN ventas v ON d.venta_id = v.id
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             LEFT JOIN usuarios u ON d.repartidor_id = u.id
             WHERE d.repartidor_id = $1
             AND d.estado NOT IN ('entregado', 'cancelado')
             AND DATE(d.created_at) = CURRENT_DATE
             ORDER BY CASE d.estado WHEN 'pendiente' THEN 1 WHEN 'confirmado' THEN 2 WHEN 'en_camino' THEN 3 ELSE 4 END ASC`,
            [repartidor_id]
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Cambiar estado repartidor
router.patch('/:id/estado-repartidor', async (req, res) => {
    try {
        const { estado } = req.body
        if (!['en_camino', 'entregado'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' })

        const anterior = await db.query(`SELECT estado FROM deliveries WHERE id = $1`, [req.params.id])
        const resultado = await db.query(
            `UPDATE deliveries SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [estado, req.params.id]
        )
        if (!resultado.rows.length) return res.status(404).json({ error: 'Delivery no encontrado' })

        if (estado === 'entregado') {
            await db.query(`UPDATE ventas SET estado = 'entregado' WHERE id = $1`, [resultado.rows[0].venta_id])
        }

        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'delivery', entidad: 'delivery', entidad_id: parseInt(req.params.id), descripcion: `Estado actualizado por repartidor: ${anterior.rows[0]?.estado} → ${estado}`, dato_anterior: { estado: anterior.rows[0]?.estado }, dato_nuevo: { estado }, ip: req.ip }).catch(() => {})

        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Ver deliveries por estado
router.get('/estado/:estado', async (req, res) => {
    try {
        const { estado } = req.params
        const resultado = await db.query(
            `SELECT d.*, v.precio, v.estado as estado_venta, v.metodo_pago,
                    pr.nombre as presentacion_nombre, p.nombre as producto_nombre,
                    m.nombre as marca_nombre, c.nombre as cliente_nombre, c.ruc as cliente_ruc
             FROM deliveries d
             JOIN ventas v ON d.venta_id = v.id
             JOIN presentaciones pr ON v.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE d.estado = $1 ORDER BY d.created_at DESC`,
            [estado]
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Crear delivery manual
router.post('/', autenticar, verificarPermiso('delivery', 'crear'), async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { cliente_id, cliente_nuevo, lineas, presentacion_id, precio, metodo_pago, estado_pago, quiere_factura, ruc_factura, razon_social, ubicacion, referencia, horario, contacto_entrega, notas } = req.body

        const lineasFinal = lineas?.length > 0 ? lineas : [{ presentacion_id, precio, cantidad: 1 }]
        if (!lineasFinal.length || !lineasFinal[0].presentacion_id) return res.status(400).json({ error: 'Al menos un producto es requerido' })

        await client.query('BEGIN')

        for (const linea of lineasFinal) {
            const stock = await client.query(`SELECT stock, nombre FROM presentaciones WHERE id = $1 FOR UPDATE`, [linea.presentacion_id])
            if (stock.rows.length === 0 || stock.rows[0].stock < (linea.cantidad || 1)) {
                await client.query('ROLLBACK')
                return res.status(400).json({ error: `Stock insuficiente para ${stock.rows[0]?.nombre || 'producto'}` })
            }
        }

        let clienteIdFinal = cliente_id || null
        if (!clienteIdFinal && cliente_nuevo?.nombre) {
            const nuevoCliente = await client.query(
                `INSERT INTO clientes (nombre, telefono, tipo, ruc, ciudad, direccion, origen) VALUES ($1, $2, $3, $4, $5, $6, 'manual') RETURNING id`,
                [cliente_nuevo.nombre, cliente_nuevo.telefono || null, cliente_nuevo.tipo || 'persona', cliente_nuevo.ruc || null, cliente_nuevo.ciudad || null, cliente_nuevo.direccion || null]
            )
            clienteIdFinal = nuevoCliente.rows[0].id
        }

        const deliveriesCreados = []

        for (const linea of lineasFinal) {
            const cantidad = linea.cantidad || 1
            const venta = await client.query(
                `INSERT INTO ventas (cliente_id, presentacion_id, cantidad, precio, canal, estado, metodo_pago, quiere_factura, ruc_factura, razon_social, cliente_numero)
                 VALUES ($1, $2, $3, $4, 'manual', $5, $6, $7, $8, $9, $10) RETURNING id`,
                [clienteIdFinal, linea.presentacion_id, cantidad, linea.precio, estado_pago || 'pendiente_pago', metodo_pago || 'efectivo', quiere_factura || false, ruc_factura || null, razon_social || null, cliente_nuevo?.telefono || null]
            )

            const lotesExisten = await client.query(`SELECT COUNT(*) as total FROM lotes WHERE presentacion_id = $1 AND activo = true AND stock_actual > 0`, [linea.presentacion_id])
            if (parseInt(lotesExisten.rows[0].total) > 0) {
                await descontarStockFEFO(client, linea.presentacion_id, cantidad)
            } else {
                await client.query(`UPDATE presentaciones SET stock = stock - $1 WHERE id = $2`, [cantidad, linea.presentacion_id])
            }

            const delivery = await client.query(
                `INSERT INTO deliveries (venta_id, cliente_numero, ubicacion, referencia, horario, contacto_entrega, metodo_pago, estado, notas)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente', $8) RETURNING *`,
                [venta.rows[0].id, cliente_nuevo?.telefono || null, ubicacion || null, referencia || null, horario || null, contacto_entrega || null, metodo_pago || 'efectivo', notas || null]
            )
            deliveriesCreados.push(delivery.rows[0])
        }

        await client.query('COMMIT')

        if (clienteIdFinal) {
            const { recalcularStats } = require('./clientes')
            recalcularStats(clienteIdFinal).catch(() => {})
        }

        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'delivery', entidad: 'delivery', entidad_id: deliveriesCreados[0]?.id, descripcion: `Delivery manual creado — ${lineasFinal.length} producto(s) — ${ubicacion || 'sin dirección'}`, dato_nuevo: { deliveries: deliveriesCreados.map(d => d.id), ubicacion, metodo_pago }, ip: req.ip }).catch(() => {})

        res.status(201).json({ ok: true, deliveries: deliveriesCreados })
    } catch (error) {
        await client.query('ROLLBACK')
        res.status(500).json({ error: error.message })
    } finally {
        client.release()
    }
})

// Actualizar estado del delivery
router.patch('/:id/estado', autenticar, verificarPermiso('delivery', 'cambiar_estado'), async (req, res) => {
    try {
        const { id } = req.params
        const { estado, nota } = req.body

        const estadosValidos = ['pendiente', 'confirmado', 'en_camino', 'entregado', 'cancelado']
        if (!estadosValidos.includes(estado)) return res.status(400).json({ error: 'Estado invalido' })

        const anterior = await db.query(`SELECT estado FROM deliveries WHERE id = $1`, [id])

        const timestampCol = { confirmado: 'confirmado_at', en_camino: 'en_camino_at', entregado: 'entregado_at', cancelado: 'cancelado_at' }[estado]
        const tsClause = timestampCol ? `, ${timestampCol} = NOW()` : ''

        let notaClause = ''
        let valores = [estado, id]

        if (nota) {
            notaClause = `, historial_notas = historial_notas || $3::jsonb`
            const entrada = JSON.stringify([{ texto: nota, timestamp: new Date().toISOString(), tipo: 'estado' }])
            valores = [estado, id, entrada]
        }

        const resultado = await db.query(
            `UPDATE deliveries SET estado = $1${tsClause}${notaClause}, updated_at = NOW() WHERE id = $2 RETURNING *`,
            valores
        )
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Delivery no encontrado' })

        const delivery = resultado.rows[0]

        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'delivery', entidad: 'delivery', entidad_id: parseInt(id), descripcion: `Estado delivery: ${anterior.rows[0]?.estado} → ${estado}`, dato_anterior: { estado: anterior.rows[0]?.estado }, dato_nuevo: { estado }, ip: req.ip }).catch(() => {})

        if (delivery.cliente_numero) {
            // Obtener canal de la venta para saber si se originó desde WhatsApp
            const ventaRes = await db.query(`SELECT canal FROM ventas WHERE id = $1`, [delivery.venta_id])
            const canalVenta = ventaRes.rows[0]?.canal || ''
            const esWhatsapp = ['whatsapp_delivery', 'whatsapp_bot', 'whatsapp'].includes(canalVenta)

            if (esWhatsapp) {
                const mensajes = {
                    confirmado: `Tu pedido ha sido confirmado por el agente. Pronto estara en camino! 🐾`,
                    en_camino: `Tu pedido ya esta en camino. Pronto llegara a tu domicilio! 🐾`,
                    entregado: `Tu pedido ha sido entregado exitosamente. Muchas gracias por elegir Sosa Bulls! 😊🐾`,
                    cancelado: `Tu pedido ha sido cancelado. Si tenes alguna consulta escribinos y te ayudamos 🐾`
                }
                if (mensajes[estado]) {
                    try {
                        await enviarMensaje(delivery.cliente_numero, mensajes[estado])
                        await guardarMensaje(delivery.cliente_numero, mensajes[estado], 'bot')
                    } catch (err) {
                        console.error('Error enviando mensaje de estado:', err.message)
                    }
                }
            }
        }

        res.json({ ok: true, delivery })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Agregar nota o demora
router.post('/:id/nota', async (req, res) => {
    try {
        const { id } = req.params
        const { texto, tipo = 'nota' } = req.body
        if (!texto) return res.status(400).json({ error: 'texto es requerido' })

        const entrada = JSON.stringify([{ texto, tipo, timestamp: new Date().toISOString() }])
        const resultado = await db.query(
            `UPDATE deliveries SET historial_notas = historial_notas || $1::jsonb, notas = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
            [entrada, texto, id]
        )
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Delivery no encontrado' })

        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'nota', modulo: 'delivery', entidad: 'delivery', entidad_id: parseInt(id), descripcion: `Nota agregada (${tipo}): ${texto}`, dato_nuevo: { texto, tipo }, ip: req.ip }).catch(() => {})

        res.json({ ok: true, delivery: resultado.rows[0] })
    } catch (error) {
        manejarError(res, error)
    }
})

// Crear delivery simple desde caja
router.post('/simple', async (req, res) => {
    try {
        const { venta_id, cliente_numero, ubicacion, referencia, horario, contacto_entrega, metodo_pago } = req.body
        if (!venta_id) return res.status(400).json({ error: 'venta_id es requerido' })

        const resultado = await db.query(
            `INSERT INTO deliveries (venta_id, cliente_numero, ubicacion, referencia, horario, contacto_entrega, metodo_pago, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente') RETURNING *`,
            [venta_id, cliente_numero || null, ubicacion || null, referencia || null, horario || null, contacto_entrega || null, metodo_pago || 'efectivo']
        )

        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'delivery', entidad: 'delivery', entidad_id: resultado.rows[0].id, descripcion: `Delivery creado desde caja — venta #${venta_id}`, dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})

        res.status(201).json({ ok: true, delivery: resultado.rows[0] })
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router