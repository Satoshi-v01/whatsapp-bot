const axios = require('axios')
const { createClient } = require('@supabase/supabase-js')

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

async function descargarYGuardarImagen(imageId) {
    const metaRes = await axios.get(
        `https://graph.facebook.com/v22.0/${imageId}`,
        { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
    )
    const downloadUrl = metaRes.data.url
    const mimeType = metaRes.data.mime_type || 'image/jpeg'

    const imgRes = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    })
    const buffer = Buffer.from(imgRes.data)
    const ext = mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : '.jpg'
    const nombre = `comprobantes/${Date.now()}-${imageId.slice(-8)}${ext}`

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { error } = await supabase.storage
        .from('imagenes')
        .upload(nombre, buffer, { contentType: mimeType, upsert: false })
    if (error) throw error

    const { data } = supabase.storage.from('imagenes').getPublicUrl(nombre)
    return data.publicUrl
}

module.exports = { enviarMensaje, descargarYGuardarImagen }