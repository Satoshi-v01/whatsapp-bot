const express = require('express')
const crypto = require('crypto')
const router = express.Router()
const db = require('../db/index')

const idempotenciaCache = new Map()
const { validarVentaPresencial, validarEstado, validarId } = require('../middleware/validar')
const { recalcularStats } = require('./clientes')
const { manejarError } = require('../middleware/validar')
const { descontarStockFEFO } = require('../services/stock')
const { registrarLog } = require('../middleware/auditoria')
const { autenticar, verificarPermiso, usuarioTienePermiso } = require('../middleware/auth')
const { calcularPrecioEfectivo } = require('../services/precios')

// Cantidad admite fracciones (venta por monto de presentaciones fraccionables,
// ej. 0.5kg); se redondea a precision de gramos para evitar arrastre de
// error de punto flotante.
function parseCantidad(valor) {
    return Math.round(parseFloat(valor) * 1000) / 1000
}

let consumidorFinalId = null

async function getOCrearConsumidorFinal() {
    if (consumidorFinalId) return consumidorFinalId
    const res = await db.query(
        `SELECT id FROM clientes WHERE tipo = 'consumidor_final' LIMIT 1`
    )
    if (res.rows.length > 0) {
        consumidorFinalId = res.rows[0].id
        return consumidorFinalId
    }
    const insert = await db.query(
        `INSERT INTO clientes (tipo, nombre, origen) VALUES ('consumidor_final', 'Consumidor Final', 'sistema') RETURNING id`
    )
    consumidorFinalId = insert.rows[0].id
    return consumidorFinalId
}

