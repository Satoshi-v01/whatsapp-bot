const db = require('../db/index')

function getAhoraEnPY() {
    const partes = new Intl.DateTimeFormat('es-PY', {
        timeZone: 'America/Asuncion',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(new Date())
    const get = tipo => partes.find(p => p.type === tipo)?.value ?? ''
    const dia = get('weekday')
    const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1)
    const horas = parseInt(get('hour'))
    const minutos = parseInt(get('minute'))
    return { dia: diaCap, minutos: horas * 60 + minutos }
}

async function estaAbierto() {
    try {
        const resultado = await db.query(
            `SELECT valor FROM configuracion WHERE clave = 'tienda_horario'`
        )
        if (!resultado.rows.length) return true

        const horario = JSON.parse(resultado.rows[0].valor)
        const { dia: diaHoy, minutos: minutosAhora } = getAhoraEnPY()

        const config = horario[diaHoy]
        if (!config || !config.activo) return false

        const [desdeH, desdeM] = config.desde.split(':').map(Number)
        const [hastaH, hastaM] = config.hasta.split(':').map(Number)
        const minutosDesde = desdeH * 60 + desdeM
        const minutosHasta = hastaH * 60 + hastaM

        return minutosAhora >= minutosDesde && minutosAhora < minutosHasta
    } catch (err) {
        return true
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

async function estaAbiertoParaDelivery() {
    try {
        const { minutos } = getAhoraEnPY()
        return minutos < 16 * 60
    } catch (err) {
        return true
    }
}

function esRetiroHoy() {
    const { minutos } = getAhoraEnPY()
    return minutos < (18 * 60 + 30)
}

module.exports = { estaAbierto, getMensajeFueraHorario, estaAbiertoParaDelivery, esRetiroHoy }