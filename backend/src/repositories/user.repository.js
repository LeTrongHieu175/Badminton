const { query } = require('../config/db');

async function createUser({ username, fullName, phone, email, passwordHash, role = 'user' }) {
  const result = await query(
    `
      INSERT INTO users (username, full_name, phone, email, password_hash, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, username, full_name, phone, email, role, created_at, updated_at
    `,
    [username, fullName, phone, email, passwordHash, role]
  );

  return result.rows[0];
}

async function findByEmail(email) {
  const result = await query(
    `
      SELECT id, username, full_name, phone, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email]
  );

  return result.rows[0] || null;
}

async function findByUsername(username) {
  const result = await query(
    `
      SELECT id, username, full_name, phone, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1
    `,
    [username]
  );

  return result.rows[0] || null;
}

async function findByEmailOrUsername(identifier) {
  const result = await query(
    `
      SELECT id, username, full_name, phone, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
      LIMIT 1
    `,
    [identifier]
  );

  return result.rows[0] || null;
}

async function findByPhone(phone) {
  const result = await query(
    `
      SELECT id, username, full_name, phone, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE phone = $1
      LIMIT 1
    `,
    [phone]
  );

  return result.rows[0] || null;
}

async function findById(id) {
  const result = await query(
    `
      SELECT id, username, full_name, phone, email, role, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function listUsers() {
  const result = await query(
    `
      SELECT id, username, full_name, phone, email, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `
  );

  return result.rows;
}

async function updateUserRole(id, role) {
  const result = await query(
    `
      UPDATE users
      SET role = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, username, full_name, phone, email, role, created_at, updated_at
    `,
    [id, role]
  );

  return result.rows[0] || null;
}

async function countByRole(role) {
  const result = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM users
      WHERE role = $1
    `,
    [role]
  );

  return result.rows[0]?.total || 0;
}

module.exports = {
  createUser,
  findByEmail,
  findByUsername,
  findByEmailOrUsername,
  findByPhone,
  findById,
  listUsers,
  updateUserRole,
  countByRole
};
