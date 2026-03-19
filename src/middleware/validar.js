function validarVentaPresencial(req, res, next) {
    const { presentacion_id, cantidad, precio, metodo_pago, canal } = req.body

    if (!presentacion_id || isNaN(parseInt(presentacion_id)) || parseInt(presentacion_id) < 1) {
        return res.status(400).json({ error: 'Presentación inválida' })
    }
    if (!cantidad || isNaN(parseInt(cantidad)) || parseInt(cantidad) < 1 || parseInt(cantidad) > 999) {
        return res.status(400).json({ error: 'Cantidad debe ser entre 1 y 999' })
    }
    if (!precio || isNaN(parseFloat(precio)) || parseFloat(precio) < 1) {
        return res.status(400).json({ error: 'Precio inválido' })
    }
    if (!['efectivo', 'transferencia', 'tarjeta'].includes(metodo_pago)) {
        return res.status(400).json({ error: 'Método de pago inválido' })
    }
    const canalesValidos = ['en_tienda', 'whatsapp_bot', 'whatsapp', 'whatsapp_delivery', 'pagina_web', 'presencial', 'otro']
    if (canal && !canalesValidos.includes(canal)) {
        return res.status(400).json({ error: 'Canal inválido' })
    }

    next()
}

function validarEstado(req, res, next) {
    const { estado } = req.body
    const estadosValidos = ['pendiente_pago', 'pagado', 'entregado', 'cancelado']
    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' })
    }
    next()
}

function validarId(req, res, next) {
    const { id } = req.params
    if (!id || isNaN(parseInt(id)) || parseInt(id) < 1) {
        return res.status(400).json({ error: 'ID inválido' })
    }
    next()
}

function manejarError(res, error) {
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ error: 'Error interno del servidor' })
    } else {
        res.status(500).json({ error: error.message })
    }
}

module.exports = { validarVentaPresencial, validarEstado, validarId, manejarError }

module.exports = { validarVentaPresencial, validarEstado, validarId }