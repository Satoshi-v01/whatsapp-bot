const express = require('express')
const router = express.Router()

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

router.post('/', (req, res) => {
    console.log('Mensaje recibido:', JSON.stringify(req.body, null, 2))
    res.status(200).send('OK')
})

module.exports = router