// 1. Ver todas las ventas
router.get('/', autenticar, verificarPermiso('ventas', 'ver'), async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT v.*, 
                    pr.nombre as presentacion_nombre,
                    pr.precio_compra,
                    p.nombre as producto_nombre,
                    u.nombre as agente_nombre,
                    c.nombre as cliente_nombre,
                    (v.precio - COALESCE(pr.precio_compra, 0)) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN usuarios u ON v.agente_id = u.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             ORDER BY v.created_at DESC`
        )
        res.json(resultado.rows)
    } catch (error) {
    manejarError(res, error)
}
})

// 2. Ver ventas por estado
router.get('/estado/:estado', autenticar, verificarPermiso('ventas', 'ver'), async (req, res) => {
    try {
        const { estado } = req.params
        const resultado = await db.query(
            `SELECT v.*,
                    pr.nombre as presentacion_nombre,
                    pr.precio_compra,
                    p.nombre as producto_nombre,
                    c.nombre as cliente_nombre,
                    (v.precio - COALESCE(pr.precio_compra, 0)) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE v.estado = $1
             ORDER BY v.created_at DESC`,
            [estado]
        )
        res.json(resultado.rows)
    } catch (error) {
    manejarError(res, error)
}
})

// 3. Historial con filtros y paginación
router.get('/historial', autenticar, verificarPermiso('ventas', 'ver'), async (req, res) => {
    try {
       const {
            periodo = 'hoy',
            buscar,
            metodo_pago,
            canal,
            estado,
            fecha_desde,
            fecha_hasta,
            pagina = 1,
            por_pagina = 20
        } = req.query

        const offset = (parseInt(pagina) - 1) * parseInt(por_pagina)

        let condiciones = ['1=1']
        let valores = []
        let i = 1

        // Excluir cancelados por default; si el filtro estado='cancelado' se aplica explicitamente se sobreescribe
        if (!estado || estado !== 'cancelado') {
            condiciones.push(`v.estado != 'cancelado'`)
        }

        if (periodo === 'hoy') {
            condiciones.push(`v.created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion'`)
        } else if (periodo === 'semanal') {
            condiciones.push(`v.created_at >= DATE_TRUNC('week', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion'`)
        } else if (periodo === 'mensual') {
            condiciones.push(`v.created_at >= DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion'`)
        } else if (periodo === 'anual') {
            condiciones.push(`v.created_at >= DATE_TRUNC('year', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion'`)
        } else if (periodo === 'personalizado' && fecha_desde && fecha_hasta) {
            condiciones.push(`v.created_at >= ($${i}::timestamp AT TIME ZONE 'America/Asuncion') AND v.created_at <= ($${i + 1}::timestamp AT TIME ZONE 'America/Asuncion')`)
            valores.push(fecha_desde, fecha_hasta)
            i += 2
        }

        if (estado) {
            condiciones.push(`v.estado = $${i}`)
            valores.push(estado)
            i++
        }

        if (buscar) {
            condiciones.push(`(
                CAST(v.id AS TEXT) ILIKE $${i} OR
                COALESCE(v.numero_factura, '') ILIKE $${i} OR
                LOWER(COALESCE(c.nombre, '')) ILIKE $${i} OR
                COALESCE(v.cliente_numero, '') ILIKE $${i}
            )`)
            valores.push(`%${buscar.toLowerCase()}%`)
            i++
        }

        if (metodo_pago) {
            condiciones.push(`v.metodo_pago = $${i}`)
            valores.push(metodo_pago)
            i++
        }

        if (canal) {
            condiciones.push(`v.canal = $${i}`)
            valores.push(canal)
            i++
        }

        const where = condiciones.join(' AND ')

        // Contar facturas agrupadas, no filas individuales
        const total = await db.query(
            `SELECT COUNT(*) as total FROM (
                SELECT COALESCE(v.numero_factura, v.id::text) as grupo
                FROM ventas v
                LEFT JOIN clientes c ON v.cliente_id = c.id
                WHERE ${where}
                GROUP BY COALESCE(v.numero_factura, v.id::text)
             ) g`,
            valores
        )

        // CTE: agrupa ventas por numero_factura (o por id si no tiene factura)
        // Suma el precio de todas las lineas y agrega los productos como items_heredados
        const cteGrupos = `
            WITH grupos AS (
                SELECT
                    MIN(v.id) as id,
                    MIN(v.numero_factura) as numero_factura,
                    MIN(v.created_at) as created_at,
                    MIN(v.cliente_id) as cliente_id,
                    SUM(v.precio) as precio,
                    CASE
                        WHEN BOOL_AND(v.estado = 'cancelado') THEN 'cancelado'
                        WHEN BOOL_OR(v.estado = 'pagado') THEN 'pagado'
                        ELSE 'pendiente_pago'
                    END as estado,
                    MIN(v.metodo_pago) as metodo_pago,
                    MIN(v.subtipo_pago) as subtipo_pago,
                    MIN(v.cuenta_transferencia_id) as cuenta_transferencia_id,
                    MIN(ct.banco) as cuenta_transferencia_banco,
                    MIN(ct.titular) as cuenta_transferencia_titular,
                    MIN(ct.alias) as cuenta_transferencia_alias,
                    MIN(v.canal) as canal,
                    MIN(v.agente_id) as agente_id,
                    BOOL_OR(v.quiere_factura) as quiere_factura,
                    MIN(v.ruc_factura) as ruc_factura,
                    MIN(v.razon_social) as razon_social,
                    MIN(v.tipo_venta) as tipo_venta,
                    SUM(COALESCE(v.costo_delivery, 0)) as costo_delivery,
                    MIN(v.zona_delivery) as zona_delivery,
                    MIN(v.cliente_numero) as cliente_numero,
                    MIN(v.tipo_iva) as tipo_iva,
                    MIN(pr.nombre) as presentacion_nombre,
                    MIN(p.nombre) as producto_nombre,
                    MIN(m.nombre) as marca_nombre,
                    MIN(c.nombre) as cliente_nombre,
                    MIN(c.ruc) as cliente_ruc,
                    SUM(v.precio - COALESCE(pr.precio_compra, 0)) as ganancia,
                    ARRAY_AGG(v.id ORDER BY v.id) as venta_ids,
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'id', v.id,
                        'presentacion_id', v.presentacion_id,
                        'cantidad', v.cantidad,
                        'precio_unitario', v.precio,
                        'precio_total', v.precio,
                        'tipo_iva', v.tipo_iva,
                        'producto_nombre', p.nombre,
                        'presentacion_nombre', pr.nombre,
                        'marca_nombre', m.nombre,
                        'precio_compra', pr.precio_compra
                    ) ORDER BY v.id) FILTER (WHERE v.presentacion_id IS NOT NULL) as items_heredados
                FROM ventas v
                LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
                LEFT JOIN productos p ON pr.producto_id = p.id
                LEFT JOIN marcas m ON p.marca_id = m.id
                LEFT JOIN clientes c ON v.cliente_id = c.id
                LEFT JOIN cuentas_transferencia ct ON v.cuenta_transferencia_id = ct.id
                WHERE ${where}
                GROUP BY COALESCE(v.numero_factura, v.id::text)
                ORDER BY MIN(v.created_at) DESC
                LIMIT $${i} OFFSET $${i + 1}
            )`

        const selectConItems = cteGrupos + `
            SELECT g.id, g.numero_factura, g.created_at, g.cliente_id, g.precio, g.estado,
                   g.metodo_pago, g.subtipo_pago, g.cuenta_transferencia_id, g.cuenta_transferencia_banco,
                   g.cuenta_transferencia_titular, g.cuenta_transferencia_alias, g.canal, g.agente_id, g.quiere_factura,
                   g.ruc_factura, g.razon_social, g.tipo_venta, g.costo_delivery, g.zona_delivery,
                   g.cliente_numero, g.tipo_iva, g.presentacion_nombre, g.producto_nombre,
                   g.marca_nombre, g.cliente_nombre, g.cliente_ruc, g.ganancia,
                   COALESCE(
                       (SELECT JSON_AGG(JSON_BUILD_OBJECT(
                           'id', vi.id,
                           'presentacion_id', vi.presentacion_id,
                           'cantidad', vi.cantidad,
                           'precio_unitario', vi.precio_unitario,
                           'precio_total', vi.precio_total,
                           'tipo_iva', vi.tipo_iva,
                           'es_precio_especial', vi.es_precio_especial,
                           'diferencial_precio', vi.diferencial_precio,
                           'producto_nombre', p2.nombre,
                           'presentacion_nombre', pr2.nombre,
                           'marca_nombre', m2.nombre,
                           'precio_compra', pr2.precio_compra
                       ) ORDER BY vi.id)
                       FROM ventas_items vi
                       JOIN presentaciones pr2 ON vi.presentacion_id = pr2.id
                       JOIN productos p2 ON pr2.producto_id = p2.id
                       LEFT JOIN marcas m2 ON p2.marca_id = m2.id
                       WHERE vi.venta_id = ANY(g.venta_ids)),
                       g.items_heredados
                   ) as items
            FROM grupos g`

        const selectSinItems = cteGrupos + `
            SELECT g.id, g.numero_factura, g.created_at, g.cliente_id, g.precio, g.estado,
                   g.metodo_pago, g.subtipo_pago, g.cuenta_transferencia_id, g.cuenta_transferencia_banco,
                   g.cuenta_transferencia_titular, g.cuenta_transferencia_alias, g.canal, g.agente_id, g.quiere_factura,
                   g.ruc_factura, g.razon_social, g.tipo_venta, g.costo_delivery, g.zona_delivery,
                   g.cliente_numero, g.tipo_iva, g.presentacion_nombre, g.producto_nombre,
                   g.marca_nombre, g.cliente_nombre, g.cliente_ruc, g.ganancia,
                   g.items_heredados as items
            FROM grupos g`

        let ventas
        try {
            ventas = await db.query(selectConItems, [...valores, parseInt(por_pagina), offset])
        } catch (err) {
            // 42P01 = tabla ventas_items no existe aún, 42703 = columna nueva (es_precio_especial/diferencial_precio) no existe aún
            if (err.code === '42P01' || err.code === '42703') {
                ventas = await db.query(selectSinItems, [...valores, parseInt(por_pagina), offset])
            } else {
                throw err
            }
        }

        const resumenDia = await db.query(
            `SELECT COUNT(DISTINCT COALESCE(v.numero_factura, v.id::text)) as cantidad,
                    COALESCE(SUM(v.precio), 0) as total,
                    COALESCE(SUM(v.precio - COALESCE(pr.precio_compra, 0)), 0) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             WHERE v.created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion' AND v.estado != 'cancelado'`
        )

        const resumenSemana = await db.query(
            `SELECT COUNT(DISTINCT COALESCE(v.numero_factura, v.id::text)) as cantidad,
                    COALESCE(SUM(v.precio), 0) as total
             FROM ventas v
             WHERE v.created_at >= DATE_TRUNC('week', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion' AND v.estado != 'cancelado'`
        )

        const resumenMes = await db.query(
            `SELECT COUNT(DISTINCT COALESCE(v.numero_factura, v.id::text)) as cantidad,
                    COALESCE(SUM(v.precio), 0) as total
             FROM ventas v
             WHERE v.created_at >= DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Asuncion') AT TIME ZONE 'America/Asuncion' AND v.estado != 'cancelado'`
        )

        res.json({
            ventas: ventas.rows,
            paginacion: {
                total: parseInt(total.rows[0].total),
                pagina: parseInt(pagina),
                por_pagina: parseInt(por_pagina),
                total_paginas: Math.ceil(parseInt(total.rows[0].total) / parseInt(por_pagina))
            },
            resumen: {
                dia: resumenDia.rows[0],
                semana: resumenSemana.rows[0],
                mes: resumenMes.rows[0]
            }
        })

    } catch (error) {
    manejarError(res, error)
}
})

