const db = require('../db/index')

async function registrarLog({ usuario_id, usuario_nombre, accion, modulo, entidad, entidad_id, descripcion, dato_anterior, dato_nuevo, ip }) {
    try {
        await db.query(
            `INSERT INTO logs_auditoria (usuario_id, usuario_nombre, accion, modulo, entidad, entidad_id, descripcion, dato_anterior, dato_nuevo, ip)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                usuario_id || null,
                usuario_nombre || null,
                accion,
                modulo,
                entidad || null,
                entidad_id || null,
                descripcion || null,
                dato_anterior ? JSON.stringify(dato_anterior) : null,
                dato_nuevo ? JSON.stringify(dato_nuevo) : null,
                ip || null
            ]
        )
    } catch (err) {
        // El log nunca debe romper el flujo principal
        console.error('Error registrando log:', err.message)
    }
}

module.exports = { registrarLog }