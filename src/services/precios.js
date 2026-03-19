function calcularPrecioEfectivo(presentacion) {
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