// Libro de ventas (SET)
router.get('/libro-ventas', autenticar, verificarPermiso('ventas', 'ver'), async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query

        if (!fecha_desde || !fecha_hasta) {
            return res.status(400).json({ error: 'Fecha desde y hasta son requeridas' })
        }

        const resultado = await db.query(
            `SELECT
                DATE(v.created_at AT TIME ZONE 'America/Asuncion') as fecha,
                v.id,
                CASE WHEN v.numero_factura LIKE 'TICKET-%' THEN NULL ELSE v.numero_factura END as numero_factura,
                v.tipo_iva,
                v.precio as total,
                v.estado,
                CASE WHEN v.numero_factura LIKE 'TICKET-%' THEN NULL ELSE v.ruc_factura END as ruc_factura,
                CASE WHEN v.numero_factura LIKE 'TICKET-%' THEN NULL ELSE v.razon_social END as razon_social,
                (v.numero_factura LIKE 'TICKET-%') as es_ticket,
                c.nombre as cliente_nombre,
                c.ruc as cliente_ruc
             FROM ventas v
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE v.created_at >= $1
             AND v.created_at <= $2
             ORDER BY v.created_at ASC`,
            [fecha_desde, fecha_hasta + 'T23:59:59']
        )

        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// 4. Reporte para exportar — ANTES de /:id
router.get('/reporte/exportar', autenticar, verificarPermiso('ventas', 'ver'), async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta, canal } = req.query

        if (!fecha_desde || !fecha_hasta) {
            return res.status(400).json({ error: 'Fecha desde y hasta son requeridas' })
        }

        let condiciones = [
            `v.created_at >= $1`,
            `v.created_at < $2`,
            `v.estado != 'cancelado'`
        ]
        let valores = [fecha_desde, fecha_hasta]
        let i = 3

        if (canal) {
            condiciones.push(`v.canal = $${i}`)
            valores.push(canal)
            i++
        }

        const where = condiciones.join(' AND ')

        // Se agrupa por numero_factura (o por id si la venta no tiene factura/es ticket)
        // para que cada comprobante aparezca en una sola linea, sumando todos sus
        // productos, en vez de una linea por cada producto vendido.
        const resultado = await db.query(
            `SELECT
                MIN(x.numero_factura) as numero_factura,
                MIN(x.fecha) as fecha,
                MIN(x.cliente) as cliente,
                MIN(x.ruc) as ruc,
                MIN(x.telefono) as telefono,
                STRING_AGG(DISTINCT x.marca, ', ') as marca,
                STRING_AGG(x.producto || ' (' || x.presentacion || ') x' || x.cantidad, '; ' ORDER BY x.producto || ' (' || x.presentacion || ') x' || x.cantidad) as producto,
                SUM(x.cantidad) as cantidad,
                SUM(x.monto) as monto,
                SUM(x.iva_linea) as iva,
                MIN(x.canal) as canal,
                MIN(x.metodo_pago) as metodo_pago,
                CASE
                    WHEN BOOL_AND(x.estado = 'cancelado') THEN 'cancelado'
                    WHEN BOOL_OR(x.estado = 'pagado') THEN 'pagado'
                    ELSE 'pendiente_pago'
                END as estado
             FROM (
                SELECT
                    COALESCE(v.numero_factura, v.id::text) as grupo,
                    v.numero_factura,
                    DATE(v.created_at) as fecha,
                    COALESCE(c.nombre, v.razon_social, 'Consumidor final') as cliente,
                    COALESCE(c.ruc, v.ruc_factura, '') as ruc,
                    COALESCE(c.telefono, v.cliente_numero, '') as telefono,
                    m.nombre as marca,
                    p.nombre as producto,
                    pr.nombre as presentacion,
                    v.cantidad,
                    v.precio as monto,
                    CASE v.tipo_iva
                        WHEN '5' THEN FLOOR(v.precio::numeric / 21)
                        WHEN 'exento' THEN 0
                        ELSE FLOOR(v.precio::numeric / 11)
                    END as iva_linea,
                    v.canal,
                    v.metodo_pago,
                    v.estado
                 FROM ventas v
                 LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
                 LEFT JOIN productos p ON pr.producto_id = p.id
                 LEFT JOIN marcas m ON p.marca_id = m.id
                 LEFT JOIN clientes c ON v.cliente_id = c.id
                 WHERE ${where}
             ) x
             GROUP BY x.grupo
             ORDER BY MIN(x.fecha) ASC`,
            valores
        )

        res.json(resultado.rows)
    } catch (error) {
    manejarError(res, error)
}
})

