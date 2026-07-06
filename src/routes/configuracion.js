const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { soloAdmin, verificarPermiso } = require('../middleware/auth')
const { registrarLog } = require('../middleware/auditoria')

// Obtener toda la configuración
router.get('/', async (req, res) => {
    try {
        const resultado = await db.query(`SELECT clave, valor FROM configuracion ORDER BY clave ASC`)
        const config = {}
        resultado.rows.forEach(row => { config[row.clave] = row.valor })
        res.json(config)
    } catch (error) {
        manejarError(res, error)
    }
})

// Actualizar una clave
router.patch('/:clave', soloAdmin, async (req, res) => {
    try {
        const { clave } = req.params
        const { valor } = req.body

        const anterior = await db.query(`SELECT valor FROM configuracion WHERE clave = $1`, [clave])

        const resultado = await db.query(
            `INSERT INTO configuracion (clave, valor, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (clave) DO UPDATE SET valor = $2, updated_at = NOW()
             RETURNING *`,
            [clave, valor]
        )
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'sistema', entidad: 'configuracion', descripcion: `Configuración "${clave}" actualizada`, dato_anterior: { clave, valor: anterior.rows[0]?.valor ?? null }, dato_nuevo: { clave, valor }, ip: req.ip }).catch(() => {})
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Actualizar múltiples claves a la vez
router.post('/bulk', soloAdmin, async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { configuraciones } = req.body
        if (!configuraciones || typeof configuraciones !== 'object') {
            return res.status(400).json({ error: 'Datos inválidos' })
        }

        const claves = Object.keys(configuraciones)
        const anterioresRes = await client.query(`SELECT clave, valor FROM configuracion WHERE clave = ANY($1)`, [claves])
        const anteriores = {}
        anterioresRes.rows.forEach(r => { anteriores[r.clave] = r.valor })

        await client.query('BEGIN')
        for (const [clave, valor] of Object.entries(configuraciones)) {
            await client.query(
                `INSERT INTO configuracion (clave, valor, updated_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (clave) DO UPDATE SET valor = $2, updated_at = NOW()`,
                [clave, String(valor)]
            )
        }
        await client.query('COMMIT')
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'sistema', entidad: 'configuracion', descripcion: `Configuración actualizada en lote: ${claves.join(', ')}`, dato_anterior: anteriores, dato_nuevo: configuraciones, ip: req.ip }).catch(() => {})
        res.json({ ok: true })
    } catch (error) {
        await client.query('ROLLBACK')
        manejarError(res, error)
    } finally {
        client.release()
    }
})

// Obtener y incrementar número de factura (atómico)
router.post('/factura/siguiente-numero', verificarPermiso('ventas', 'crear'), async (req, res) => {
    const client = await db.pool.connect()
    try {
        await client.query('BEGIN')
        
        // Obtener número actual con lock
        const resultado = await client.query(
            `SELECT valor FROM configuracion WHERE clave = 'factura_numero_actual' FOR UPDATE`
        )
        
        const numeroActual = parseInt(resultado.rows[0]?.valor || '1')
        
        // Incrementar
        await client.query(
            `UPDATE configuracion SET valor = $1 WHERE clave = 'factura_numero_actual'`,
            [String(numeroActual + 1)]
        )
        
        await client.query('COMMIT')
        
        // Obtener prefijo
        const prefijo = await client.query(
            `SELECT valor FROM configuracion WHERE clave = 'factura_numero_prefijo'`
        )
        
        const prefijoValor = prefijo.rows[0]?.valor || '001-002'
        const numeroFormateado = String(numeroActual).padStart(7, '0')
        
        res.json({ 
            numero: numeroActual,
            numero_formateado: `${prefijoValor}-${numeroFormateado}`
        })
    } catch (error) {
        await client.query('ROLLBACK')
        manejarError(res, error)
    } finally {
        client.release()
    }
})

// Obtener config de facturación completa
router.get('/factura', async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT clave, valor FROM configuracion 
             WHERE clave LIKE 'factura_%'`
        )
        
        const config = {}
        resultado.rows.forEach(r => {
            config[r.clave.replace('factura_', '')] = r.valor
        })
        
        res.json(config)
    } catch (error) {
        manejarError(res, error)
    }
})

// Reiniciar número de factura (solo para pruebas)
router.post('/factura/reiniciar-numero', soloAdmin, async (req, res) => {
    try {
        const { numero = 1 } = req.body
        const anterior = await db.query(`SELECT valor FROM configuracion WHERE clave = 'factura_numero_actual'`)
        await db.query(
            `UPDATE configuracion SET valor = $1 WHERE clave = 'factura_numero_actual'`,
            [String(numero)]
        )
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'sistema', entidad: 'facturacion', descripcion: `Número de factura reiniciado: ${anterior.rows[0]?.valor ?? '?'} → ${numero}`, dato_anterior: { factura_numero_actual: anterior.rows[0]?.valor ?? null }, dato_nuevo: { factura_numero_actual: numero }, ip: req.ip }).catch(() => {})
        res.json({ ok: true, numero_reiniciado: numero })
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router