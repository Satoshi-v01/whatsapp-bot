const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { procesarMensaje } = require('../bot/flow')
const { obtenerSesion } = require('../bot/estados')
const { enviarMensaje, descargarYGuardarImagen, descargarYGuardarMedia, descargarYCacharMedia } = require('../services/whatsapp')
const { guardarMensaje } = require('../services/mensajes')
const logger = require('../middleware/logger')

router.get('/', (req, res) => {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    const secret = process.env.WEBHOOK_VERIFY_TOKEN || ''
    const tokenSeguro = secret.length === token?.length &&
        crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret))
    if (mode === 'subscribe' && tokenSeguro) {
        logger.info('Webhook verificado por Meta')
        res.status(200).send(challenge)
    } else {
        logger.warn('Token incorrecto — verificación rechazada')
        res.status(403).send('Forbidden')
    }
})

router.post('/', async (req, res) => {
    try {
        const entry = req.body.entry?.[0]
        const change = entry?.changes?.[0]
        const mensaje = change?.value?.messages?.[0]

        if (!mensaje) {
            return res.status(200).send('OK')
        }

        const numero = mensaje.from
        const tipo = mensaje.type

        logger.info(`[webhook] mensaje de ${numero} tipo=${tipo}${tipo === 'text' ? ` texto="${mensaje.text?.body}"` : ''}`)

        // Garantiza que la sesión exista antes de guardar el mensaje
        await obtenerSesion(numero)

        if (tipo === 'location') {
            const { latitude, longitude } = mensaje.location
            const ubicacion = `https://maps.google.com/?q=${latitude},${longitude}`
            await guardarMensaje(numero, ubicacion, 'cliente')
            await procesarMensaje(numero, ubicacion, 'location')
            return res.status(200).send('OK')
        }

        if (tipo === 'image') {
            const imageId = mensaje.image?.id || ''
            let textoMensaje = `[imagen: ${imageId}]`
            try {
                // Intentar Supabase Storage primero (persistente)
                const publicUrl = await descargarYGuardarImagen(imageId)
                textoMensaje = `[imagen: ${publicUrl}]`
            } catch (errSupabase) {
                try {
                    // Fallback: disco local
                    const localPath = await descargarYCacharMedia(imageId)
                    textoMensaje = `[imagen: ${localPath}]`
                } catch (errLocal) {
                    logger.warn(`No se pudo guardar imagen ${imageId}: ${errLocal.message}`)
                }
            }
            await guardarMensaje(numero, textoMensaje, 'cliente')
            await procesarMensaje(numero, imageId, 'image')
            return res.status(200).send('OK')
        }

        if (tipo === 'audio') {
            const audioId = mensaje.audio?.id || ''
            let textoMensaje = audioId ? `[audio: ${audioId}]` : '[audio]'
            if (audioId) {
                try {
                    const publicUrl = await descargarYGuardarMedia(audioId, 'audios')
                    textoMensaje = `[audio: ${publicUrl}]`
                } catch (errSupabase) {
                    try {
                        const localPath = await descargarYCacharMedia(audioId)
                        textoMensaje = `[audio: ${localPath}]`
                    } catch (errLocal) {
                        logger.warn(`No se pudo guardar audio ${audioId}: ${errLocal.message}`)
                    }
                }
            }
            await guardarMensaje(numero, textoMensaje, 'cliente')
            await procesarMensaje(numero, audioId, 'audio')
            return res.status(200).send('OK')
        }

        if (tipo === 'video' || tipo === 'document' || tipo === 'sticker') {
            await guardarMensaje(numero, `[${tipo}]`, 'cliente')
            await procesarMensaje(numero, '', tipo)
            return res.status(200).send('OK')
        }

        if (tipo !== 'text') {
            return res.status(200).send('OK')
        }

        const texto = mensaje.text?.body

        if (!texto) {
            return res.status(200).send('OK')
        }

        await guardarMensaje(numero, texto, 'cliente')

        await procesarMensaje(numero, texto)

        res.status(200).send('OK')

    } catch (error) {
        logger.error('Error procesando mensaje:', { message: error.message, stack: error.stack })
        res.status(200).send('OK')
    }
})

module.exports = router