// 5. Ver una venta específica
router.get('/:id', autenticar, verificarPermiso('ventas', 'editar'), async (req, res) => {
    try {
        const { id } = req.params
        const resultado = await db.query(
            `SELECT v.*,
                    pr.nombre as presentacion_nombre,
                    pr.precio_compra,
                    p.nombre as producto_nombre,
                    c.nombre as cliente_nombre,
                    (v.precio - COALESCE(pr.precio_compra, 0)) as ganancia
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE v.id = $1`,
            [parseInt(id)]
        )
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Venta no encontrada' })
        }
        res.json(resultado.rows[0])
    } catch (error) {
    manejarError(res, error)
}
})

// 6. Actualizar estado de una venta (actualiza todas las lineas del mismo numero_factura)
router.patch('/:id/estado', autenticar, verificarPermiso('ventas', 'editar'), validarId, validarEstado, async (req, res) => {
    try {
        const { id } = req.params
        const { estado, agente_id } = req.body

        const ventaRef = await db.query(`SELECT numero_factura FROM ventas WHERE id = $1`, [parseInt(id)])
        if (!ventaRef.rows.length) return res.status(404).json({ error: 'Venta no encontrada' })

        const { numero_factura } = ventaRef.rows[0]

        const anterior = numero_factura
            ? await db.query(`SELECT id, estado FROM ventas WHERE numero_factura = $1`, [numero_factura])
            : await db.query(`SELECT id, estado FROM ventas WHERE id = $1`, [parseInt(id)])

        const resultado = numero_factura
            ? await db.query(
                `UPDATE ventas SET estado = $1, agente_id = $2 WHERE numero_factura = $3 RETURNING *`,
                [estado, agente_id, numero_factura]
              )
            : await db.query(
                `UPDATE ventas SET estado = $1, agente_id = $2 WHERE id = $3 RETURNING *`,
                [estado, agente_id, parseInt(id)]
              )

        if (!resultado.rows.length) return res.status(404).json({ error: 'Venta no encontrada' })

        registrarLog({
            usuario_id: req.usuario?.id || null,
            usuario_nombre: req.usuario?.nombre || 'Sistema',
            accion: 'editar',
            modulo: 'ventas',
            entidad: 'venta',
            entidad_id: parseInt(id),
            descripcion: `Estado${numero_factura ? ` de factura ${numero_factura}` : ''} cambiado de ${anterior.rows[0]?.estado ?? '?'} a ${estado} (${resultado.rows.length} linea/s)`,
            dato_anterior: { estado: anterior.rows[0]?.estado ?? null, lineas: anterior.rows.map(r => ({ id: r.id, estado: r.estado })) },
            dato_nuevo: { estado },
            ip: req.ip
        }).catch(() => {})

        res.json({ ok: true, venta: resultado.rows[0] })
    } catch (error) {
        manejarError(res, error)
    }
})

