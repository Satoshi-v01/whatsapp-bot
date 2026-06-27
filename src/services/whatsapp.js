const axios = require('axios')
const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
const logger = require('../middleware/logger')

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
        logger.info(`Mensaje enviado a ${numero}: ${texto}`)
    } catch (error) {
        logger.error('Error enviando mensaje:', { data: error.response?.data, message: error.message })
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

function extDesdeMime(mimeType) {
    if (!mimeType) return '.bin'
    if (mimeType.includes('png'))  return '.png'
    if (mimeType.includes('webp')) return '.webp'
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg'
    if (mimeType.includes('ogg'))  return '.ogg'
    if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return '.mp3'
    if (mimeType.includes('mp4'))  return '.mp4'
    if (mimeType.includes('aac'))  return '.aac'
    if (mimeType.includes('m4a'))  return '.m4a'
    return '.bin'
}

// Descarga cualquier media de Meta y guarda en disco local (public/uploads/media/)
// Retorna la ruta pública /uploads/media/<nombre>
async function descargarYCacharMedia(mediaId) {
    const cacheDir = path.join(__dirname, '../../public/uploads/media')
    const EXTS = ['.jpg', '.png', '.webp', '.ogg', '.mp3', '.mp4', '.aac', '.m4a', '.bin']

    for (const ext of EXTS) {
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

    const mediaRes = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { Authorization: `Bearer ${token}` }
    })

    const ext = extDesdeMime(mime_type)
    fs.mkdirSync(cacheDir, { recursive: true })
    const filename = `${mediaId}${ext}`
    fs.writeFileSync(path.join(cacheDir, filename), Buffer.from(mediaRes.data))

    return `/uploads/media/${filename}`
}

// Descarga cualquier media de Meta y sube a Supabase Storage
async function descargarYGuardarMedia(mediaId, carpeta = 'media') {
    const metaRes = await axios.get(
        `https://graph.facebook.com/v19.0/${mediaId}`,
        { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
    )
    const { url, mime_type } = metaRes.data
    if (!url) throw new Error('Meta no devolvió URL de descarga')

    const mediaRes = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
    })
    const buffer = Buffer.from(mediaRes.data)
    const ext = extDesdeMime(mime_type)
    const nombre = `${carpeta}/${Date.now()}-${mediaId.slice(-8)}${ext}`

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { error } = await supabase.storage
        .from('imagenes')
        .upload(nombre, buffer, { contentType: mime_type || 'application/octet-stream', upsert: false })
    if (error) throw error

    const { data } = supabase.storage.from('imagenes').getPublicUrl(nombre)
    return data.publicUrl
}

module.exports = { enviarMensaje, descargarYGuardarImagen, descargarYGuardarMedia, descargarYCacharMedia }