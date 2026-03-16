const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { enviarMensaje } = require('../services/whatsapp')

// 1. Ver todas las conversaciones activas
router.get('/', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT s.*, u.nombre as agente_nombre
             FROM sesiones s
             LEFT JOIN usuarios u ON s.agente_id = u.id
             ORDER BY s.ultimo_mensaje DESC`
        )
        res.json(resultado.rows)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 2. Ver una conversación específica
router.get('/:numero', async (req, res) => {
    try {
        const { numero } = req.params
        const resultado = await db.query(
            `SELECT * FROM sesiones WHERE cliente_numero = $1`,
            [numero]
        )
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Conversación no encontrada' })
        }
        res.json(resultado.rows[0])
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 3. Tomar el control de una conversación
router.patch('/:numero/tomar', async (req, res) => {
    try {
        const { numero } = req.params
        const { agente_id } = req.body

        await db.query(
            `UPDATE sesiones 
             SET modo = 'humano', agente_id = $1, ultimo_mensaje = NOW()
             WHERE cliente_numero = $2`,
            [agente_id, numero]
        )

        await enviarMensaje(numero,
            `Hola, te comunico con un asesor que te ayudará en breve.`
        )

        res.json({ ok: true, mensaje: 'Control tomado por el agente' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 4. El agente responde al cliente
router.post('/:numero/responder', async (req, res) => {
    try {
        const { numero } = req.params
        const { texto } = req.body

        if (!texto) {
            return res.status(400).json({ error: 'El texto es requerido' })
        }

        await enviarMensaje(numero, texto)

        await db.query(
            `UPDATE sesiones SET ultimo_mensaje = NOW() WHERE cliente_numero = $1`,
            [numero]
        )

        res.json({ ok: true, mensaje: 'Mensaje enviado' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 5. Devolver el control al bot
router.patch('/:numero/devolver', async (req, res) => {
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
        res.status(500).json({ error: error.message })
    }
})

module.exports = router