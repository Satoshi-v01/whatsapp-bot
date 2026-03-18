require('dotenv').config()
const express = require('express')
const db = require('./src/db/index')
const webhookRoutes = require('./src/routes/webhook')
const sesionesRoutes = require('./src/routes/sesiones')
const ventasRoutes = require('./src/routes/ventas')
const productosRoutes = require('./src/routes/productos')
const authRoutes = require('./src/routes/auth')
const clientesRoutes = require('./src/routes/clientes')
const { autenticar } = require('./src/middleware/auth')
const deliveriesRoutes = require('./src/routes/deliveries')
const estadisticasRoutes = require('./src/routes/estadisticas')


const app = express()

app.use(express.json())
app.use('/webhook', webhookRoutes)
app.use('/auth', authRoutes)
app.use('/sesiones', autenticar, sesionesRoutes)
app.use('/ventas', autenticar, ventasRoutes)
app.use('/productos', autenticar, productosRoutes)
app.use('/deliveries', autenticar, deliveriesRoutes)
app.use('/estadisticas', autenticar, estadisticasRoutes)
app.use('/clientes', autenticar, clientesRoutes)


app.get('/', (req, res) => {
    res.json({ mensaje: 'Servidor funcionando' })
})

app.get('/test-db', async (req, res) => {
    try {
        const resultado = await db.query('SELECT NOW()')
        res.json({
            mensaje: 'Base de datos conectada',
            hora: resultado.rows[0].now
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`)
})