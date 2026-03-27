const db = require('../db/index')
const { descontarStockFEFO } = require('../services/stock') // al inicio del archivo

async function registrarVentaPresencial(datos) {
    const {
        cliente_id,
        presentacion_id,
        cantidad,
        precio,
        metodo_pago,
        quiere_factura,
        ruc_factura,
        razon_social,
        agente_id
    } = datos

    const venta = await db.query(
        `INSERT INTO ventas (cliente_id, presentacion_id, cantidad, precio, canal, estado, metodo_pago, quiere_factura, ruc_factura, razon_social, agente_id)
         VALUES ($1, $2, $3, $4, 'presencial', 'pagado', $5, $6, $7, $8, $9)
         RETURNING *`,
        [cliente_id, presentacion_id, cantidad, precio, metodo_pago,
         quiere_factura || false, ruc_factura || null, razon_social || null, agente_id || null]
    )

    const lotesExisten = await client.query(`SELECT COUNT(*) as total FROM lotes WHERE presentacion_id = $1 AND activo = true AND stock_actual > 0`, [linea.presentacion_id])
    if (parseInt(lotesExisten.rows[0].total) > 0) {
        await descontarStockFEFO(client, linea.presentacion_id, cantidad)
    } else {
        await client.query(`UPDATE presentaciones SET stock = stock - $1 WHERE id = $2`, [cantidad, linea.presentacion_id])
    }

    return venta.rows[0]
}

module.exports = { registrarVentaPresencial }