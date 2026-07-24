const db = require('../db/index')

async function obtenerSesion(numero, nombreWhatsapp) {
    const resultado = await db.query(
        'SELECT * FROM sesiones WHERE cliente_numero = $1',
        [numero]
    )

    if (resultado.rows.length === 0) {
        const nueva = await db.query(
            `INSERT INTO sesiones (cliente_numero, paso, modo, datos, nombre_whatsapp)
             VALUES ($1, 'inicio', 'bot', '{}', $2)
             RETURNING *`,
            [numero, nombreWhatsapp || null]
        )
        return nueva.rows[0]
    }

    const sesion = resultado.rows[0]

    if (nombreWhatsapp && nombreWhatsapp !== sesion.nombre_whatsapp) {
        await db.query('UPDATE sesiones SET nombre_whatsapp = $1 WHERE cliente_numero = $2', [nombreWhatsapp, numero])
        sesion.nombre_whatsapp = nombreWhatsapp
    }

    const expirada = verificarExpiracion(sesion.ultimo_mensaje)
    if (expirada) {
        await reiniciarSesion(numero)
        return await obtenerSesion(numero, nombreWhatsapp)
    }

    return sesion
}

async function actualizarSesion(numero, datos) {
    await db.query(
        `UPDATE sesiones 
         SET paso = $1, modo = $2, datos = $3, ultimo_mensaje = NOW()
         WHERE cliente_numero = $4`,
        [datos.paso, datos.modo, JSON.stringify(datos.datos), numero]
    )
}

async function reiniciarSesion(numero) {
    await db.query(
        `UPDATE sesiones 
         SET paso = 'inicio', modo = 'bot', datos = '{}', ultimo_mensaje = NOW()
         WHERE cliente_numero = $1`,
        [numero]
    )
}

function verificarExpiracion(ultimoMensaje) {
    const horas = process.env.SESSION_EXPIRY_HOURS || 2
    const ahora = new Date()
    const ultimo = new Date(ultimoMensaje)
    const diferencia = (ahora - ultimo) / (1000 * 60 * 60)
    return diferencia > horas
}

module.exports = { obtenerSesion, actualizarSesion, reiniciarSesion }