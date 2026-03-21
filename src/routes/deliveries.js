const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { enviarMensaje } = require('../services/whatsapp')
const { guardarMensaje } = require('../services/mensajes')

// Ver todos los deliveries
router.get('/', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT d.*,
                    v.precio,
                    v.estado as estado_venta,
                    v.metodo_pago,
                    v.quiere_factura,
                    v.ruc_factura,
                    v.razon_social,
                    pr.nombre as presentacion_nombre,
                    p.nombre as producto_nombre,
                    m.nombre as marca_nombre,
                    c.nombre as cliente_nombre,
                    c.ruc as cliente_ruc,
                    c.telefono as cliente_telefono,
                    c.id as cliente_id
             FROM deliveries d
             JOIN ventas v ON d.venta_id = v.id
             JOIN presentaciones pr ON v.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             ORDER BY d.created_at DESC`
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Ver deliveries por estado
router.get('/estado/:estado', async (req, res) => {
    try {
        const { estado } = req.params
        const resultado = await db.query(
            `SELECT d.*,
                    v.precio,
                    v.estado as estado_venta,
                    v.metodo_pago,
                    pr.nombre as presentacion_nombre,
                    p.nombre as producto_nombre,
                    m.nombre as marca_nombre,
                    c.nombre as cliente_nombre,
                    c.ruc as cliente_ruc
             FROM deliveries d
             JOIN ventas v ON d.venta_id = v.id
             JOIN presentaciones pr ON v.presentacion_id = pr.id
             JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE d.estado = $1
             ORDER BY d.created_at DESC`,
            [estado]
        )
        res.json(resultado.rows)
    } catch (error) {
       manejarError(res, error)
    }
})

// Crear delivery manual (soporta múltiples productos)
router.post('/', async (req, res) => {
    const client = await db.pool.connect()
    try {
        const {
            cliente_id, cliente_nuevo,
            lineas, // [{ presentacion_id, precio, cantidad }]
            // fallback para una sola línea (compatibilidad)
            presentacion_id, precio,
            metodo_pago, estado_pago,
            quiere_factura, ruc_factura, razon_social,
            ubicacion, referencia, horario, contacto_entrega, notas
        } = req.body

        // Normalizar a array de líneas
        const lineasFinal = lineas?.length > 0
            ? lineas
            : [{ presentacion_id, precio, cantidad: 1 }]

        if (!lineasFinal.length || !lineasFinal[0].presentacion_id) {
            return res.status(400).json({ error: 'Al menos un producto es requerido' })
        }

        await client.query('BEGIN')

        // Verificar stock de todas las líneas
        for (const linea of lineasFinal) {
            const stock = await client.query(
                `SELECT stock, nombre FROM presentaciones WHERE id = $1 FOR UPDATE`,
                [linea.presentacion_id]
            )
            if (stock.rows.length === 0 || stock.rows[0].stock < (linea.cantidad || 1)) {
                await client.query('ROLLBACK')
                return res.status(400).json({ error: `Stock insuficiente para ${stock.rows[0]?.nombre || 'producto'}` })
            }
        }

        // Crear cliente nuevo si corresponde
        let clienteIdFinal = cliente_id || null
        if (!clienteIdFinal && cliente_nuevo?.nombre) {
            const nuevoCliente = await client.query(
                `INSERT INTO clientes (nombre, telefono, tipo, ruc, ciudad, direccion, origen)
                 VALUES ($1, $2, $3, $4, $5, $6, 'manual') RETURNING id`,
                [cliente_nuevo.nombre, cliente_nuevo.telefono || null, cliente_nuevo.tipo || 'persona',
                 cliente_nuevo.ruc || null, cliente_nuevo.ciudad || null, cliente_nuevo.direccion || null]
            )
            clienteIdFinal = nuevoCliente.rows[0].id
        }

        const deliveriesCreados = []

        // Crear una venta + delivery por cada línea
        for (const linea of lineasFinal) {
            const cantidad = linea.cantidad || 1

            const venta = await client.query(
                `INSERT INTO ventas (
                    cliente_id, presentacion_id, cantidad, precio,
                    canal, estado, metodo_pago,
                    quiere_factura, ruc_factura, razon_social, cliente_numero
                 ) VALUES ($1, $2, $3, $4, 'manual', $5, $6, $7, $8, $9, $10)
                 RETURNING id`,
                [clienteIdFinal, linea.presentacion_id, cantidad, linea.precio,
                 estado_pago || 'pendiente_pago', metodo_pago || 'efectivo',
                 quiere_factura || false, ruc_factura || null,
                 razon_social || null, cliente_nuevo?.telefono || null]
            )

            await client.query(
                `UPDATE presentaciones SET stock = stock - $1 WHERE id = $2`,
                [cantidad, linea.presentacion_id]
            )

            const delivery = await client.query(
                `INSERT INTO deliveries (
                    venta_id, cliente_numero, ubicacion, referencia,
                    horario, contacto_entrega, metodo_pago, estado, notas
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente', $8)
                 RETURNING *`,
                [venta.rows[0].id, cliente_nuevo?.telefono || null,
                 ubicacion || null, referencia || null,
                 horario || null, contacto_entrega || null,
                 metodo_pago || 'efectivo', notas || null]
            )
            deliveriesCreados.push(delivery.rows[0])
        }

        await client.query('COMMIT')

        if (clienteIdFinal) {
            const { recalcularStats } = require('./clientes')
            recalcularStats(clienteIdFinal).catch(() => {})
        }

        res.status(201).json({ ok: true, deliveries: deliveriesCreados })

    } catch (error) {
        await client.query('ROLLBACK')
        res.status(500).json({ error: error.message })
    } finally {
        client.release()
    }
})

// Actualizar estado del delivery
router.patch('/:id/estado', async (req, res) => {
    try {
        const { id } = req.params
        const { estado, nota } = req.body

        const estadosValidos = ['pendiente', 'confirmado', 'en_camino', 'entregado', 'cancelado']
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ error: 'Estado invalido' })
        }

        const timestampCol = {
            confirmado: 'confirmado_at',
            en_camino: 'en_camino_at',
            entregado: 'entregado_at',
            cancelado: 'cancelado_at'
        }[estado]

        const tsClause = timestampCol ? `, ${timestampCol} = NOW()` : ''

        let notaClause = ''
        let valores = [estado, id]

        if (nota) {
            notaClause = `, historial_notas = historial_notas || $3::jsonb`
            const entrada = JSON.stringify([{ texto: nota, timestamp: new Date().toISOString(), tipo: 'estado' }])
            valores = [estado, id, entrada]
        }

        const resultado = await db.query(
            `UPDATE deliveries
             SET estado = $1${tsClause}${notaClause}, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            valores
        )

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery no encontrado' })
        }

        const delivery = resultado.rows[0]

        // Enviar mensaje al cliente según el estado
        if (delivery.cliente_numero) {
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
                    // Silencioso — no rompe el flujo si falla el envio
                    console.error('Error enviando mensaje de estado:', err.message)
                }
            }
        }

        res.json({ ok: true, delivery })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Agregar nota o demora sin cambiar estado
router.post('/:id/nota', async (req, res) => {
    try {
        const { id } = req.params
        const { texto, tipo = 'nota' } = req.body
        // tipo: 'nota' | 'demora_trafico' | 'demora_tecnica' | 'no_encontrado'

        if (!texto) return res.status(400).json({ error: 'texto es requerido' })

        const entrada = JSON.stringify([{
            texto,
            tipo,
            timestamp: new Date().toISOString()
        }])

        const resultado = await db.query(
            `UPDATE deliveries
             SET historial_notas = historial_notas || $1::jsonb,
                 notas = $2,
                 updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [entrada, texto, id]
        )

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery no encontrado' })
        }

        res.json({ ok: true, delivery: resultado.rows[0] })
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router