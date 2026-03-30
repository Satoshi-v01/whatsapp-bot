require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false } 
})

pool.on('connect', () => {
  console.log('Conectado a PostgreSQL')
})

pool.on('error', (err) => {
  console.error('Error en la conexión a PostgreSQL:', err)
})

async function query(text, params) {
  return pool.query(text, params)
}

module.exports = { query, pool }