const express = require('express')
const router = express.Router()
const { enviarMensaje } = require('../services/whatsapp')

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
        const texto = mensaje.text?.body

        console.log(`Mensaje de ${numero}: ${texto}`)

        await enviarMensaje(numero, `Buenas, soy Socrates. El asistente virtual de la tienda. ¿Como puedo ayudarte?`)

        res.status(200).send('OK')

    } catch (error) {
        console.error('Error procesando mensaje:', error)
        res.status(200).send('OK')
    }
})

module.exports = router