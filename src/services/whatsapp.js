const axios = require('axios')
const path = require('path')
const fs = require('fs')
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

// Descarga imagen de Meta Graph API y la sube a Supabase Storage
async function descargarYGuardarImagen(imageId) {
    // 1. Obtener URL temporal de Meta
    const metaRes = await axios.get(
        `https://graph.facebook.com/v19.0/${imageId}`,
        { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
    )
    const downloadUrl = metaRes.data.url
    const mimeType = metaRes.data.mime_type || 'image/jpeg'

    // 2. Descargar el binario (requiere el token en el header)
    const imgRes = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    })
    const buffer = Buffer.from(imgRes.data)
    const ext = mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : '.jpg'
    const nombre = `comprobantes/${Date.now()}-${imageId.slice(-8)}${ext}`

    // 3. Subir a Supabase Storage (bucket "imagenes")
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

// Descarga imagen de Meta y la guarda en disco local (public/uploads/media/)
// Retorna la ruta pública /uploads/media/<nombre>
async function descargarYCacharMedia(mediaId) {
    const cacheDir = path.join(__dirname, '../../public/uploads/media')

    // Si ya está en caché, devolver la ruta
    for (const ext of ['.jpg', '.png', '.webp']) {
        const cached = path.join(cacheDir, `${mediaId}${ext}`)
        if (fs.existsSync(cached)) return `/uploads/media/${mediaId}${ext}`
    }

    const token = process.env.WHATSAPP_TOKEN
    const metaRes = await axios.get(
        `https://graph.facebook.com/v19.0/${mediaId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    const { url, mime_type } = metaRes.data
    if (!url) throw new Error('Meta no devolvió URL de descarga')

    const imgRes = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { Authorization: `Bearer ${token}` }
    })

    const ext = mime_type?.includes('png') ? '.png' : mime_type?.includes('webp') ? '.webp' : '.jpg'
    fs.mkdirSync(cacheDir, { recursive: true })
    const filename = `${mediaId}${ext}`
    fs.writeFileSync(path.join(cacheDir, filename), Buffer.from(imgRes.data))

    return `/uploads/media/${filename}`
}

module.exports = { enviarMensaje, descargarYGuardarImagen, descargarYCacharMedia }