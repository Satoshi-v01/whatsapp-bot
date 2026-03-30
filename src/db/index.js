// index.js - Conexión a Supabase lista para Railway
require('dotenv').config();
const { Pool } = require('pg');

// Pool de conexiones (mantener abierto, no cerrar)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // obligatorio Free Plan Supabase
  max: 10,                 // máximo de conexiones simultáneas
  idleTimeoutMillis: 30000, // cierra conexiones inactivas después de 30s
  connectionTimeoutMillis: 5000 // timeout de conexión
});

// Logs básicos
pool.on('connect', () => console.log('✅ Conectado a PostgreSQL'));
pool.on('error', (err) => console.error('❌ Error en la conexión a PostgreSQL:', err));

// Función para consultas (usar en tus endpoints)
async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('❌ Error ejecutando query:', err);
    throw err;
  }
}

// Exportar para usar en cualquier archivo de tu app
module.exports = { pool, query };