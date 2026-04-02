const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { soloAdmin } = require('../middleware/auth')

router.get('/', soloAdmin, async (req, res) => {
    try {
        const {
            usuario_id, modulo, accion,
            fecha_desde, fecha_hasta,
            periodo = 'hoy',
            pagina = 1,
        } = req.query
        const por_pagina = Math.min(parseInt(req.query.por_pagina) || 50, 200)

        const offset = (parseInt(pagina) - 1) * parseInt(por_pagina)
        let condiciones = ['1=1']
        let valores = []
        let i = 1

        if (periodo === 'hoy') {
            condiciones.push(`DATE(l.created_at AT TIME ZONE 'America/Asuncion') = CURRENT_DATE`)
        } else if (periodo === 'semana') {
            condiciones.push(`l.created_at >= DATE_TRUNC('week', NOW())`)
        } else if (periodo === 'mes') {
            condiciones.push(`l.created_at >= DATE_TRUNC('month', NOW())`)
        } else if (periodo === 'personalizado' && fecha_desde && fecha_hasta) {
            condiciones.push(`l.created_at >= $${i++}`)
            condiciones.push(`l.created_at <= $${i++}`)
            valores.push(fecha_desde, fecha_hasta + 'T23:59:59')
        }

        if (usuario_id) { condiciones.push(`l.usuario_id = $${i++}`); valores.push(usuario_id) }
        if (modulo) { condiciones.push(`l.modulo = $${i++}`); valores.push(modulo) }
        if (accion) { condiciones.push(`l.accion = $${i++}`); valores.push(accion) }

        const where = condiciones.join(' AND ')

        const total = await db.query(
            `SELECT COUNT(*) as total FROM logs_auditoria l WHERE ${where}`,
            valores
        )

        const logs = await db.query(
            `SELECT l.* FROM logs_auditoria l
             WHERE ${where}
             ORDER BY l.created_at DESC
             LIMIT $${i} OFFSET $${i + 1}`,
            [...valores, parseInt(por_pagina), offset]
        )

        // Módulos y usuarios disponibles para filtros
        const modulosDisponibles = await db.query(
            `SELECT DISTINCT modulo FROM logs_auditoria ORDER BY modulo ASC`
        )
        const accionesDisponibles = await db.query(
            `SELECT DISTINCT accion FROM logs_auditoria ORDER BY accion ASC`
        )
        const usuariosDisponibles = await db.query(
            `SELECT DISTINCT usuario_id, usuario_nombre FROM logs_auditoria 
             WHERE usuario_id IS NOT NULL ORDER BY usuario_nombre ASC`
        )

        res.json({
            logs: logs.rows,
            paginacion: {
                total: parseInt(total.rows[0].total),
                pagina: parseInt(pagina),
                por_pagina: parseInt(por_pagina),
                total_paginas: Math.ceil(parseInt(total.rows[0].total) / parseInt(por_pagina))
            },
            filtros_disponibles: {
                modulos: modulosDisponibles.rows.map(r => r.modulo),
                acciones: accionesDisponibles.rows.map(r => r.accion),
                usuarios: usuariosDisponibles.rows
            }
        })
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router