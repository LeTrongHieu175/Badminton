const { query } = require('../config/db');

function toBooleanOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return Boolean(value);
}

async function createUser({ username, fullName, phone, email, passwordHash, role = 'user', isActive = true }) {
  const result = await query(
    `
      INSERT INTO users (username, full_name, phone, email, password_hash, role, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, username, full_name, phone, email, role, is_active, created_at, updated_at
    `,
    [username, fullName, phone, email, passwordHash, role, isActive]
  );

  return result.rows[0];
}

async function findByEmail(email) {
  const result = await query(
    `
      SELECT id, username, full_name, phone, email, password_hash, role, is_active, created_at, updated_at
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
      SELECT id, username, full_name, phone, email, password_hash, role, is_active, created_at, updated_at
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
      SELECT id, username, full_name, phone, email, password_hash, role, is_active, created_at, updated_at
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
      SELECT id, username, full_name, phone, email, password_hash, role, is_active, created_at, updated_at
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
      SELECT id, username, full_name, phone, email, role, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function findByIdWithAuth(id) {
  const result = await query(
    `
      SELECT id, username, full_name, phone, email, password_hash, role, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function listUsers({ includeInactive = true } = {}) {
  const result = await query(
    `
      SELECT id, username, full_name, phone, email, role, is_active, created_at, updated_at
      FROM users
      WHERE ($1::boolean = TRUE OR is_active = TRUE)
      ORDER BY created_at DESC
    `,
    [includeInactive]
  );

  return result.rows;
}

async function updateUser(id, updates) {
  const fields = [];
  const values = [];

  const mapping = {
    username: 'username',
    fullName: 'full_name',
    phone: 'phone',
    email: 'email',
    role: 'role',
    isActive: 'is_active',
    passwordHash: 'password_hash'
  };

  Object.entries(mapping).forEach(([key, column]) => {
    if (updates[key] !== undefined) {
      fields.push(`${column} = $${values.length + 1}`);
      if (key === 'isActive') {
        values.push(toBooleanOrNull(updates[key]));
      } else {
        values.push(updates[key]);
      }
    }
  });

  if (fields.length === 0) {
    return findById(id);
  }

  values.push(id);

  const result = await query(
    `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id, username, full_name, phone, email, role, is_active, created_at, updated_at
    `,
    values
  );

  return result.rows[0] || null;
}

async function updateUserRole(id, role) {
  return updateUser(id, { role });
}

async function countByRole(role, { activeOnly = true } = {}) {
  const result = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM users
      WHERE role = $1
        AND ($2::boolean = FALSE OR is_active = TRUE)
    `,
    [role, activeOnly]
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
  findByIdWithAuth,
  listUsers,
  updateUser,
  updateUserRole,
  countByRole
};
