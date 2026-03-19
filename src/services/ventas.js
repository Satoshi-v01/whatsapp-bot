const db = require('../db/index')

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

    await db.query(
        `UPDATE presentaciones SET stock = stock - $1 WHERE id = $2`,
        [cantidad, presentacion_id]
    )

    return venta.rows[0]
}

module.exports = { registrarVentaPresencial }