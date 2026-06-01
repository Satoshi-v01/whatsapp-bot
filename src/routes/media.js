const express = require('express')
const router = express.Router()
const axios = require('axios')
const path = require('path')
const fs = require('fs')

// GET /api/media/:mediaId — sirve desde caché local; si no existe intenta Meta API
router.get('/:mediaId', async (req, res) => {
    const { mediaId } = req.params
    const cacheDir = path.join(__dirname, '../../public/uploads/media')

    // Buscar en caché local primero (sin necesidad del token de Meta)
    for (const ext of ['.jpg', '.png', '.webp']) {
        const cached = path.join(cacheDir, `${mediaId}${ext}`)
        if (fs.existsSync(cached)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
            return res.sendFile(cached)
        }
    }

    // Fallback: intentar descargar desde Meta y cachear
    const token = process.env.WHATSAPP_TOKEN
    if (!token) return res.status(404).json({ error: 'Media no disponible' })

    try {
        const metaRes = await axios.get(
            `https://graph.facebook.com/v19.0/${mediaId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        )
        const { url, mime_type } = metaRes.data
        if (!url) return res.status(404).json({ error: 'Media no encontrado' })

        const mediaRes = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { Authorization: `Bearer ${token}` }
        })

        // Guardar en caché para próximas solicitudes
        const ext = mime_type?.includes('png') ? '.png' : mime_type?.includes('webp') ? '.webp' : '.jpg'
        fs.mkdirSync(cacheDir, { recursive: true })
        fs.writeFileSync(path.join(cacheDir, `${mediaId}${ext}`), Buffer.from(mediaRes.data))

        res.setHeader('Content-Type', mime_type || 'image/jpeg')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
        res.send(mediaRes.data)
    } catch (err) {
        const status = err.response?.status || 500
        res.status(status).json({ error: 'No se pudo obtener el archivo' })
    }
})

module.exports = router