// 6b. Actualizar método de pago (actualiza todas las líneas del mismo numero_factura)
router.patch('/:id/metodo-pago', autenticar, verificarPermiso('ventas', 'editar'), validarId, async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { id } = req.params
        const { metodo_pago, cuenta_transferencia_id, subtipo_pago } = req.body

        const metodos = ['efectivo', 'tarjeta', 'transferencia']
        if (!metodo_pago || !metodos.includes(metodo_pago)) {
            return res.status(400).json({ error: 'Método de pago inválido' })
        }
        if (subtipo_pago && !['debito', 'credito'].includes(subtipo_pago)) {
            return res.status(400).json({ error: 'Subtipo de pago inválido' })
        }

        // La cuenta solo tiene sentido si el metodo es transferencia; el subtipo (debito/credito) solo si es tarjeta
        const cuentaId = metodo_pago === 'transferencia' && cuenta_transferencia_id ? parseInt(cuenta_transferencia_id) : null
        const subtipo = metodo_pago === 'tarjeta' ? (subtipo_pago || null) : null

        await client.query('BEGIN')

        const ventaRef = await client.query(`SELECT numero_factura, estado FROM ventas WHERE id = $1 FOR UPDATE`, [parseInt(id)])
        if (!ventaRef.rows.length) {
            await client.query('ROLLBACK')
            return res.status(404).json({ error: 'Venta no encontrada' })
        }

        const { numero_factura, estado } = ventaRef.rows[0]
        if (estado === 'cancelado') {
            await client.query('ROLLBACK')
            return res.status(400).json({ error: 'No se puede modificar una venta anulada' })
        }

        const resultado = numero_factura
            ? await client.query(
                `UPDATE ventas SET metodo_pago = $1, cuenta_transferencia_id = $2, subtipo_pago = $3 WHERE numero_factura = $4 RETURNING *`,
                [metodo_pago, cuentaId, subtipo, numero_factura]
              )
            : await client.query(
                `UPDATE ventas SET metodo_pago = $1, cuenta_transferencia_id = $2, subtipo_pago = $3 WHERE id = $4 RETURNING *`,
                [metodo_pago, cuentaId, subtipo, parseInt(id)]
              )

        if (!resultado.rows.length) {
            await client.query('ROLLBACK')
            return res.status(404).json({ error: 'Venta no encontrada' })
        }

        await client.query('COMMIT')

        registrarLog({
            usuario_id: req.usuario?.id || null,
            usuario_nombre: req.usuario?.nombre || 'Sistema',
            accion: 'editar',
            modulo: 'ventas',
            entidad: 'venta',
            entidad_id: parseInt(id),
            descripcion: `Método de pago${numero_factura ? ` de factura ${numero_factura}` : ''} cambiado a ${metodo_pago} (${resultado.rows.length} linea/s)`,
            dato_nuevo: { metodo_pago, cuenta_transferencia_id: cuentaId },
            ip: req.ip
        }).catch(() => {})

        res.json({ ok: true, venta: resultado.rows[0] })
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        manejarError(res, error)
    } finally {
        client.release()
    }
})

