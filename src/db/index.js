process.env.TZ = 'America/Asuncion'
require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
})

pool.on('connect', () => console.log('Conectado a PostgreSQL'))
pool.on('error', (err) => console.error('Error en la conexión a PostgreSQL:', err))

async function query(text, params) {
    try {
        return await pool.query(text, params)
    } catch (err) {
        console.error('Error ejecutando query:', err)
        throw err
    }
}
console.log('DATABASE_URL:', process.env.DATABASE_URL?.slice(0, 40))

module.exports = { pool, query }