require('dotenv').config()
const { Pool } = require('pg')

// Crear pool de conexiones
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // 
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false } 
})

// Logs de conexión
pool.on('connect', () => console.log('✅ Conectado a PostgreSQL'))
pool.on('error', (err) => console.error('❌ Error en la conexión a PostgreSQL:', err))

// Función para ejecutar queries con logging de errores
async function query(text, params) {
  try {
    const res = await pool.query(text, params)
    return res
  } catch (err) {
    console.error('❌ Error en query:', { text, params, err })
    throw err
  }
}

// Manejo seguro del cierre del pool al apagar la app
process.on('SIGINT', async () => {
  console.log('Cerrando pool de PostgreSQL...')
  await pool.end()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Cerrando pool de PostgreSQL...')
  await pool.end()
  process.exit(0)
})

module.exports = { query, pool }