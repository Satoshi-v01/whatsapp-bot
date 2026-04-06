const express = require('express')
const multer = require('multer')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { autenticar } = require('../middleware/auth')

const router = express.Router()

const BUCKET = 'imagenes'

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

// Multer en memoria — no toca el disco
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if (permitidos.includes(file.mimetype)) cb(null, true)
        else cb(new Error('Solo se permiten imagenes (jpg, png, webp, gif)'))
    },
})

// POST /api/uploads/imagen
router.post('/imagen', autenticar, upload.single('imagen'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibio ninguna imagen.' })

    try {
        const ext = path.extname(req.file.originalname).toLowerCase()
        const nombre = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

        const supabase = getSupabase()

        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(nombre, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false,
            })

        if (error) throw error

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(nombre)

        res.json({ url: data.publicUrl })
    } catch (err) {
        console.error('Error subiendo imagen a Supabase Storage:', err.message)
        res.status(500).json({ error: 'No se pudo subir la imagen.' })
    }
})

module.exports = router
