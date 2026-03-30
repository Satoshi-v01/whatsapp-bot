require('dotenv').config();
const { pool } = require('./src/db/index');

(async () => {
  try {
    console.log('Intentando conectar...');
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Conectado a Supabase! Hora:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Error conectando a Supabase:', err);
  } finally {
    await pool.end();
    console.log('Pool cerrado');
  }
})();