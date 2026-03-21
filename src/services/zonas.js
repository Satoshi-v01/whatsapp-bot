const db = require('../db/index')

async function getZonasActivas() {
    const resultado = await db.query(
        `SELECT id, nombre, costo FROM zonas_delivery WHERE activa = true ORDER BY nombre ASC`
    )
    return resultado.rows
}

async function getZona(id) {
    const resultado = await db.query(
        `SELECT id, nombre, costo FROM zonas_delivery WHERE id = $1 AND activa = true`,
        [id]
    )
    return resultado.rows[0] || null
}

async function formatearListaZonas(zonas) {
    return zonas.map((z, i) => `${i + 1}. ${z.nombre} — Gs. ${z.costo.toLocaleString('es-PY')}`).join('\n')
}

module.exports = { getZonasActivas, getZona, formatearListaZonas }