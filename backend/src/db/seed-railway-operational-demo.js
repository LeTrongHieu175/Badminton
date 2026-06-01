const fs = require('fs/promises');
const path = require('path');

const { pool, query } = require('../config/db');
const { runMigrations } = require('./migrate');

const schemaFilePath = path.join(__dirname, 'schema.sql');
const baseSeedFilePath = path.join(__dirname, 'seed.sql');
const operationalSeedFilePath = path.join(__dirname, 'seed_operational_history_year.sql');

async function runSqlFile(filePath, label) {
  const sql = await fs.readFile(filePath, 'utf8');
  await query(sql);
  console.log(`[db] applied ${label}`);
}

async function hasOperationalDemoSeedData() {
  const result = await query(
    `
      SELECT
        COUNT(DISTINCT u.id)::int AS seeded_users,
        COUNT(DISTINCT b.id)::int AS seeded_bookings
      FROM users u
      LEFT JOIN bookings b ON b.user_id = u.id
      WHERE u.email LIKE 'ops.demo.%@example.com'
    `
  );

  const seededUsers = Number(result.rows[0]?.seeded_users || 0);
  const seededBookings = Number(result.rows[0]?.seeded_bookings || 0);

  return seededUsers > 0 && seededBookings > 0;
}

async function seedRailwayOperationalDemo() {
  await runSqlFile(schemaFilePath, 'schema.sql');
  await runMigrations();
  console.log('[db] applied runtime migrations');

  await runSqlFile(baseSeedFilePath, 'seed.sql');

  if (await hasOperationalDemoSeedData()) {
    console.log('[db] skipped seed_operational_history_year.sql because operational demo booking history already exists');
    return;
  }

  await runSqlFile(operationalSeedFilePath, 'seed_operational_history_year.sql');
}

if (require.main === module) {
  seedRailwayOperationalDemo()
    .catch((error) => {
      console.error('[db] railway operational demo seed failed', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

module.exports = {
  seedRailwayOperationalDemo
};
