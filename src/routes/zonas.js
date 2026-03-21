const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')

// Listar zonas activas (público — bot + web)
router.get('/', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT id, nombre, costo FROM zonas_delivery WHERE activa = true ORDER BY nombre ASC`
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Listar todas las zonas (dashboard)
router.get('/todas', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT * FROM zonas_delivery ORDER BY nombre ASC`
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Crear zona
router.post('/', async (req, res) => {
    try {
        const { nombre, costo } = req.body
        if (!nombre || costo === undefined) {
            return res.status(400).json({ error: 'Nombre y costo son requeridos' })
        }
        const resultado = await db.query(
            `INSERT INTO zonas_delivery (nombre, costo) VALUES ($1, $2) RETURNING *`,
            [nombre, parseInt(costo)]
        )
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Editar zona
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, costo, activa } = req.body
        const resultado = await db.query(
            `UPDATE zonas_delivery
             SET nombre = COALESCE($1, nombre),
                 costo = COALESCE($2, costo),
                 activa = COALESCE($3, activa),
                 updated_at = NOW()
             WHERE id = $4 RETURNING *`,
            [nombre, costo !== undefined ? parseInt(costo) : null, activa, id]
        )
        if (!resultado.rows.length) return res.status(404).json({ error: 'Zona no encontrada' })
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Eliminar zona
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params
        await db.query(`DELETE FROM zonas_delivery WHERE id = $1`, [id])
        res.json({ ok: true })
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router