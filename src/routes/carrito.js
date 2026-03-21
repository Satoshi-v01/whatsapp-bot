const express = require('express')
const router = express.Router()
const { getCarrito, agregarAlCarrito, quitarDelCarrito, limpiarCarrito, formatearCarrito } = require('../services/carrito')
const { manejarError } = require('../middleware/validar')

// Ver carrito
router.get('/:cliente_numero', async (req, res) => {
    try {
        const carrito = await getCarrito(req.params.cliente_numero)
        res.json({ carrito })
    } catch (error) {
        manejarError(res, error)
    }
})

// Agregar al carrito
router.post('/:cliente_numero/agregar', async (req, res) => {
    try {
        const { presentacion_id, presentacion_nombre, producto_nombre, precio, cantidad = 1 } = req.body
        if (!presentacion_id || !precio) {
            return res.status(400).json({ error: 'presentacion_id y precio son requeridos' })
        }
        const resultado = await agregarAlCarrito(req.params.cliente_numero, {
            presentacion_id, presentacion_nombre, producto_nombre, precio, cantidad
        })
        if (!resultado.ok) return res.status(400).json({ error: resultado.mensaje })
        res.json(resultado)
    } catch (error) {
        manejarError(res, error)
    }
})

// Quitar del carrito
router.delete('/:cliente_numero/quitar/:presentacion_id', async (req, res) => {
    try {
        const carrito = await quitarDelCarrito(req.params.cliente_numero, parseInt(req.params.presentacion_id))
        res.json({ carrito })
    } catch (error) {
        manejarError(res, error)
    }
})

// Limpiar carrito
router.delete('/:cliente_numero/limpiar', async (req, res) => {
    try {
        await limpiarCarrito(req.params.cliente_numero)
        res.json({ ok: true })
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router