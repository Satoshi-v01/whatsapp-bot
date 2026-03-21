const db = require('../db/index')

async function estaAbierto() {
    try {
        const resultado = await db.query(
            `SELECT valor FROM configuracion WHERE clave = 'tienda_horario'`
        )
        if (!resultado.rows.length) return true // si no hay config, asumir abierto

        const horario = JSON.parse(resultado.rows[0].valor)

        const ahora = new Date()
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const diaHoy = diasSemana[ahora.getDay()]

        const config = horario[diaHoy]
        if (!config || !config.activo) return false

        // Comparar hora actual con rango
        const [desdeH, desdeM] = config.desde.split(':').map(Number)
        const [hastaH, hastaM] = config.hasta.split(':').map(Number)

        const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()
        const minutosDesde = desdeH * 60 + desdeM
        const minutosHasta = hastaH * 60 + hastaM

        return minutosAhora >= minutosDesde && minutosAhora < minutosHasta
    } catch (err) {
        return true // ante cualquier error, no bloquear al cliente
    }
}

async function getMensajeFueraHorario() {
    try {
        const resultado = await db.query(
            `SELECT valor FROM configuracion WHERE clave = 'bot_mensaje_fuera_horario'`
        )
        return resultado.rows[0]?.valor || 'Estamos fuera de horario. Te atenderemos pronto.'
    } catch (err) {
        return 'Estamos fuera de horario. Te atenderemos pronto.'
    }
}

async function estaAbiertoParagDelivery() {
    try {
        const ahora = new Date()
        const horas = ahora.getHours()
        // Después de las 16:00 no se procesan deliveries
        return horas < 16
    } catch (err) {
        return true
    }
}

module.exports = { estaAbierto, getMensajeFueraHorario, estaAbiertoParagDelivery }

module.exports = { estaAbierto, getMensajeFueraHorario }