function calcularPrecioEfectivo(presentacion, metodoPago = 'efectivo') {
    if (metodoPago === 'tarjeta') {
        return {
            precio: presentacion.precio_tarjeta || presentacion.precio_venta,
            con_descuento: false
        }
    }

    const ahora = new Date()

    if (
        presentacion.descuento_activo &&
        presentacion.precio_descuento &&
        new Date(presentacion.descuento_desde) <= ahora &&
        new Date(presentacion.descuento_hasta) >= ahora &&
        (presentacion.descuento_stock === null || presentacion.descuento_stock > 0)
    ) {
        return {
            precio: presentacion.precio_descuento,
            con_descuento: true
        }
    }

    return {
        precio: presentacion.precio_venta,
        con_descuento: false
    }
}

module.exports = { calcularPrecioEfectivo }
