require('dotenv').config()
const express = require('express')
const db = require('./src/db/index')
const webhookRoutes = require('./src/routes/webhook')
const sesionesRoutes = require('./src/routes/sesiones')
const ventasRoutes = require('./src/routes/ventas')
const productosRoutes = require('./src/routes/productos')
const authRoutes = require('./src/routes/auth')


const app = express()

app.use(express.json())
app.use('/webhook', webhookRoutes)
app.use('/sesiones', sesionesRoutes)
app.use('/ventas', ventasRoutes)
app.use('/productos', productosRoutes)
app.use('/auth', authRoutes)


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