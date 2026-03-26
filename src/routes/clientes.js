const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')

// Función interna para recalcular stats de un cliente
async function recalcularStats(cliente_id) {
    try {
        await db.query('SELECT recalcular_stats_cliente($1)', [cliente_id])
    } catch (err) {
        // Silencioso — no rompe el flujo principal
    }
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

        if (tipo) {
            condiciones.push(`c.tipo = $${i}`)
            valores.push(tipo)
            i++
        }

        if (origen) {
            condiciones.push(`c.origen = $${i}`)
            valores.push(origen)
            i++
        }

        // Filtro activo/inactivo desde clientes_stats
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
            `SELECT * FROM clientes WHERE telefono = $1 AND activo = true`,
            [telefono]
        )
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' })
        }
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
             WHERE c.id = $1`,
            [id]
        )

        if (cliente.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' })
        }

        const ventas = await db.query(
            `SELECT v.*,
                    pr.nombre as presentacion_nombre,
                    p.nombre as producto_nombre,
                    m.nombre as marca_nombre
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE v.cliente_id = $1
             ORDER BY v.created_at DESC`,
            [id]
        )

        const estadisticas = await db.query(
            `SELECT
                COUNT(*) as total_compras,
                COALESCE(SUM(v.precio), 0) as monto_total,
                COALESCE(AVG(v.precio), 0) as ticket_promedio,
                MAX(v.created_at) as ultima_compra,
                MIN(v.created_at) as primera_compra
             FROM ventas v
             WHERE v.cliente_id = $1`,
            [id]
        )

        const productoFavorito = await db.query(
            `SELECT p.nombre as producto, m.nombre as marca, COUNT(*) as cantidad
             FROM ventas v
             LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
             LEFT JOIN productos p ON pr.producto_id = p.id
             LEFT JOIN marcas m ON p.marca_id = m.id
             WHERE v.cliente_id = $1
             GROUP BY p.nombre, m.nombre
             ORDER BY cantidad DESC
             LIMIT 1`,
            [id]
        )

        res.json({
            ...cliente.rows[0],
            ventas: ventas.rows,
            estadisticas: estadisticas.rows[0],
            producto_favorito: productoFavorito.rows[0] || null
        })
    } catch (error) {
        manejarError(res, error)
    }
})

// 4. Crear cliente
router.post('/', async (req, res) => {
    try {
        const { tipo, nombre, ruc, telefono, email, direccion, ciudad, notas, origen } = req.body

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es requerido' })
        }

        const resultado = await db.query(
            `INSERT INTO clientes (tipo, nombre, ruc, telefono, email, direccion, ciudad, notas, origen)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [tipo || 'persona', nombre, ruc, telefono, email, direccion, ciudad, notas, origen || 'manual']
        )

        // Inicializar stats vacías para el nuevo cliente
        const nuevoCliente = resultado.rows[0]
        await recalcularStats(nuevoCliente.id)

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

        const resultado = await db.query(
            `UPDATE clientes
             SET tipo = COALESCE($1, tipo),
                 nombre = COALESCE($2, nombre),
                 ruc = COALESCE($3, ruc),
                 telefono = COALESCE($4, telefono),
                 email = COALESCE($5, email),
                 direccion = COALESCE($6, direccion),
                 ciudad = COALESCE($7, ciudad),
                 notas = COALESCE($8, notas),
                 activo = COALESCE($9, activo),
                 updated_at = NOW()
             WHERE id = $10
             RETURNING *`,
            [tipo, nombre, ruc, telefono, email, direccion, ciudad, notas, activo, id]
        )

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' })
        }

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
                 SELECT d.referencia
                 FROM deliveries d
                 JOIN ventas v ON d.venta_id = v.id
                 WHERE v.cliente_id = c.id
                 AND d.referencia IS NOT NULL
                 ORDER BY d.created_at DESC
                 LIMIT 1
             ) d ON true
             WHERE c.activo = true
             AND (LOWER(c.nombre) ILIKE $1 OR c.ruc ILIKE $1 OR c.telefono ILIKE $1)
             ORDER BY c.nombre ASC
             LIMIT 10`,
            [`%${q.toLowerCase()}%`]
        )

        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router

module.exports.recalcularStats = recalcularStats