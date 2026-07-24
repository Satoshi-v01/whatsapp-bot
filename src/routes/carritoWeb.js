const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')

// Sincroniza el carrito de la tienda web (publico, sin auth — lo llama cualquier visitante).
// Se usa solo para detectar carritos abandonados, no para operar el negocio.
router.post('/sync', async (req, res) => {
    try {
        const { sesion_id, items, total } = req.body
        if (!sesion_id || typeof sesion_id !== 'string' || sesion_id.length > 64) {
            return res.status(400).json({ error: 'sesion_id invalido' })
        }
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'items invalido' })
        }

        if (items.length === 0) {
            // Carrito vaciado (compra o el usuario lo limpio) — no tiene sentido trackearlo como abandonado
            await db.query(`DELETE FROM carritos_web WHERE sesion_id = $1 AND convertido = false`, [sesion_id])
            return res.json({ ok: true })
        }

        await db.query(
            `INSERT INTO carritos_web (sesion_id, items, total, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (sesion_id) DO UPDATE SET items = $2, total = $3, updated_at = NOW()`,
            [sesion_id, JSON.stringify(items), parseInt(total) || 0]
        )
        res.json({ ok: true })
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router
