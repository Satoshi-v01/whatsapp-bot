const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { enviarMensaje } = require('../services/whatsapp')
const { guardarMensaje } = require('../services/mensajes')
const { manejarError } = require('../middleware/validar')
const { autenticar, verificarPermiso } = require('../middleware/auth')
const logger = require('../middleware/logger')

// 1. Ver todas las conversaciones activas
router.get('/', autenticar, verificarPermiso('chat', 'ver'), async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT s.id, s.cliente_numero, s.paso, s.modo, s.datos, s.agente_id,
                    s.carrito, s.carrito_expires_at, s.nombre_whatsapp,
                    COALESCE(m.ultimo_mensaje, s.ultimo_mensaje) AT TIME ZONE 'UTC' AS ultimo_mensaje,
                    u.nombre as agente_nombre
             FROM sesiones s
             LEFT JOIN usuarios u ON s.agente_id = u.id
             LEFT JOIN LATERAL (
                 SELECT MAX(created_at) AS ultimo_mensaje
                 FROM mensajes
                 WHERE mensajes.cliente_numero = s.cliente_numero
             ) m ON true
             ORDER BY COALESCE(m.ultimo_mensaje, s.ultimo_mensaje) DESC`
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// 2. Ver una conversación específica
router.get('/:numero', autenticar, verificarPermiso('chat', 'ver'), async (req, res) => {
    try {
        const { numero } = req.params
        const resultado = await db.query(
            `SELECT id, cliente_numero, paso, modo, datos, agente_id, carrito, carrito_expires_at, nombre_whatsapp,
                    ultimo_mensaje AT TIME ZONE 'UTC' AS ultimo_mensaje
             FROM sesiones WHERE cliente_numero = $1`,
            [numero]
        )
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Conversación no encontrada' })
        }
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

router.get('/:numero/mensajes', autenticar, verificarPermiso('chat', 'ver'), async (req, res) => {
    try {
        const { numero } = req.params
        const { obtenerMensajes } = require('../services/mensajes')
        const mensajes = await obtenerMensajes(numero)
        res.json(mensajes)
    } catch (error) {
        manejarError(res, error)
    }
})

// 3. Tomar el control de una conversación
router.patch('/:numero/tomar', autenticar, verificarPermiso('chat', 'gestionar'), async (req, res) => {
    try {
        const { numero } = req.params
        const { agente_id } = req.body

        await db.query(
            `UPDATE sesiones 
             SET modo = 'humano', agente_id = $1, ultimo_mensaje = NOW()
             WHERE cliente_numero = $2`,
            [agente_id, numero]
        )

        try {
            await enviarMensaje(numero,
                `Hola, te comunico con un asesor que te ayudará en breve.`
            )
        } catch (msgError) {
            logger.error('Error enviando mensaje de handoff:', { message: msgError.message })
        }

        res.json({ ok: true, mensaje: 'Control tomado por el agente' })
    } catch (error) {
        manejarError(res, error)
    }
})

router.patch('/:numero/cerrar', autenticar, verificarPermiso('chat', 'gestionar'), async (req, res) => {
    try {
        const { numero } = req.params

        await db.query(
            `UPDATE sesiones 
             SET modo = 'bot', agente_id = NULL, paso = 'inicio',
             datos = '{}', ultimo_mensaje = NOW()
             WHERE cliente_numero = $1`,
            [numero]
        )

        res.json({ ok: true, mensaje: 'Conversación cerrada' })
    } catch (error) {
        manejarError(res, error)
    }
})

// 4. El agente responde al cliente
router.post('/:numero/responder', autenticar, verificarPermiso('chat', 'gestionar'), async (req, res) => {
    try {
        const { numero } = req.params
        const { texto } = req.body

        if (!texto) {
            return res.status(400).json({ error: 'El texto es requerido' })
        }

        await enviarMensaje(numero, texto)
        await guardarMensaje(numero, texto, 'agente')

        await db.query(
            `UPDATE sesiones SET ultimo_mensaje = NOW() WHERE cliente_numero = $1`,
            [numero]
        )

        res.json({ ok: true, mensaje: 'Mensaje enviado' })
    } catch (error) {
        manejarError(res, error)
    }
})

// 5. Devolver el control al bot
router.patch('/:numero/devolver', autenticar, verificarPermiso('chat', 'gestionar'), async (req, res) => {
    try {
        const { numero } = req.params

        await db.query(
            `UPDATE sesiones 
             SET modo = 'bot', agente_id = NULL, paso = 'inicio', 
             datos = '{}', ultimo_mensaje = NOW()
             WHERE cliente_numero = $1`,
            [numero]
        )

        await enviarMensaje(numero,
            `Gracias por tu paciencia. Quedás nuevamente con nuestro asistente. ¿En qué más te puedo ayudar?`
        )

        res.json({ ok: true, mensaje: 'Control devuelto al bot' })
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router