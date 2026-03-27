const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')

// ─────────────────────────────────────────────
// RUTAS GENERALES (sin parámetro dinámico)
// ─────────────────────────────────────────────

router.get('/', async (req, res) => {
    try {
        const { buscar } = req.query
        let condiciones = ['p.activo = true']
        let valores = []
        let i = 1

        if (buscar) {
            condiciones.push(`(LOWER(p.nombre) ILIKE $${i} OR p.ruc ILIKE $${i})`)
            valores.push(`%${buscar.toLowerCase()}%`)
            i++
        }

        const resultado = await db.query(
            `SELECT p.*,
                COUNT(DISTINCT f.id) as total_facturas,
                COALESCE(SUM(f.monto_total), 0) as total_comprado,
                COALESCE(SUM(CASE WHEN f.estado IN ('pendiente','pagado_parcial') THEN f.saldo ELSE 0 END), 0) as deuda_total,
                COUNT(CASE WHEN f.estado IN ('pendiente','pagado_parcial') AND f.tipo = 'credito' THEN 1 END) as facturas_pendientes
             FROM proveedores p
             LEFT JOIN facturas_compra f ON f.proveedor_id = p.id AND f.activo = true
             WHERE ${condiciones.join(' AND ')}
             GROUP BY p.id
             ORDER BY p.nombre ASC`,
            valores
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

router.post('/', async (req, res) => {
    try {
        const { nombre, ruc, telefono, email, banco, numero_cuenta, direccion, notas } = req.body
        if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })

        const resultado = await db.query(
            `INSERT INTO proveedores (nombre, ruc, telefono, email, banco, numero_cuenta, direccion, notas)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [nombre, ruc||null, telefono||null, email||null, banco||null, numero_cuenta||null, direccion||null, notas||null]
        )
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// ─────────────────────────────────────────────
// FACTURAS — rutas fijas (antes de /:id)
// ─────────────────────────────────────────────

router.get('/facturas', async (req, res) => {
    try {
        const { estado, tipo, proveedor_id, fecha_desde, fecha_hasta, proximas } = req.query
        let condiciones = ['f.activo = true']
        let valores = []
        let i = 1

        if (estado) { condiciones.push(`f.estado = $${i++}`); valores.push(estado) }
        if (tipo) { condiciones.push(`f.tipo = $${i++}`); valores.push(tipo) }
        if (proveedor_id) { condiciones.push(`f.proveedor_id = $${i++}`); valores.push(proveedor_id) }
        if (fecha_desde) { condiciones.push(`f.fecha_emision >= $${i++}`); valores.push(fecha_desde) }
        if (fecha_hasta) { condiciones.push(`f.fecha_emision <= $${i++}`); valores.push(fecha_hasta) }
        if (proximas === 'true') {
            condiciones.push(`f.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '10 days'`)
        }

        const resultado = await db.query(
            `SELECT f.*, p.nombre as proveedor_nombre,
                COALESCE(json_agg(pf ORDER BY pf.created_at DESC) FILTER (WHERE pf.id IS NOT NULL), '[]') as pagos
             FROM facturas_compra f
             JOIN proveedores p ON f.proveedor_id = p.id
             LEFT JOIN pagos_facturas pf ON pf.factura_id = f.id
             WHERE ${condiciones.join(' AND ')}
             GROUP BY f.id, p.nombre
             ORDER BY f.fecha_emision DESC`,
            valores
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

router.patch('/facturas/:id', async (req, res) => {
    try {
        const { numero_factura, fecha_emision, plazo_dias, monto_total, iva_10, iva_5, exentas, notas } = req.body
        const resultado = await db.query(
            `UPDATE facturas_compra SET
                numero_factura = COALESCE($1, numero_factura),
                fecha_emision = COALESCE($2, fecha_emision),
                plazo_dias = COALESCE($3, plazo_dias),
                monto_total = COALESCE($4, monto_total),
                iva_10 = COALESCE($5, iva_10),
                iva_5 = COALESCE($6, iva_5),
                exentas = COALESCE($7, exentas),
                notas = COALESCE($8, notas),
                updated_at = NOW()
             WHERE id = $9 RETURNING *`,
            [numero_factura, fecha_emision, plazo_dias, monto_total, iva_10, iva_5, exentas, notas, req.params.id]
        )
        if (!resultado.rows.length) return res.status(404).json({ error: 'Factura no encontrada' })
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

router.post('/facturas/:id/pagos', async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { numero_recibo, monto, metodo_pago, fecha_pago, tipo_pago, notas } = req.body

        if (!monto || monto <= 0) return res.status(400).json({ error: 'Monto inválido' })
        if (!['efectivo', 'transferencia'].includes(metodo_pago)) return res.status(400).json({ error: 'Método de pago inválido' })
        if (!['parcial', 'total'].includes(tipo_pago)) return res.status(400).json({ error: 'Tipo de pago inválido' })

        await client.query('BEGIN')

        const facturaRes = await client.query(
            `SELECT * FROM facturas_compra WHERE id = $1 FOR UPDATE`, [req.params.id]
        )
        if (!facturaRes.rows.length) {
            await client.query('ROLLBACK')
            return res.status(404).json({ error: 'Factura no encontrada' })
        }

        const factura = facturaRes.rows[0]

        if (monto > factura.saldo) {
            await client.query('ROLLBACK')
            return res.status(400).json({ error: `Monto supera el saldo. Saldo actual: Gs. ${factura.saldo.toLocaleString()}` })
        }

        const pago = await client.query(
            `INSERT INTO pagos_facturas (factura_id, numero_recibo, monto, metodo_pago, fecha_pago, tipo_pago, notas)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [req.params.id, numero_recibo||null, monto, metodo_pago, fecha_pago||new Date().toISOString().slice(0,10), tipo_pago, notas||null]
        )

        const nuevoSaldo = factura.saldo - monto
        const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : 'pagado_parcial'

        await client.query(
            `UPDATE facturas_compra SET saldo = $1, estado = $2, updated_at = NOW() WHERE id = $3`,
            [nuevoSaldo, nuevoEstado, req.params.id]
        )

        await client.query('COMMIT')
        res.status(201).json({ ok: true, pago: pago.rows[0], nuevo_saldo: nuevoSaldo, nuevo_estado: nuevoEstado })
    } catch (error) {
        await client.query('ROLLBACK')
        manejarError(res, error)
    } finally {
        client.release()
    }
})

router.get('/facturas/:id/pagos', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT * FROM pagos_facturas WHERE factura_id = $1 ORDER BY created_at DESC`,
            [req.params.id]
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// ─────────────────────────────────────────────
// REPORTES (antes de /:id)
// ─────────────────────────────────────────────

router.get('/reportes/resumen', async (req, res) => {
    try {
        const { periodo = 'mes', proveedor_id, tipo, fecha_desde, fecha_hasta } = req.query

        let intervalo = '30 days'
        if (periodo === 'semana') intervalo = '7 days'
        if (periodo === 'anual') intervalo = '365 days'

        let condiciones = ['f.activo = true']
        let valores = []
        let i = 1

        if (periodo === 'personalizado' && fecha_desde && fecha_hasta) {
            condiciones.push(`f.fecha_emision >= $${i++}`)
            condiciones.push(`f.fecha_emision <= $${i++}`)
            valores.push(fecha_desde, fecha_hasta)
        } else {
            condiciones.push(`f.fecha_emision >= NOW() - INTERVAL '${intervalo}'`)
        }

        if (proveedor_id) { condiciones.push(`f.proveedor_id = $${i++}`); valores.push(proveedor_id) }
        if (tipo) { condiciones.push(`f.tipo = $${i++}`); valores.push(tipo) }

        const where = condiciones.join(' AND ')

        const resumen = await db.query(
            `SELECT
                COUNT(*) as total_facturas,
                COALESCE(SUM(f.monto_total), 0) as total_comprado,
                COALESCE(AVG(f.monto_total), 0) as promedio_factura,
                COUNT(CASE WHEN f.tipo = 'credito' THEN 1 END) as facturas_credito,
                COUNT(CASE WHEN f.tipo = 'contado' THEN 1 END) as facturas_contado,
                COALESCE(SUM(CASE WHEN f.tipo = 'credito' THEN f.monto_total ELSE 0 END), 0) as total_credito,
                COALESCE(SUM(CASE WHEN f.tipo = 'contado' THEN f.monto_total ELSE 0 END), 0) as total_contado
             FROM facturas_compra f WHERE ${where}`,
            valores
        )

        const porProveedor = await db.query(
            `SELECT
                p.id, p.nombre,
                COUNT(f.id) as cantidad,
                COALESCE(SUM(f.monto_total), 0) as total,
                COALESCE(AVG(f.monto_total), 0) as promedio,
                COALESCE(SUM(CASE WHEN f.estado IN ('pendiente','pagado_parcial') THEN f.saldo ELSE 0 END), 0) as deuda
             FROM facturas_compra f
             JOIN proveedores p ON f.proveedor_id = p.id
             WHERE ${where}
             GROUP BY p.id, p.nombre
             ORDER BY total DESC`,
            valores
        )

        const porMes = await db.query(
            `SELECT
                DATE_TRUNC('month', f.fecha_emision) as mes,
                COUNT(*) as cantidad,
                COALESCE(SUM(f.monto_total), 0) as total
             FROM facturas_compra f
             WHERE f.activo = true
             AND f.fecha_emision >= NOW() - INTERVAL '12 months'
             GROUP BY 1 ORDER BY 1 ASC`
        )

        const proximas = await db.query(
            `SELECT f.*, p.nombre as proveedor_nombre
             FROM facturas_compra f
             JOIN proveedores p ON f.proveedor_id = p.id
             WHERE f.tipo = 'credito'
             AND f.estado IN ('pendiente', 'pagado_parcial')
             AND f.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '10 days'
             AND f.activo = true
             ORDER BY f.fecha_vencimiento ASC`
        )

        const vencidas = await db.query(
            `SELECT f.*, p.nombre as proveedor_nombre,
                CURRENT_DATE - f.fecha_vencimiento as dias_vencida
             FROM facturas_compra f
             JOIN proveedores p ON f.proveedor_id = p.id
             WHERE f.tipo = 'credito'
             AND f.estado IN ('pendiente', 'pagado_parcial')
             AND f.fecha_vencimiento < CURRENT_DATE
             AND f.activo = true
             ORDER BY f.fecha_vencimiento ASC`
        )

        await db.query(
            `UPDATE facturas_compra SET estado = 'vencido'
             WHERE tipo = 'credito'
             AND estado IN ('pendiente', 'pagado_parcial')
             AND fecha_vencimiento < CURRENT_DATE
             AND activo = true`
        )

        res.json({
            resumen: resumen.rows[0],
            por_proveedor: porProveedor.rows,
            por_mes: porMes.rows,
            proximas_vencer: proximas.rows,
            vencidas: vencidas.rows
        })
    } catch (error) {
        manejarError(res, error)
    }
})

// ─────────────────────────────────────────────
// RUTAS CON PARÁMETRO DINÁMICO /:id (al final)
// ─────────────────────────────────────────────

router.get('/:id', async (req, res) => {
    try {
        const proveedor = await db.query(
            `SELECT * FROM proveedores WHERE id = $1 AND activo = true`, [req.params.id]
        )
        if (!proveedor.rows.length) return res.status(404).json({ error: 'Proveedor no encontrado' })
        res.json(proveedor.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

router.patch('/:id', async (req, res) => {
    try {
        const { nombre, ruc, telefono, email, banco, numero_cuenta, direccion, notas, activo } = req.body
        const resultado = await db.query(
            `UPDATE proveedores SET
                nombre = COALESCE($1, nombre),
                ruc = COALESCE($2, ruc),
                telefono = COALESCE($3, telefono),
                email = COALESCE($4, email),
                banco = COALESCE($5, banco),
                numero_cuenta = COALESCE($6, numero_cuenta),
                direccion = COALESCE($7, direccion),
                notas = COALESCE($8, notas),
                activo = COALESCE($9, activo),
                updated_at = NOW()
             WHERE id = $10 RETURNING *`,
            [nombre, ruc, telefono, email, banco, numero_cuenta, direccion, notas, activo, req.params.id]
        )
        if (!resultado.rows.length) return res.status(404).json({ error: 'Proveedor no encontrado' })
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

router.get('/:id/facturas', async (req, res) => {
    try {
        const { estado, tipo } = req.query
        let condiciones = ['f.proveedor_id = $1', 'f.activo = true']
        let valores = [req.params.id]
        let i = 2

        if (estado) { condiciones.push(`f.estado = $${i++}`); valores.push(estado) }
        if (tipo) { condiciones.push(`f.tipo = $${i++}`); valores.push(tipo) }

        const resultado = await db.query(
            `SELECT f.*,
                p.nombre as proveedor_nombre,
                COALESCE(
                    json_agg(pf ORDER BY pf.created_at DESC) FILTER (WHERE pf.id IS NOT NULL),
                    '[]'
                ) as pagos
             FROM facturas_compra f
             JOIN proveedores p ON f.proveedor_id = p.id
             LEFT JOIN pagos_facturas pf ON pf.factura_id = f.id
             WHERE ${condiciones.join(' AND ')}
             GROUP BY f.id, p.nombre
             ORDER BY f.fecha_emision DESC`,
            valores
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

router.post('/:id/facturas', async (req, res) => {
    try {
        const {
            numero_factura, fecha_emision, tipo, plazo_dias,
            monto_total, iva_10, iva_5, exentas,
            metodo_pago, notas
        } = req.body

        if (!numero_factura?.trim()) return res.status(400).json({ error: 'Número de factura requerido' })
        if (!fecha_emision) return res.status(400).json({ error: 'Fecha de emisión requerida' })
        if (!['contado', 'credito'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' })
        if (!monto_total || monto_total <= 0) return res.status(400).json({ error: 'Monto inválido' })
        if (tipo === 'contado' && !metodo_pago) return res.status(400).json({ error: 'Método de pago requerido para contado' })

        let fecha_vencimiento = null
        if (tipo === 'credito' && plazo_dias) {
            const fecha = new Date(fecha_emision)
            fecha.setDate(fecha.getDate() + parseInt(plazo_dias))
            fecha_vencimiento = fecha.toISOString().slice(0, 10)
        }

        const estado = tipo === 'contado' ? 'pagado' : 'pendiente'
        const saldo = tipo === 'contado' ? 0 : monto_total

        const resultado = await db.query(
            `INSERT INTO facturas_compra (
                proveedor_id, numero_factura, fecha_emision, fecha_vencimiento,
                tipo, plazo_dias, monto_total, iva_10, iva_5, exentas,
                metodo_pago, estado, saldo, notas
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
             RETURNING *`,
            [
                req.params.id, numero_factura, fecha_emision, fecha_vencimiento,
                tipo, plazo_dias||null, monto_total, iva_10||0, iva_5||0, exentas||0,
                tipo === 'contado' ? metodo_pago : null, estado, saldo, notas||null
            ]
        )
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router