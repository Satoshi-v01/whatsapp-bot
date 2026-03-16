const db = require('../db/index')

async function obtenerSesion(numero) {
    const resultado = await db.query(
        'SELECT * FROM sesiones WHERE cliente_numero = $1',
        [numero]
    )

    if (resultado.rows.length === 0) {
        const nueva = await db.query(
            `INSERT INTO sesiones (cliente_numero, paso, modo, datos)
             VALUES ($1, 'inicio', 'bot', '{}')
             RETURNING *`,
            [numero]
        )
        return nueva.rows[0]
    }

    const sesion = resultado.rows[0]

    const expirada = verificarExpiracion(sesion.ultimo_mensaje)
    if (expirada) {
        await reiniciarSesion(numero)
        return await obtenerSesion(numero)
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