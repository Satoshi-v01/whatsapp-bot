const db = require('../db/index')

// Stock disponible = stock real - reservas activas de otros clientes
async function stockDisponible(presentacion_id, cliente_numero = null) {
    const resultado = await db.query(
        `SELECT stock_disponible($1, $2) as disponible`,
        [presentacion_id, cliente_numero]
    )
    return parseInt(resultado.rows[0].disponible)
}

// Stock disponible para múltiples presentaciones a la vez
async function stockDisponibleBulk(presentacion_ids, cliente_numero = null) {
    const resultado = await db.query(
        `SELECT id, nombre, stock, stock_disponible(id, $2) as disponible
         FROM presentaciones
         WHERE id = ANY($1)`,
        [presentacion_ids, cliente_numero]
    )
    return resultado.rows
}

// Verificar si hay stock suficiente para confirmar venta
async function verificarStockParaVenta(lineas, cliente_numero = null) {
    const errores = []
    for (const linea of lineas) {
        const disponible = await stockDisponible(linea.presentacion_id, cliente_numero)
        if (disponible < linea.cantidad) {
            const pr = await db.query(
                `SELECT p.nombre as producto, pr.nombre as presentacion
                 FROM presentaciones pr
                 JOIN productos p ON pr.producto_id = p.id
                 WHERE pr.id = $1`,
                [linea.presentacion_id]
            )
            errores.push({
                presentacion_id: linea.presentacion_id,
                nombre: `${pr.rows[0]?.producto} — ${pr.rows[0]?.presentacion}`,
                pedido: linea.cantidad,
                disponible
            })
        }
    }
    return { ok: errores.length === 0, errores }
}

module.exports = { stockDisponible, stockDisponibleBulk, verificarStockParaVenta }