const { query } = require('../config/db');

async function getSettings() {
  const result = await query(
    `
      SELECT id, display_currency, booking_hold_minutes, updated_at
      FROM app_settings
      WHERE id = 1
      LIMIT 1
    `
  );

  return result.rows[0] || null;
}

async function ensureSettings(defaults) {
  const result = await query(
    `
      INSERT INTO app_settings (id, display_currency, booking_hold_minutes, updated_at)
      VALUES (1, $1, $2, NOW())
      ON CONFLICT (id) DO UPDATE
      SET display_currency = COALESCE(app_settings.display_currency, EXCLUDED.display_currency),
          booking_hold_minutes = COALESCE(app_settings.booking_hold_minutes, EXCLUDED.booking_hold_minutes)
      RETURNING id, display_currency, booking_hold_minutes, updated_at
    `,
    [defaults.displayCurrency, defaults.bookingHoldMinutes]
  );

  return result.rows[0];
}

async function updateSettings({ displayCurrency, bookingHoldMinutes }) {
  const fields = [];
  const values = [];

  if (displayCurrency !== undefined) {
    fields.push(`display_currency = $${values.length + 1}`);
    values.push(displayCurrency);
  }

  if (bookingHoldMinutes !== undefined) {
    fields.push(`booking_hold_minutes = $${values.length + 1}`);
    values.push(bookingHoldMinutes);
  }

  if (fields.length === 0) {
    return getSettings();
  }

  values.push(1);

  const result = await query(
    `
      UPDATE app_settings
      SET ${fields.join(', ')},
          updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id, display_currency, booking_hold_minutes, updated_at
    `,
    values
  );

  return result.rows[0] || null;
}

module.exports = {
  getSettings,
  ensureSettings,
  updateSettings
};
