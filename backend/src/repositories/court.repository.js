const { query } = require('../config/db');

async function listCourts() {
  const result = await query(
    `
      SELECT id, name, location, is_active, created_at, updated_at
      FROM courts
      WHERE is_active = TRUE
      ORDER BY id ASC
    `
  );

  return result.rows;
}

async function findCourtById(courtId) {
  const result = await query(
    `
      SELECT id, name, location, is_active, created_at, updated_at
      FROM courts
      WHERE id = $1
      LIMIT 1
    `,
    [courtId]
  );

  return result.rows[0] || null;
}

module.exports = {
  listCourts,
  findCourtById
};
