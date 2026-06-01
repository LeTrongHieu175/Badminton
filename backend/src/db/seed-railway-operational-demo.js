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
      SELECT COUNT(*)::int AS seeded_users
      FROM users
      WHERE email LIKE 'ops.demo.%@example.com'
    `
  );

  return Number(result.rows[0]?.seeded_users || 0) > 0;
}

async function seedRailwayOperationalDemo() {
  await runSqlFile(schemaFilePath, 'schema.sql');
  await runMigrations();
  console.log('[db] applied runtime migrations');

  await runSqlFile(baseSeedFilePath, 'seed.sql');

  if (await hasOperationalDemoSeedData()) {
    console.log('[db] skipped seed_operational_history_year.sql because operational demo data already exists');
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
