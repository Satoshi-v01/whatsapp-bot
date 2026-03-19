require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
})

pool.on('connect', () => {
    console.log('Conectado a PostgreSQL')
})

pool.on('error', (err) => {
    console.error('Error en la conexión a PostgreSQL:', err)
})

// Función query para uso normal
async function query(text, params) {
    const start = Date.now()
    const res = await pool.query(text, params)
    return res
}

module.exports = { query, pool }