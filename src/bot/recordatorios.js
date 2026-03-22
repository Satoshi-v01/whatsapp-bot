const db = require('../db/index')
const { enviarMensaje } = require('../services/whatsapp')
const { guardarMensaje } = require('../services/mensajes')
const { limpiarCarrito } = require('../services/carrito')

const MINUTOS_RECORDATORIO = 60
const HORAS_CIERRE = 3

async function procesarTimeouts() {
    try {
        await enviarRecordatorios()
        await cerrarSesionesInactivas()
        await limpiarReservasExpiradas()
        await db.query(`SELECT expirar_ordenes_pedido()`)

    } catch (err) {
        console.error('Error en procesarTimeouts:', err.message)
    }
}

async function enviarRecordatorios() {
    const resultado = await db.query(
        `SELECT cliente_numero, paso, carrito
         FROM sesiones
         WHERE modo = 'bot'
           AND paso != 'inicio'
           AND recordatorio_enviado = false
           AND ultimo_mensaje < NOW() - INTERVAL '${MINUTOS_RECORDATORIO} minutes'
           AND ultimo_mensaje > NOW() - INTERVAL '${HORAS_CIERRE} hours'`
    )

    for (const sesion of resultado.rows) {
        try {
            const carrito = Array.isArray(sesion.carrito) ? sesion.carrito : []
            let mensaje = `Sigues ahi? 👋\n\n`

            if (carrito.length > 0) {
                const items = carrito.map(i =>
                    `- ${i.producto_nombre} - ${i.presentacion_nombre} x${i.cantidad}`
                ).join('\n')
                mensaje += `Tenes productos en tu carrito:\n${items}\n\n`
                mensaje += `Podes continuar con tu pedido cuando quieras.\n`
                mensaje += `Escribi *3* para ver tu carrito o cualquier producto para seguir comprando 🐾`
            } else {
                mensaje += `Puedo ayudarte con algo? Escribime cuando quieras 🐾`
            }

            await enviarMensaje(sesion.cliente_numero, mensaje)
            await guardarMensaje(sesion.cliente_numero, mensaje, 'bot')

            await db.query(
                `UPDATE sesiones SET recordatorio_enviado = true WHERE cliente_numero = $1`,
                [sesion.cliente_numero]
            )
        } catch (err) {
            console.error(`Error enviando recordatorio a ${sesion.cliente_numero}:`, err.message)
        }
    }
}

async function cerrarSesionesInactivas() {
    const resultado = await db.query(
        `SELECT cliente_numero, carrito
         FROM sesiones
         WHERE modo = 'bot'
           AND paso != 'inicio'
           AND ultimo_mensaje < NOW() - INTERVAL '${HORAS_CIERRE} hours'`
    )

    for (const sesion of resultado.rows) {
        try {
            const carrito = Array.isArray(sesion.carrito) ? sesion.carrito : []

            let mensaje = `Tu sesion fue cerrada por inactividad.\n\n`

            if (carrito.length > 0) {
                mensaje += `Tus productos quedaron guardados por 24 horas.\n`
                mensaje += `Cuando vuelvas a escribir, escribe *3* para ver tu carrito 🐾`
            } else {
                mensaje += `Cuando quieras continuar, solo escribinos 🐾`
            }

            await enviarMensaje(sesion.cliente_numero, mensaje)
            await guardarMensaje(sesion.cliente_numero, mensaje, 'bot')

            await db.query(
                `UPDATE sesiones
                 SET paso = 'inicio',
                     modo = 'bot',
                     datos = '{}',
                     recordatorio_enviado = false,
                     ultimo_mensaje = NOW()
                 WHERE cliente_numero = $1`,
                [sesion.cliente_numero]
            )
        } catch (err) {
            console.error(`Error cerrando sesion ${sesion.cliente_numero}:`, err.message)
        }
    }
}

async function limpiarReservasExpiradas() {
    await db.query(`SELECT limpiar_reservas_expiradas()`)
}

module.exports = { procesarTimeouts }