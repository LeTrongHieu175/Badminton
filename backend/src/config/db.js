const { Pool } = require('pg');
const { env } = require('./env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.PG_POOL_MAX
});

pool.on('error', (error) => {
  console.error('[db] unexpected idle client error', error);
});

async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query: pool.query.bind(pool),
  withTransaction
};