// 7. Anular venta — anula todas las lineas del mismo numero_factura y devuelve stock
router.post('/:id/anular', autenticar, verificarPermiso('ventas', 'cancelar'), async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { id } = req.params

        const ventaRes = await client.query(`SELECT * FROM ventas WHERE id = $1`, [parseInt(id)])
        if (!ventaRes.rows.length) return res.status(404).json({ error: 'Venta no encontrada' })
        const venta = ventaRes.rows[0]

        if (venta.estado === 'cancelado') {
            return res.status(400).json({ error: 'La venta ya está anulada' })
        }

        // Obtener todas las filas de la misma factura (o solo esta si no tiene numero_factura)
        const filasRes = venta.numero_factura
            ? await client.query(
                `SELECT * FROM ventas WHERE numero_factura = $1 AND estado != 'cancelado'`,
                [venta.numero_factura]
              )
            : await client.query(
                `SELECT * FROM ventas WHERE id = $1 AND estado != 'cancelado'`,
                [parseInt(id)]
              )

        const filas = filasRes.rows

        await client.query('BEGIN')

        for (const fila of filas) {
            // Intentar devolver stock desde ventas_items; fallback a columna directa
            let itemsRes
            try {
                itemsRes = await client.query(
                    `SELECT presentacion_id, cantidad FROM ventas_items WHERE venta_id = $1`,
                    [fila.id]
                )
            } catch { itemsRes = { rows: [] } }

            const items = itemsRes.rows.length > 0
                ? itemsRes.rows
                : (fila.presentacion_id ? [{ presentacion_id: fila.presentacion_id, cantidad: fila.cantidad }] : [])

            for (const item of items) {
                await client.query(
                    `UPDATE presentaciones SET stock = stock + $1 WHERE id = $2`,
                    [parseCantidad(item.cantidad), parseInt(item.presentacion_id)]
                )
            }
        }

        if (venta.numero_factura) {
            await client.query(`UPDATE ventas SET estado = 'cancelado' WHERE numero_factura = $1`, [venta.numero_factura])
        } else {
            await client.query(`UPDATE ventas SET estado = 'cancelado' WHERE id = $1`, [parseInt(id)])
        }

        await client.query('COMMIT')

        registrarLog({
            usuario_id: req.usuario?.id || null,
            usuario_nombre: req.usuario?.nombre || 'Sistema',
            accion: 'cancelar',
            modulo: 'ventas',
            entidad: 'venta',
            entidad_id: parseInt(id),
            descripcion: `Factura ${venta.numero_factura || `#${id}`} anulada — stock devuelto (${filas.length} linea/s)`,
            dato_anterior: { estado: venta.estado },
            dato_nuevo: { estado: 'cancelado' },
            ip: req.ip
        }).catch(() => {})

        res.json({ ok: true })
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        manejarError(res, error)
    } finally {
        client.release()
    }
})

