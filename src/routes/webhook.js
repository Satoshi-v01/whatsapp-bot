const express = require('express')
const router = express.Router()
const { procesarMensaje } = require('../bot/flow')
const { enviarMensaje } = require('../services/whatsapp')
const { guardarMensaje } = require('../services/mensajes')

router.get('/', (req, res) => {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        console.log('Webhook verificado por Meta')
        res.status(200).send(challenge)
    } else {
        console.log('Token incorrecto — verificación rechazada')
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

        if (tipo === 'location') {
            const { latitude, longitude } = mensaje.location
            const ubicacion = `https://maps.google.com/?q=${latitude},${longitude}`
            await guardarMensaje(numero, ubicacion, 'cliente')
            await procesarMensaje(numero, ubicacion, 'location')
            return res.status(200).send('OK')
        }

        if (tipo !== 'text') {
            await enviarMensaje(numero,
                'Por el momento solo puedo entender mensajes de texto. ' +
                '¿Podés escribirme el nombre del producto que estás buscando?'
            )
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
        console.error('Error procesando mensaje:', error)
        res.status(200).send('OK')
    }
})

module.exports = router