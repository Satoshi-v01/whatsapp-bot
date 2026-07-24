const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { autenticar, verificarPermiso } = require('../middleware/auth')

// Listar cuentas activas (usado por Caja al elegir transferencia)
router.get('/', autenticar, async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT id, banco, titular, numero_cuenta, alias FROM cuentas_transferencia WHERE activa = true ORDER BY banco ASC`
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Listar todas (dashboard / configuracion)
router.get('/todas', autenticar, verificarPermiso('configuracion', 'ver'), async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT * FROM cuentas_transferencia ORDER BY banco ASC`
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Crear cuenta
router.post('/', autenticar, verificarPermiso('configuracion', 'crear'), async (req, res) => {
    try {
        const { banco, titular, numero_cuenta, alias } = req.body
        if (!banco || !titular) {
            return res.status(400).json({ error: 'Banco y titular son requeridos' })
        }
        const resultado = await db.query(
            `INSERT INTO cuentas_transferencia (banco, titular, numero_cuenta, alias) VALUES ($1, $2, $3, $4) RETURNING *`,
            [banco, titular, numero_cuenta || null, alias || null]
        )
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Editar cuenta
router.patch('/:id', autenticar, verificarPermiso('configuracion', 'editar'), async (req, res) => {
    try {
        const { id } = req.params
        const { banco, titular, numero_cuenta, alias, activa } = req.body
        const resultado = await db.query(
            `UPDATE cuentas_transferencia
             SET banco = COALESCE($1, banco),
                 titular = COALESCE($2, titular),
                 numero_cuenta = COALESCE($3, numero_cuenta),
                 alias = COALESCE($4, alias),
                 activa = COALESCE($5, activa),
                 updated_at = NOW()
             WHERE id = $6 RETURNING *`,
            [banco, titular, numero_cuenta, alias, activa, id]
        )
        if (!resultado.rows.length) return res.status(404).json({ error: 'Cuenta no encontrada' })
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Eliminar cuenta
router.delete('/:id', autenticar, verificarPermiso('configuracion', 'eliminar'), async (req, res) => {
    try {
        const { id } = req.params
        await db.query(`DELETE FROM cuentas_transferencia WHERE id = $1`, [id])
        res.json({ ok: true })
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router