// 8. Registrar venta presencial (soporta multi-producto via items[])
router.post('/presencial', autenticar, verificarPermiso('ventas', 'crear'), async (req, res) => {
    const client = await db.pool.connect()
    try {
        const {
            cliente_id,
            items,            // [{presentacion_id, cantidad, precio_unitario, tipo_iva}]
            precio,           // total de la venta (sin delivery)
            metodo_pago,
            subtipo_pago,
            cuenta_transferencia_id,
            quiere_factura,
            ruc_factura,
            razon_social,
            agente_id,
            canal,
            es_de_whatsapp,
            sesion_numero,
            tipo_venta,
            plazo_dias,
            tipo_iva,
            costo_delivery,
            zona_delivery,
            numero_factura,
            // backward compat single-product
            presentacion_id,
            cantidad,
        } = req.body

        // Normalizar a array de items
        const itemsNorm = (Array.isArray(items) && items.length > 0)
            ? items
            : [{ presentacion_id: parseInt(presentacion_id), cantidad: parseCantidad(cantidad) || 1, precio_unitario: Math.round(parseFloat(precio) / (parseCantidad(cantidad) || 1)), tipo_iva: tipo_iva || '10' }]

        const canalFinal = canal || 'agente_presencial'

        // Fingerprint de contenido: mismo cliente + mismos artículos + misma cantidad + mismo método + misma modalidad
        const itemsOrdenados = [...itemsNorm]
            .sort((a, b) => parseInt(a.presentacion_id) - parseInt(b.presentacion_id))
            .map(it => `${parseInt(it.presentacion_id)}x${parseCantidad(it.cantidad)}`)
            .join(',')
        const fingerprint = `${cliente_id ?? 'anon'}-${itemsOrdenados}-${metodo_pago || ''}-${canalFinal}`

        const ventaCached = idempotenciaCache.get(fingerprint)
        if (ventaCached && Date.now() - ventaCached.ts < 60000) {
            return res.status(200).json({ ok: true, venta: ventaCached.venta, duplicado: true })
        }

        const subtotal = itemsNorm.reduce((s, it) => s + Math.round(parseInt(it.precio_unitario) * parseCantidad(it.cantidad)), 0)
        const totalPrecio = subtotal + (parseInt(costo_delivery) || 0)

        const clienteIdFinal = cliente_id || await getOCrearConsumidorFinal()

        await client.query('BEGIN')

        // Validar stock y precio de todos los items antes de insertar
        let haySpecialPrice = false
        for (const item of itemsNorm) {
            const stock = await client.query(
                `SELECT stock, nombre, precio_venta, precio_tarjeta, precio_descuento,
                        descuento_activo, descuento_desde, descuento_hasta, descuento_stock,
                        permite_fraccion
                 FROM presentaciones WHERE id = $1 FOR UPDATE`,
                [parseInt(item.presentacion_id)]
            )
            if (stock.rows.length === 0) {
                await client.query('ROLLBACK')
                return res.status(404).json({ error: `Presentación ${item.presentacion_id} no encontrada` })
            }
            const cantidadItem = parseCantidad(item.cantidad)
            if (!stock.rows[0].permite_fraccion && !Number.isInteger(cantidadItem)) {
                await client.query('ROLLBACK')
                return res.status(400).json({ error: `"${stock.rows[0].nombre}" no admite venta fraccionada` })
            }
            if (stock.rows[0].stock < cantidadItem) {
                await client.query('ROLLBACK')
                return res.status(400).json({ error: `Stock insuficiente para "${stock.rows[0].nombre}". Disponible: ${stock.rows[0].stock}` })
            }

            const precioEnviado = parseInt(item.precio_unitario)
            if (Number.isNaN(precioEnviado) || precioEnviado < 0) {
                await client.query('ROLLBACK').catch(() => {})
                return res.status(400).json({ error: `Precio invalido para "${stock.rows[0].nombre}"` })
            }

            const precioCatalogo = calcularPrecioEfectivo(stock.rows[0], metodo_pago).precio
            item.precio_unitario = precioEnviado
            item.diferencial_precio = precioCatalogo - precioEnviado
            item.es_precio_especial = item.diferencial_precio !== 0
            item.nombre = stock.rows[0].nombre
            if (item.es_precio_especial) haySpecialPrice = true
        }

        if (haySpecialPrice) {
            const puedePrecioEspecial = await usuarioTienePermiso(req.usuario, 'caja', 'precio_especial')
            if (!puedePrecioEspecial) {
                await client.query('ROLLBACK')
                return res.status(403).json({ error: 'Sin permiso para aplicar precio especial' })
            }
        }

        // Verificar duplicado en DB dentro de la transacción.
        // El FOR UPDATE del stock ya serializó los requests sobre el mismo producto,
        // así que esta query ve filas confirmadas + las bloqueadas por esta tx.
        if (itemsNorm.length === 1) {
            const dup = await client.query(
                `SELECT id FROM ventas
                 WHERE (cliente_id IS NOT DISTINCT FROM $1)
                   AND presentacion_id = $2
                   AND cantidad = $3
                   AND metodo_pago = $4
                   AND canal = $5
                   AND created_at > NOW() - INTERVAL '60 seconds'
                   AND estado != 'cancelado'
                 LIMIT 1`,
                [cliente_id || null,
                 parseInt(itemsNorm[0].presentacion_id),
                 parseCantidad(itemsNorm[0].cantidad),
                 metodo_pago,
                 canalFinal]
            )
            if (dup.rows.length > 0) {
                await client.query('ROLLBACK')
                const ventaExist = await db.query(`SELECT * FROM ventas WHERE id = $1`, [dup.rows[0].id])
                return res.status(200).json({ ok: true, venta: ventaExist.rows[0], duplicado: true })
            }
        }

        const fecha_vencimiento_credito = tipo_venta === 'credito' && plazo_dias
            ? new Date(Date.now() + parseInt(plazo_dias) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
            : null

        const estadoVenta = (tipo_venta === 'credito' || canalFinal === 'agente_delivery' || canalFinal === 'whatsapp_delivery')
            ? 'pendiente_pago'
            : 'pagado'

        // Para backward compat: si es un solo item, guardar presentacion_id en la venta header
        const ventaPresentacionId = itemsNorm.length === 1 ? parseInt(itemsNorm[0].presentacion_id) : null
        const ventaCantidad = itemsNorm.length === 1 ? parseCantidad(itemsNorm[0].cantidad) : null
        const ventaTipoIva = itemsNorm.length === 1 ? (itemsNorm[0].tipo_iva || '10') : '10'

        // Autoridad de numeracion: el backend decide, no el frontend. Si no viene
        // numero_factura (caso normal, i=0 de una venta nueva), se decide aca mismo
        // segun los datos de la venta, para que ningun frontend desactualizado
        // pueda forzar el consumo del correlativo fiscal SET.
        // Importante: tener cliente_id NO implica que quiera factura — los clientes
        // creados por el bot de WhatsApp siempre tienen cliente_id real (nunca
        // consumidor_final) pero rara vez piden factura. Solo la intencion explicita
        // (quiere_factura / ruc_factura / razon_social) consume el correlativo SET.
        // Las ventas a credito son la excepcion: quedan como deuda contra un cliente
        // identificado y siempre deben emitirse con factura real, la pida o no.
        let numeroFacturaFinal = numero_factura || null
        if (!numeroFacturaFinal) {
            const requiereFacturaReal = !!(quiere_factura || ruc_factura || razon_social || tipo_venta === 'credito')
            if (requiereFacturaReal) {
                const cfgActual = await client.query(
                    `SELECT valor FROM configuracion WHERE clave = 'factura_numero_actual' FOR UPDATE`
                )
                const numeroActual = parseInt(cfgActual.rows[0]?.valor || '1', 10)
                if (!Number.isFinite(numeroActual)) {
                    await client.query('ROLLBACK')
                    return res.status(500).json({ error: 'Contador de numeracion de factura invalido. Revisa Configuracion > Facturacion.' })
                }
                await client.query(
                    `UPDATE configuracion SET valor = $1 WHERE clave = 'factura_numero_actual'`,
                    [String(numeroActual + 1)]
                )
                const cfgPrefijo = await client.query(
                    `SELECT valor FROM configuracion WHERE clave = 'factura_numero_prefijo'`
                )
                const prefijoValor = cfgPrefijo.rows[0]?.valor || '001-002'
                numeroFacturaFinal = `${prefijoValor}-${String(numeroActual).padStart(7, '0')}`
            } else {
                numeroFacturaFinal = `TICKET-${crypto.randomUUID()}`
            }
        }

        const cuentaTransferenciaFinal = metodo_pago === 'transferencia' && cuenta_transferencia_id ? parseInt(cuenta_transferencia_id) : null

        const venta = await client.query(
            `INSERT INTO ventas (cliente_id, presentacion_id, cantidad, precio, canal, estado, metodo_pago, subtipo_pago, cuenta_transferencia_id, quiere_factura, ruc_factura, razon_social, agente_id, tipo_venta, plazo_dias, fecha_vencimiento_credito, tipo_iva, costo_delivery, zona_delivery, numero_factura)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *`,
            [clienteIdFinal, ventaPresentacionId, ventaCantidad, totalPrecio, canalFinal, estadoVenta,
            metodo_pago, subtipo_pago || null, cuentaTransferenciaFinal, quiere_factura || false, ruc_factura || null,
            razon_social || null, agente_id || null,
            tipo_venta || 'contado', plazo_dias || null, fecha_vencimiento_credito, ventaTipoIva,
            costo_delivery || 0, zona_delivery || null, numeroFacturaFinal]
        )

        const ventaId = venta.rows[0].id

        // Insertar items en ventas_items
        for (const item of itemsNorm) {
            await client.query(
                `INSERT INTO ventas_items (venta_id, presentacion_id, cantidad, precio_unitario, precio_total, tipo_iva, es_precio_especial, diferencial_precio)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [ventaId, parseInt(item.presentacion_id), parseCantidad(item.cantidad),
                 parseInt(item.precio_unitario), Math.round(parseInt(item.precio_unitario) * parseCantidad(item.cantidad)),
                 item.tipo_iva || '10', item.es_precio_especial || false, item.diferencial_precio || 0]
            )
        }

        // Descontar stock por cada item (FEFO si hay lotes)
        for (const item of itemsNorm) {
            const lotesExisten = await client.query(
                `SELECT COUNT(*) as total FROM lotes WHERE presentacion_id = $1 AND activo = true AND stock_actual > 0`,
                [parseInt(item.presentacion_id)]
            )
            if (parseInt(lotesExisten.rows[0].total) > 0) {
                await descontarStockFEFO(client, parseInt(item.presentacion_id), parseCantidad(item.cantidad))
            } else {
                await client.query(
                    `UPDATE presentaciones SET stock = stock - $1 WHERE id = $2`,
                    [parseCantidad(item.cantidad), parseInt(item.presentacion_id)]
                )
            }
        }

        if (es_de_whatsapp && sesion_numero) {
            await client.query(
                `UPDATE deliveries SET estado = 'en_camino', updated_at = NOW()
                 WHERE cliente_numero = $1
                 AND estado IN ('pendiente', 'confirmado')
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [sesion_numero]
            )
        }

        await client.query('COMMIT')

        idempotenciaCache.set(fingerprint, { venta: venta.rows[0], ts: Date.now() })
        setTimeout(() => idempotenciaCache.delete(fingerprint), 70000)

        if (clienteIdFinal) {
            recalcularStats(clienteIdFinal).catch(() => {})
        }

        const listaItems = itemsNorm.map(it => `${it.nombre || `presentación ${it.presentacion_id}`} x${it.cantidad}`).join(', ')
        const descripcion = `Venta registrada — ${listaItems} — Gs. ${totalPrecio.toLocaleString()}`

        registrarLog({
            usuario_id: req.usuario?.id || null,
            usuario_nombre: req.usuario?.nombre || 'Sistema',
            accion: 'crear',
            modulo: 'ventas',
            entidad: 'venta',
            entidad_id: ventaId,
            descripcion,
            dato_nuevo: { ...venta.rows[0], items: itemsNorm.map(it => ({ presentacion_id: it.presentacion_id, nombre: it.nombre, cantidad: it.cantidad, precio_unitario: it.precio_unitario })) },
            ip: req.ip
        }).catch(() => {})

        res.status(201).json({ ok: true, venta: venta.rows[0] })

    } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        manejarError(res, error)
    } finally {
        client.release()
    }
})

module.exports = router