const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')

// Obtener toda la configuración
router.get('/', async (req, res) => {
    try {
        const resultado = await db.query(`SELECT clave, valor FROM configuracion ORDER BY clave ASC`)
        const config = {}
        resultado.rows.forEach(row => { config[row.clave] = row.valor })
        res.json(config)
    } catch (error) {
        manejarError(res, error)
    }
})

// Actualizar una clave
router.patch('/:clave', async (req, res) => {
    try {
        const { clave } = req.params
        const { valor } = req.body

        const resultado = await db.query(
            `INSERT INTO configuracion (clave, valor, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (clave) DO UPDATE SET valor = $2, updated_at = NOW()
             RETURNING *`,
            [clave, valor]
        )
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Actualizar múltiples claves a la vez
router.post('/bulk', async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { configuraciones } = req.body
        if (!configuraciones || typeof configuraciones !== 'object') {
            return res.status(400).json({ error: 'Datos inválidos' })
        }

        await client.query('BEGIN')
        for (const [clave, valor] of Object.entries(configuraciones)) {
            await client.query(
                `INSERT INTO configuracion (clave, valor, updated_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (clave) DO UPDATE SET valor = $2, updated_at = NOW()`,
                [clave, String(valor)]
            )
        }
        await client.query('COMMIT')
        res.json({ ok: true })
    } catch (error) {
        await client.query('ROLLBACK')
        manejarError(res, error)
    } finally {
        client.release()
    }
})

module.exports = router