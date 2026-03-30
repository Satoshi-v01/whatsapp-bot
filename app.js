process.env.TZ = 'America/Asuncion'
require('dotenv').config()
const express = require('express')
const rateLimit = require('express-rate-limit')
const { pool } = require('./src/db/index')
const webhookRoutes = require('./src/routes/webhook')
const sesionesRoutes = require('./src/routes/sesiones')
const ventasRoutes = require('./src/routes/ventas')
const productosRoutes = require('./src/routes/productos')
const authRoutes = require('./src/routes/auth')
const clientesRoutes = require('./src/routes/clientes')
const { autenticar } = require('./src/middleware/auth')
const deliveriesRoutes = require('./src/routes/deliveries')
const estadisticasRoutes = require('./src/routes/estadisticas')
const usuariosRoutes = require('./src/routes/usuarios')
const configuracionRoutes = require('./src/routes/configuracion')
const proveedoresRoutes = require('./src/routes/proveedores')
const zonasRoutes = require('./src/routes/zonas')
const ordenesRoutes = require('./src/routes/ordenes')
const carritoRoutes = require('./src/routes/carrito')
const { procesarTimeouts } = require('./src/bot/recordatorios')
const helmet = require('helmet')
const cors = require('cors')
const logger = require('./src/middleware/logger')
const lotesRoutes = require('./src/routes/lotes')
const auditoriaRoutes = require('./src/routes/auditoria')


const app = express()

// Rate limiting general
const limiterGeneral = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,  // era 200, subimos a 1000
    message: { error: 'Demasiadas solicitudes, intentá de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
})

// Rate limiting estricto para login
const limiterAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiados intentos de login, intentá de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
})

app.use(express.json())

// Seguridad HTTP headers
app.use(helmet())

// CORS — solo permitir el dashboard
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? [process.env.FRONTEND_URL, `${process.env.FRONTEND_URL}/dashboard`]
        : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}))

// Middleware de logs para todas las rutas
app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
        const duration = Date.now() - start
        // Solo loguear errores 400+ y requests lentos (+2000ms)
        if (res.statusCode >= 400) {
            logger.error({
                method: req.method,
                url: req.url,
                status: res.statusCode,
                duration: `${duration}ms`
            })
        } else if (duration > 2000) {
            logger.warn({
                method: req.method,
                url: req.url,
                status: res.statusCode,
                duration: `${duration}ms`,
                message: 'Request lento'
            })
        }
    })
    next()
})

// Rutas
app.use('/webhook', webhookRoutes)
app.use('/auth', limiterAuth, authRoutes)
app.use('/usuarios', limiterGeneral, autenticar, usuariosRoutes)
app.use('/configuracion', limiterGeneral, autenticar, configuracionRoutes)
app.use('/sesiones', limiterGeneral, autenticar, sesionesRoutes)
app.use('/ventas', limiterGeneral, autenticar, ventasRoutes)
app.use('/ordenes', limiterGeneral, autenticar, ordenesRoutes)
app.use('/productos', limiterGeneral, autenticar, productosRoutes)
app.use('/deliveries', limiterGeneral, autenticar, deliveriesRoutes)
app.use('/proveedores', limiterGeneral, autenticar, proveedoresRoutes)
app.use('/estadisticas', limiterGeneral, autenticar, estadisticasRoutes)
app.use('/clientes', limiterGeneral, autenticar, clientesRoutes)
app.use('/zonas/publico', limiterGeneral, zonasRoutes)
app.use('/zonas', limiterGeneral, autenticar, zonasRoutes)
app.use('/carrito', limiterGeneral, autenticar, carritoRoutes)
app.use('/lotes', limiterGeneral, autenticar, lotesRoutes)
app.use('/auditoria', limiterGeneral, autenticar, auditoriaRoutes)

const path = require('path')

// Servir dashboard estático
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard/dist')))
app.get('/dashboard/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard/dist/index.html'))
})

app.get('/', (req, res) => {
    res.json({ mensaje: 'Servidor funcionando' })
})

app.get('/test-db', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT NOW()')
        res.json({
            mensaje: 'Base de datos conectada',
            hora: resultado.rows[0].now
        })
    } catch (error) {
        logger.error('Error conectando a la base de datos:', error)
        res.status(500).json({ error: error.message })
    }
})

// Manejo global de errores
app.use((err, req, res, next) => {
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    })
    res.status(500).json({ error: 'Error interno del servidor' })
})

// Manejo de promesas no capturadas
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { reason, promise })
})

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error)
    process.exit(1)
})

const PORT = process.env.PORT || 3000


let corriendo = false

setInterval(async () => {
    if (corriendo) return  // evita superposición si tarda más de 5 min
    corriendo = true
    try {
        await procesarTimeouts()
    } catch (err) {
        console.error('Error en timeout job:', err.message)
    } finally {
        corriendo = false
    }
}, 5 * 60 * 1000)

app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Servidor corriendo en puerto ${PORT}`)
})