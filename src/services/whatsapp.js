const axios = require('axios')

async function enviarMensaje(numero, texto) {
    try {
        await axios.post(
            `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to: numero,
                type: 'text',
                text: {
                    body: texto
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        console.log(`Mensaje enviado a ${numero}: ${texto}`)
    } catch (error) {
        console.error('Error enviando mensaje:', error.response?.data || error.message)
    }
}

module.exports = { enviarMensaje }