const express = require('express')
const router = express.Router()
const db = require('../db/index')
const bcrypt = require('bcrypt')
const { manejarError } = require('../middleware/validar')
const { soloAdmin, verificarPermiso } = require('../middleware/auth')
const { registrarLog } = require('../middleware/auditoria')

// Listar usuarios
router.get('/', soloAdmin, async (req, res) => {
    try {
        const resultado = await db.query(
           `SELECT u.id, u.nombre, u.email, u.rol, u.disponible,
                    r.nombre as rol_nombre, r.permisos
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            ORDER BY u.id DESC`
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Listar repartidores disponibles (para asignacion en Delivery)
router.get('/repartidores', verificarPermiso('delivery', 'ver'), async (req, res) => {
    try {
        const resultado = await db.query(
           `SELECT u.id, u.nombre, u.disponible
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre ILIKE 'repartidor' AND u.disponible = true
            ORDER BY u.nombre ASC`
        )
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Listar roles
router.get('/roles', soloAdmin, async (req, res) => {
    try {
        const resultado = await db.query(`SELECT * FROM roles ORDER BY id ASC`)
        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

// Crear rol
router.post('/roles', soloAdmin, async (req, res) => {
    try {
        const { nombre, permisos } = req.body
        if (!nombre) return res.status(400).json({ error: 'Nombre del rol requerido' })

        const resultado = await db.query(
            `INSERT INTO roles (nombre, permisos) VALUES ($1, $2) RETURNING *`,
            [nombre, JSON.stringify(permisos || {})]
        )
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'sistema', entidad: 'rol', entidad_id: resultado.rows[0].id, descripcion: `Rol creado: ${resultado.rows[0].nombre}`, dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Actualizar permisos de rol
router.patch('/roles/:id', soloAdmin, async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, permisos } = req.body

        const anterior = await db.query(`SELECT * FROM roles WHERE id = $1`, [id])

        const resultado = await db.query(
            `UPDATE roles SET nombre = COALESCE($1, nombre), permisos = COALESCE($2, permisos)
             WHERE id = $3 RETURNING *`,
            [nombre, permisos ? JSON.stringify(permisos) : null, id]
        )
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'sistema', entidad: 'rol', entidad_id: parseInt(id), descripcion: `Permisos de rol modificados: ${resultado.rows[0]?.nombre}`, dato_anterior: anterior.rows[0], dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Eliminar rol
router.use('/roles/:id', soloAdmin, async (req, res, next) => {
    if (req.method !== 'DELETE') return next()
    try {
        const { id } = req.params
        const enUso = await db.query(`SELECT COUNT(*) FROM usuarios WHERE rol_id = $1`, [id])
        if (parseInt(enUso.rows[0].count) > 0) {
            return res.status(400).json({ error: 'No se puede eliminar un rol que tiene usuarios asignados' })
        }
        const anterior = await db.query(`SELECT * FROM roles WHERE id = $1`, [id])
        await db.query(`DELETE FROM roles WHERE id = $1`, [id])
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'eliminar', modulo: 'sistema', entidad: 'rol', entidad_id: parseInt(id), descripcion: `Rol eliminado: ${anterior.rows[0]?.nombre}`, dato_anterior: anterior.rows[0], ip: req.ip }).catch(() => {})
        res.json({ ok: true })
    } catch (error) {
        manejarError(res, error)
    }
})

// Crear usuario
router.post('/', soloAdmin, async (req, res) => {
    try {
        const { nombre, email, password, rol_id } = req.body
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' })
        }

        const existente = await db.query(`SELECT id FROM usuarios WHERE email = $1`, [email])
        if (existente.rows.length > 0) {
            return res.status(400).json({ error: 'Ya existe un usuario con ese email' })
        }

        const hash = await bcrypt.hash(password, 10)
        const resultado = await db.query(
            `INSERT INTO usuarios (nombre, email, password_hash, rol_id, disponible)
             VALUES ($1, $2, $3, $4, true) RETURNING id, nombre, email, rol_id`,
            [nombre, email, hash, rol_id || null]
        )
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'crear', modulo: 'sistema', entidad: 'usuario', entidad_id: resultado.rows[0].id, descripcion: `Usuario creado: ${resultado.rows[0].nombre} (${resultado.rows[0].email})`, dato_nuevo: resultado.rows[0], ip: req.ip }).catch(() => {})
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        manejarError(res, error)
    }
})

// Cambiar contraseña
router.patch('/:id/password', async (req, res) => {
    try {
        const { id } = req.params
        const { password_actual, password_nueva } = req.body

        const esAdmin = req.usuario?.rol === 'admin'
        if (parseInt(id) !== req.usuario?.id && !esAdmin) {
            return res.status(403).json({ error: 'Solo podés cambiar tu propia contraseña' })
        }

        if (!password_actual || !password_nueva) {
            return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' })
        }
        if (password_nueva.length < 8) {
            return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 8 caracteres' })
        }

        const resultado = await db.query(`SELECT password_hash FROM usuarios WHERE id = $1 AND disponible = true`, [id])
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' })
        }

        const valida = await bcrypt.compare(password_actual, resultado.rows[0].password_hash)
        if (!valida) {
            return res.status(400).json({ error: 'La contraseña actual es incorrecta' })
        }

        const nuevo_hash = await bcrypt.hash(password_nueva, 10)
        await db.query(`UPDATE usuarios SET password_hash = $1 WHERE id = $2`, [nuevo_hash, id])

        // Nunca se guarda password/hash en el log -- solo el hecho del cambio y quien lo hizo
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'editar', modulo: 'sistema', entidad: 'usuario', entidad_id: parseInt(id), descripcion: parseInt(id) === req.usuario?.id ? 'Contraseña propia actualizada' : `Contraseña actualizada por admin para usuario ${id}`, ip: req.ip }).catch(() => {})

        res.json({ ok: true })
    } catch (error) {
        manejarError(res, error)
    }
})

// Eliminar usuario
router.use('/:id', soloAdmin, async (req, res, next) => {
    if (req.method !== 'DELETE') return next()
    try {
        const { id } = req.params
        const anterior = await db.query(`SELECT id, nombre, email, rol_id, disponible FROM usuarios WHERE id = $1`, [id])
        await db.query(`UPDATE usuarios SET disponible = false WHERE id = $1`, [id])
        registrarLog({ usuario_id: req.usuario?.id, usuario_nombre: req.usuario?.nombre, accion: 'eliminar', modulo: 'sistema', entidad: 'usuario', entidad_id: parseInt(id), descripcion: `Usuario desactivado: ${anterior.rows[0]?.nombre}`, dato_anterior: anterior.rows[0], ip: req.ip }).catch(() => {})
        res.json({ ok: true })
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router