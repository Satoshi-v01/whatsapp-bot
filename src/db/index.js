const { Pool, types } = require('pg')
const logger = require('../middleware/logger')

// Las columnas "timestamp without time zone" (created_at/updated_at en casi
// toda la DB) se calculan y guardan en UTC (la sesion de Postgres esta en
// UTC), pero el parser por defecto de "pg" (OID 1114) construye el Date
// interpretando el valor con la zona horaria LOCAL del proceso Node
// (TZ=America/Asuncion en Render), sumando un desfase falso de 3 horas a
// cada fecha leida de la DB. Se fuerza a interpretarlas como UTC.
types.setTypeParser(1114, str => new Date(str.replace(' ', 'T') + 'Z'))

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