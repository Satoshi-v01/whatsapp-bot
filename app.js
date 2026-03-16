require('dotenv').config()
const express = require('express')
const db = require('./src/db/index')

const app = express()

app.use(express.json())

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