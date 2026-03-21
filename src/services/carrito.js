const db = require('../db/index')
const { stockDisponible } = require('./stock')

const CARRITO_EXPIRY_HOURS = 24

async function getCarrito(cliente_numero) {
    const resultado = await db.query(
        `SELECT carrito, carrito_expires_at FROM sesiones WHERE cliente_numero = $1`,
        [cliente_numero]
    )
    if (!resultado.rows.length) return []

    const { carrito, carrito_expires_at } = resultado.rows[0]

    if (carrito_expires_at && new Date(carrito_expires_at) < new Date()) {
        await limpiarCarrito(cliente_numero)
        return []
    }

    return Array.isArray(carrito) ? carrito : []
}

async function agregarAlCarrito(cliente_numero, item) {
    const carrito = await getCarrito(cliente_numero)

    const disponible = await stockDisponible(item.presentacion_id, cliente_numero)
    const cantidadActual = carrito.find(i => i.presentacion_id === item.presentacion_id)?.cantidad || 0

    if (disponible < cantidadActual + item.cantidad) {
        return {
            ok: false,
            mensaje: disponible === 0
                ? `Lo sentimos, *${item.producto_nombre} - ${item.presentacion_nombre}* ya no tiene stock disponible.`
                : `Solo quedan *${disponible}* unidades disponibles de *${item.producto_nombre} - ${item.presentacion_nombre}*.`
        }
    }

    const existe = carrito.findIndex(i => i.presentacion_id === item.presentacion_id)
    if (existe >= 0) {
        carrito[existe].cantidad += item.cantidad
    } else {
        carrito.push(item)
    }

    const expires = new Date(Date.now() + CARRITO_EXPIRY_HOURS * 60 * 60 * 1000)
    await db.query(
        `UPDATE sesiones SET carrito = $1, carrito_expires_at = $2 WHERE cliente_numero = $3`,
        [JSON.stringify(carrito), expires, cliente_numero]
    )

    await upsertReserva(cliente_numero, item.presentacion_id, cantidadActual + item.cantidad)

    return { ok: true, carrito }
}

async function quitarDelCarrito(cliente_numero, presentacion_id) {
    const carrito = await getCarrito(cliente_numero)
    const nuevo = carrito.filter(i => i.presentacion_id !== presentacion_id)

    await db.query(
        `UPDATE sesiones SET carrito = $1 WHERE cliente_numero = $2`,
        [JSON.stringify(nuevo), cliente_numero]
    )

    await db.query(
        `DELETE FROM reservas_carrito WHERE cliente_numero = $1 AND presentacion_id = $2`,
        [cliente_numero, presentacion_id]
    )

    return nuevo
}

async function limpiarCarrito(cliente_numero) {
    await db.query(
        `UPDATE sesiones SET carrito = '[]'::jsonb, carrito_expires_at = NULL WHERE cliente_numero = $1`,
        [cliente_numero]
    )
    await db.query(
        `DELETE FROM reservas_carrito WHERE cliente_numero = $1`,
        [cliente_numero]
    )
}

async function limpiarReservasPostVenta(cliente_numero) {
    await db.query(
        `DELETE FROM reservas_carrito WHERE cliente_numero = $1`,
        [cliente_numero]
    )
}

async function upsertReserva(cliente_numero, presentacion_id, cantidad) {
    const expires = new Date(Date.now() + CARRITO_EXPIRY_HOURS * 60 * 60 * 1000)
    await db.query(
        `INSERT INTO reservas_carrito (cliente_numero, presentacion_id, cantidad, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (cliente_numero, presentacion_id)
         DO UPDATE SET cantidad = $3, expires_at = $4`,
        [cliente_numero, presentacion_id, cantidad, expires]
    )
}

function calcularTotal(carrito, costo_delivery = 0) {
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
    return { subtotal, costo_delivery, total: subtotal + costo_delivery }
}

function formatearCarrito(carrito, zona = null, costo_delivery = 0) {
    if (!carrito.length) return 'Tu carrito esta vacio.'

    const { subtotal, total } = calcularTotal(carrito, costo_delivery)

    const items = carrito.map(item =>
        `- ${item.producto_nombre} - ${item.presentacion_nombre} x${item.cantidad}: Gs. ${(item.precio * item.cantidad).toLocaleString('es-PY')}`
    ).join('\n')

    let resumen = `Tu carrito:\n\n${items}\n`

    if (zona) {
        resumen += `\nDelivery a ${zona}: Gs. ${costo_delivery.toLocaleString('es-PY')}`
    }

    resumen += `\n\n*Total: Gs. ${total.toLocaleString('es-PY')}*`

    return resumen
}

module.exports = {
    getCarrito, agregarAlCarrito, quitarDelCarrito,
    limpiarCarrito, limpiarReservasPostVenta,
    calcularTotal, formatearCarrito
}