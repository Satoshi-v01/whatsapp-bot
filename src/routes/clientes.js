const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { registrarLog } = require('../middleware/auditoria')

async function recalcularStats(cliente_id) {
    try {
        await db.query('SELECT recalcular_stats_cliente($1)', [cliente_id])
    } catch (err) {}
}

// 1. Buscar/listar clientes
router.get('/', async (req, res) => {
    try {
        const { buscar, tipo, origen, estado_actividad } = req.query
        let condiciones = ['c.activo = true']
        let valores = []
        let i = 1

        if (buscar) {
            condiciones.push(`(LOWER(c.nombre) ILIKE $${i} OR c.ruc ILIKE $${i} OR c.telefono ILIKE $${i})`)
            valores.push(`%${buscar.toLowerCase()}%`)
            i++
        }
        if (tipo) { condiciones.push(`c.tipo = $${i}`); valores.push(tipo); i++ }
        if (origen) { condiciones.push(`c.origen = $${i}`); valores.push(origen); i++ }
        if (estado_actividad === 'activo') {
            condiciones.push(`cs.activo = true`)
        } else if (estado_actividad === 'inactivo') {
            condiciones.push(`(cs.activo = false OR cs.activo IS NULL)`)
        }

        const resultado = await db.query(
            `SELECT c.*,
                COALESCE(cs.total_compras, 0) as total_compras,
                COALESCE(cs.monto_total, 0) as monto_total,
                cs.ultima_compra,
                cs.activo as cliente_activo,
                cs.frecuencia_dias,
                cs.proxima_compra_estimada
             FROM clientes c
             LEFT JOIN clientes_stats cs ON cs.cliente_id = c.id
             WHERE ${condiciones.join(' AND ')}
             ORDER BY c.nombre ASC`,
            valores
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// 2. Buscar cliente por teléfono (para el bot)
router.get('/telefono/:telefono', async (req, res) => {
    try {
        const { telefono } = req.params
        const resultado = await db.query(
            `SELECT * FROM clientes WHERE telefono = $1 AND activo = true`, [telefono]
        )
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' })
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 3. Ver perfil completo de un cliente
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const cliente = await db.query(
            `SELECT c.*,
                cs.activo as cliente_activo,
                cs.frecuencia_dias,
                cs.proxima_compra_estimada,
                cs.updated_at as stats_updated_at
             FROM clientes c
             LEFT JOIN clientes_stats cs ON cs.cliente_id = c.id
             WHERE c.id = $1`, [id]
        )
        if (cliente.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' })

        const ventas = await db.query(
            `SELECT v.*, pr.nombre as presentacion_nombre, p.nombre as producto_nombre, m.nombre as marca_nombre
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE v.cliente_id = $1 ORDER BY v.created_at DESC`, [id]
        )

        const estadisticas = await db.query(
            `SELECT COUNT(*) as total_compras, COALESCE(SUM(v.precio), 0) as monto_total,
                COALESCE(AVG(v.precio), 0) as ticket_promedio,
                MAX(v.created_at) as ultima_compra, MIN(v.created_at) as primera_compra
             FROM ventas v WHERE v.cliente_id = $1`, [id]
        )

        const productoFavorito = await db.query(
            `SELECT p.nombre as producto, m.nombre as marca, COUNT(*) as cantidad
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE v.cliente_id = $1
             GROUP BY p.nombre, m.nombre ORDER BY cantidad DESC LIMIT 1`, [id]
        )

        res.json({ ...cliente.rows[0], ventas: ventas.rows, estadisticas: estadisticas.rows[0], producto_favorito: productoFavorito.rows[0] || null })
    } catch (error) {
        manejarError(res, error)
    }
})

// 4. Crear cliente
router.post('/', async (req, res) => {
    try {
        const { tipo, nombre, ruc, telefono, email, direccion, ciudad, notas, origen } = req.body
        if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' })

        const resultado = await db.query(
            `INSERT INTO clientes (tipo, nombre, ruc, telefono, email, direccion, ciudad, notas, origen)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [tipo || 'persona', nombre, ruc, telefono, email, direccion, ciudad, notas, origen || 'manual']
        )
        const nuevoCliente = resultado.rows[0]
        await recalcularStats(nuevoCliente.id)

        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'clientes', entidad: 'cliente', entidad_id: nuevoCliente.id, descripcion: `Cliente creado: ${nuevoCliente.nombre}`, dato_nuevo: nuevoCliente, ip: req.ip }).catch(() => {})

        res.status(201).json(nuevoCliente)
    } catch (error) {
        manejarError(res, error)
    }
})

// 5. Editar cliente
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { tipo, nombre, ruc, telefono, email, direccion, ciudad, notas, activo } = req.body

        const anterior = await db.query(`SELECT * FROM clientes WHERE id = $1`, [id])

        const resultado = await db.query(
            `UPDATE clientes SET
                tipo = COALESCE($1, tipo), nombre = COALESCE($2, nombre),
                ruc = COALESCE($3, ruc), telefono = COALESCE($4, telefono),
                email = COALESCE($5, email), direccion = COALESCE($6, direccion),
                ciudad = COALESCE($7, ciudad), notas = COALESCE($8, notas),
                activo = COALESCE($9, activo), updated_at = NOW()
             WHERE id = $10 RETURNING *`,
            [tipo, nombre, ruc, telefono, email, direccion, ciudad, notas, activo, id]
        )
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' })

        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'clientes', entidad: 'cliente', entidad_id: parseInt(id), descripcion: `Cliente editado: ${resultado.rows[0].nombre}`, dato_anterior: anterior.rows[0], dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})

        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// 6. Buscar cliente por RUC o nombre para autocompletar
router.get('/buscar/autocomplete', async (req, res) => {
    try {
        const { q } = req.query
        if (!q || q.length < 2) return res.json([])

        const resultado = await db.query(
            `SELECT c.id, c.nombre, c.ruc, c.telefono, c.tipo, c.direccion, c.ciudad,
                    d.referencia as ultima_referencia
             FROM clientes c
             LEFT JOIN LATERAL (
                 SELECT d.referencia FROM deliveries d
                 JOIN ventas v ON d.venta_id = v.id
                 WHERE v.cliente_id = c.id AND d.referencia IS NOT NULL
                 ORDER BY d.created_at DESC LIMIT 1
             ) d ON true
             WHERE c.activo = true
             AND (LOWER(c.nombre) ILIKE $1 OR c.ruc ILIKE $1 OR c.telefono ILIKE $1)
             ORDER BY c.nombre ASC LIMIT 10`,
            [`%${q.toLowerCase()}%`]
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Cuenta corriente — ventas a crédito pendientes de un cliente
router.get('/:id/cuenta-corriente', async (req, res) => {
    try {
        const { id } = req.params

        const ventas = await db.query(
            `SELECT v.*,
                pr.nombre as presentacion_nombre,
                p.nombre as producto_nombre,
                m.nombre as marca_nombre,
                COALESCE(
                    json_agg(pcc ORDER BY pcc.created_at DESC) FILTER (WHERE pcc.id IS NOT NULL),
                    '[]'
                ) as pagos,
                v.precio - COALESCE(SUM(pcc.monto), 0) as saldo
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             LEFT JOIN pagos_cuenta_corriente pcc ON pcc.venta_id = v.id
             WHERE v.cliente_id = $1
             AND v.tipo_venta = 'credito'
             AND v.estado != 'cancelado'
             GROUP BY v.id, pr.nombre, p.nombre, m.nombre
             ORDER BY v.created_at DESC`,
            [id]
        )

        const resumen = await db.query(
            `SELECT
                COUNT(*) as total_creditos,
                COALESCE(SUM(v.precio), 0) as total_facturado,
                COALESCE(SUM(v.precio) - COALESCE(SUM(pcc.monto), 0), 0) as deuda_total
             FROM ventas v
             LEFT JOIN pagos_cuenta_corriente pcc ON pcc.venta_id = v.id
             WHERE v.cliente_id = $1
             AND v.tipo_venta = 'credito'
             AND v.estado != 'cancelado'`,
            [id]
        )

        res.json({ ventas: ventas.rows, resumen: resumen.rows[0] })
    } catch (error) {
        manejarError(res, error)
    }
})

// Registrar pago cuenta corriente
router.post('/:id/cuenta-corriente/pagos', async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { id } = req.params
        const { venta_id, numero_recibo, monto, metodo_pago, fecha_pago, tipo_pago, notas } = req.body

        if (!venta_id) return res.status(400).json({ error: 'venta_id requerido' })
        if (!monto || monto <= 0) return res.status(400).json({ error: 'Monto inválido' })
        if (!['efectivo', 'transferencia'].includes(metodo_pago)) return res.status(400).json({ error: 'Método de pago inválido' })
        if (!['parcial', 'total'].includes(tipo_pago)) return res.status(400).json({ error: 'Tipo de pago inválido' })

        await client.query('BEGIN')

        // Verificar saldo disponible
        const saldoRes = await client.query(
            `SELECT v.precio - COALESCE(SUM(pcc.monto), 0) as saldo
             FROM ventas v
             LEFT JOIN pagos_cuenta_corriente pcc ON pcc.venta_id = v.id
             WHERE v.id = $1
             GROUP BY v.precio`,
            [venta_id]
        )

        const saldo = parseInt(saldoRes.rows[0]?.saldo || 0)
        if (monto > saldo) {
            await client.query('ROLLBACK')
            return res.status(400).json({ error: `Monto supera el saldo. Saldo: Gs. ${saldo.toLocaleString()}` })
        }

        const pago = await client.query(
            `INSERT INTO pagos_cuenta_corriente (venta_id, cliente_id, numero_recibo, monto, metodo_pago, fecha_pago, tipo_pago, notas)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [venta_id, id, numero_recibo || null, monto, metodo_pago, fecha_pago || new Date().toISOString().slice(0, 10), tipo_pago, notas || null]
        )

        // Si es pago total o saldo queda en 0, marcar venta como pagada
        const nuevoSaldo = saldo - monto
        if (nuevoSaldo <= 0) {
            await client.query(
                `UPDATE ventas SET estado = 'pagado' WHERE id = $1`,
                [venta_id]
            )
        }

        await client.query('COMMIT')

        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'clientes', entidad: 'pago_credito', entidad_id: pago.rows[0].id, descripcion: `Pago cuenta corriente: cliente #${id} — Gs. ${monto.toLocaleString()} — Saldo restante: Gs. ${nuevoSaldo.toLocaleString()}`, dato_nuevo: pago.rows[0], ip: req.ip }).catch(() => {})

        res.status(201).json({ ok: true, pago: pago.rows[0], nuevo_saldo: nuevoSaldo })
    } catch (error) {
        await client.query('ROLLBACK')
        manejarError(res, error)
    } finally {
        client.release()
    }
})

module.exports = router
module.exports.recalcularStats = recalcularStats