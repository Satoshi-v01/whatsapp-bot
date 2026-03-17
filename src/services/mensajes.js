const db = require('../db/index')

async function guardarMensaje(numero, texto, origen) {
    await db.query(
        `INSERT INTO mensajes (cliente_numero, texto, origen)
         VALUES ($1, $2, $3)`,
        [numero, texto, origen]
    )
}

async function obtenerMensajes(numero) {
    const resultado = await db.query(
        `SELECT * FROM mensajes 
         WHERE cliente_numero = $1
         ORDER BY created_at ASC`,
        [numero]
    )
    return resultado.rows
}

module.exports = { guardarMensaje, obtenerMensajes }