const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { registrarLog } = require('../middleware/auditoria')

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' })
        }

        const resultado = await db.query(
            `SELECT u.*, r.permisos as rol_permisos, r.nombre as rol_nombre
             FROM usuarios u
             LEFT JOIN roles r ON u.rol_id = r.id
             WHERE u.email = $1 AND u.disponible = true`,
            [email]
        )

        if (resultado.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' })
        }

        const usuario = resultado.rows[0]

        const passwordValida = await bcrypt.compare(password, usuario.password_hash)
        if (!passwordValida) {
            return res.status(401).json({ error: 'Credenciales incorrectas' })
        }

        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        )
     
        res.json({
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol,
                rol_nombre: usuario.rol_nombre,
                permisos: usuario.rol_permisos || {}
            }
        })

        
        registrarLog({
            usuario_id: usuario.id,
            usuario_nombre: usuario.nombre,
            accion: 'login',
            modulo: 'sistema',
            entidad: 'usuario',
            entidad_id: usuario.id,
            descripcion: `Inicio de sesión: ${usuario.email}`,
            ip: req.ip
        }).catch(() => {})

    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router