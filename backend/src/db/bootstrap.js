const fs = require('fs/promises');
const path = require('path');

const { pool, query } = require('../config/db');
const { env } = require('../config/env');
const { runMigrations } = require('./migrate');

const schemaFilePath = path.join(__dirname, 'schema.sql');
const seedFilePath = path.join(__dirname, 'seed.sql');

async function runSqlFile(filePath, label) {
  const sql = await fs.readFile(filePath, 'utf8');
  await query(sql);
  console.log(`[db] applied ${label}`);
}

async function applyBaseSchema() {
  await runSqlFile(schemaFilePath, 'schema.sql');
}

async function applySeedData() {
  await runSqlFile(seedFilePath, 'seed.sql');
}

async function bootstrapDatabase() {
  if (env.AUTO_APPLY_SCHEMA) {
    await applyBaseSchema();
  }

  await runMigrations();

  if (env.AUTO_RUN_SEED) {
    await applySeedData();
  }
}

async function runCli(action) {
  switch (action) {
    case 'schema':
      await applyBaseSchema();
      break;
    case 'migrate':
      await runMigrations();
      console.log('[db] applied runtime migrations');
      break;
    case 'seed':
      await applySeedData();
      break;
    case 'setup':
      await applyBaseSchema();
      await runMigrations();
      await applySeedData();
      break;
    case 'bootstrap':
    case undefined:
      await bootstrapDatabase();
      break;
    default:
      throw new Error(`Unsupported db action: ${action}`);
  }
}

if (require.main === module) {
  runCli(process.argv[2])
    .catch((error) => {
      console.error('[db] bootstrap failed', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

module.exports = {
  applyBaseSchema,
  applySeedData,
  bootstrapDatabase
};
