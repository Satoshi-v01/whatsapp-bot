const jwt = require('jsonwebtoken')
const db = require('../db/index')

function autenticar(req, res, next) {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token requerido' })
    }

    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.usuario = decoded
        next()
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' })
    }
}

// Middleware de permisos — uso: verificarPermiso('ventas', 'crear')
function verificarPermiso(modulo, accion) {
    return async (req, res, next) => {
        try {
            // Si no hay usuario autenticado
            if (!req.usuario) {
                return res.status(401).json({ error: 'No autenticado' })
            }

            // El rol admin siempre pasa
            if (req.usuario.rol === 'admin' || req.usuario.rol_nombre === 'admin') {
                return next()
            }

            // Obtener permisos del rol del usuario
            const resultado = await db.query(
                `SELECT r.permisos FROM roles r
                 JOIN usuarios u ON u.rol_id = r.id
                 WHERE u.id = $1`,
                [req.usuario.id]
            )

            if (!resultado.rows.length) {
                return res.status(403).json({ error: 'Sin rol asignado' })
            }

            const permisos = resultado.rows[0].permisos || {}
            const accionesModulo = permisos[modulo] || []

            if (!accionesModulo.includes(accion)) {
                return res.status(403).json({
                    error: `Sin permiso para ${accion} en ${modulo}`
                })
            }

            next()
        } catch (error) {
            res.status(500).json({ error: 'Error verificando permisos' })
        }
    }
}

module.exports = { autenticar, verificarPermiso }