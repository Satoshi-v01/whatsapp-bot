const express = require('express')
const router = express.Router()
const axios = require('axios')
const { autenticar } = require('../middleware/auth')

// GET /api/media/:mediaId — proxy autenticado de archivos de WhatsApp
router.get('/:mediaId', autenticar, async (req, res) => {
    const { mediaId } = req.params
    const token = process.env.WHATSAPP_TOKEN

    if (!token) return res.status(503).json({ error: 'Token no configurado' })

    try {
        // Paso 1: obtener URL temporal de Meta
        const metaRes = await axios.get(
            `https://graph.facebook.com/v19.0/${mediaId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        )
        const { url, mime_type } = metaRes.data
        if (!url) return res.status(404).json({ error: 'Media no encontrado' })

        // Paso 2: descargar el binario y hacer stream al cliente
        const mediaRes = await axios.get(url, {
            responseType: 'stream',
            headers: { Authorization: `Bearer ${token}` }
        })

        res.setHeader('Content-Type', mime_type || 'application/octet-stream')
        res.setHeader('Cache-Control', 'private, max-age=3600')
        mediaRes.data.pipe(res)
    } catch (err) {
        const status = err.response?.status || 500
        res.status(status).json({ error: 'No se pudo obtener el archivo' })
    }
})

module.exports = router
