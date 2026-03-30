const { Pool } = require('pg')

let pool = null

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.SUPABASE_URL,
            ssl: { rejectUnauthorized: false },
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        })
        pool.on('connect', () => console.log('Conectado a PostgreSQL'))
        pool.on('error', (err) => console.error('Error PostgreSQL:', err))
    }
    return pool
}

async function query(text, params) {
    return await getPool().query(text, params)
}

module.exports = { get pool() { return getPool() }, query }