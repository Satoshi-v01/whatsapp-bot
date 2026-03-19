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
const logger = require('./src/middleware/logger')

const app = express()

// Rate limiting general
const limiterGeneral = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200,
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

// Middleware de logs para todas las rutas
app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
        const duration = Date.now() - start
        if (res.statusCode >= 400) {
            logger.error({
                method: req.method,
                url: req.url,
                status: res.statusCode,
                duration: `${duration}ms`
            })
        } else {
            logger.info({
                method: req.method,
                url: req.url,
                status: res.statusCode,
                duration: `${duration}ms`
            })
        }
    })
    next()
})

// Rutas
app.use('/webhook', webhookRoutes)
app.use('/auth', limiterAuth, authRoutes)
app.use('/sesiones', limiterGeneral, autenticar, sesionesRoutes)
app.use('/ventas', limiterGeneral, autenticar, ventasRoutes)
app.use('/productos', limiterGeneral, autenticar, productosRoutes)
app.use('/deliveries', limiterGeneral, autenticar, deliveriesRoutes)
app.use('/estadisticas', limiterGeneral, autenticar, estadisticasRoutes)
app.use('/clientes', limiterGeneral, autenticar, clientesRoutes)

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

app.listen(PORT, () => {
    logger.info(`Servidor corriendo en puerto ${PORT}`)
})