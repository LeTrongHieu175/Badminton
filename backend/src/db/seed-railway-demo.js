const fs = require('fs/promises');
const path = require('path');

const { pool, query } = require('../config/db');
const { runMigrations } = require('./migrate');

const schemaFilePath = path.join(__dirname, 'schema.sql');
const baseSeedFilePath = path.join(__dirname, 'seed.sql');
const demoSeedFilePath = path.join(__dirname, 'seed_bookings_history_1000.sql');

async function runSqlFile(filePath, label) {
  const sql = await fs.readFile(filePath, 'utf8');
  await query(sql);
  console.log(`[db] applied ${label}`);
}

async function hasDemoSeedData() {
  const result = await query(
    `
      SELECT
        COUNT(*) FILTER (WHERE email LIKE 'seed.vn.%@example.com')::int AS seeded_users,
        COUNT(*) FILTER (WHERE email LIKE 'seed.vn.%@example.com' AND is_active = TRUE)::int AS active_seeded_users
      FROM users
    `
  );

  const row = result.rows[0] || {};
  return Number(row.seeded_users || 0) > 0 || Number(row.active_seeded_users || 0) > 0;
}

async function seedRailwayDemo() {
  await runSqlFile(schemaFilePath, 'schema.sql');
  await runMigrations();
  console.log('[db] applied runtime migrations');

  await runSqlFile(baseSeedFilePath, 'seed.sql');

  if (await hasDemoSeedData()) {
    console.log('[db] skipped seed_bookings_history_1000.sql because demo seed data already exists');
    return;
  }

  await runSqlFile(demoSeedFilePath, 'seed_bookings_history_1000.sql');
}

if (require.main === module) {
  seedRailwayDemo()
    .catch((error) => {
      console.error('[db] railway demo seed failed', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

module.exports = {
  seedRailwayDemo
};
