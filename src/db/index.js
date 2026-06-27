const { Pool } = require('pg')
const logger = require('../middleware/logger')

let pool = null

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        })
        pool.on('connect', () => logger.info('Conectado a PostgreSQL'))
        pool.on('error', (err) => logger.error('Error PostgreSQL:', { message: err.message }))
    }
    return pool
}

async function query(text, params) {
    return await getPool().query(text, params)
}

module.exports = { get pool() { return getPool() }, query }