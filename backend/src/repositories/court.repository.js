const { query } = require('../config/db');

async function listCourts({ includeInactive = false } = {}) {
  const result = await query(
    `
      SELECT id, name, location, is_active, created_at, updated_at
      FROM courts
      WHERE ($1::boolean = TRUE OR is_active = TRUE)
      ORDER BY id ASC
    `,
    [includeInactive]
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

async function createCourt({ name, location }) {
  const result = await query(
    `
      INSERT INTO courts (name, location, is_active, created_at, updated_at)
      VALUES ($1, $2, TRUE, NOW(), NOW())
      RETURNING id, name, location, is_active, created_at, updated_at
    `,
    [name, location]
  );

  return result.rows[0];
}

async function updateCourt(courtId, { name, location, isActive }) {
  const fields = [];
  const values = [];

  if (name !== undefined) {
    fields.push(`name = $${values.length + 1}`);
    values.push(name);
  }

  if (location !== undefined) {
    fields.push(`location = $${values.length + 1}`);
    values.push(location);
  }

  if (isActive !== undefined) {
    fields.push(`is_active = $${values.length + 1}`);
    values.push(Boolean(isActive));
  }

  if (fields.length === 0) {
    return findCourtById(courtId);
  }

  values.push(courtId);

  const result = await query(
    `
      UPDATE courts
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id, name, location, is_active, created_at, updated_at
    `,
    values
  );

  return result.rows[0] || null;
}

async function deactivateCourt(courtId) {
  const result = await query(
    `
      UPDATE courts
      SET is_active = FALSE,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, location, is_active, created_at, updated_at
    `,
    [courtId]
  );

  return result.rows[0] || null;
}

module.exports = {
  listCourts,
  findCourtById,
  createCourt,
  updateCourt,
  deactivateCourt
};
