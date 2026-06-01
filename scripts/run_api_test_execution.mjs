import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const API_BASE_URL = 'http://localhost:4000';
const AI_BASE_URL = 'http://localhost:8001';
const RESULTS_DIR = path.resolve('artifacts');
const RESULTS_FILE = path.join(RESULTS_DIR, 'api-test-results.json');
const RUN_ID = `run${Date.now()}`;
const BOOKING_DATE = datePlusDays(14);
const FULLY_BOOKED_DATE = datePlusDays(45);
const REFUND_DATE = datePlusDays(16);
const EXPIRED_REFUND_DATE = new Date().toISOString().slice(0, 10);

const results = {};
const state = {
  tokens: {},
  users: {},
  courts: {},
  slots: {},
  bookings: {}
};

function datePlusDays(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function record(id, status, actual) {
  results[id] = {
    actual,
    status
  };
}

function recordPass(id, actual) {
  record(id, 'Pass', actual);
}

function recordFail(id, actual) {
  record(id, 'Fail', actual);
}

async function runCase(id, fn) {
  try {
    const actual = await fn();
    recordPass(id, actual);
  } catch (error) {
    recordFail(id, error instanceof Error ? error.message : String(error));
  }
}

function sql(query) {
  return execFileSync(
    'docker',
    ['exec', 'badminton-postgres', 'psql', '-U', 'postgres', '-d', 'smart_badminton', '-At', '-F', '\t', '-c', query],
    { encoding: 'utf8' }
  ).trim();
}

function sqlJson(query) {
  const output = sql(query);
  return output ? JSON.parse(output) : null;
}

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(url, { method = 'GET', token, body, headers } = {}) {
  const requestHeaders = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(headers || {})
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined
  });

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  return {
    status: response.status,
    ok: response.ok,
    payload
  };
}

function successData(response) {
  return response?.payload?.data ?? null;
}

function errorCode(response) {
  return response?.payload?.error?.code ?? 'UNKNOWN';
}

function errorMessage(response) {
  return response?.payload?.error?.message ?? 'Unknown error';
}

function expectStatus(response, expectedStatus) {
  requireCondition(
    response.status === expectedStatus,
    `Expected HTTP ${expectedStatus} but got ${response.status}: ${JSON.stringify(response.payload)}`
  );
}

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

async function waitForHttpOk(url, timeoutMs = 120000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (_error) {
      // Ignore until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`Timeout waiting for ${url}`);
}

function stopContainer(name) {
  execFileSync('docker', ['stop', name], { encoding: 'utf8' });
}

function startContainer(name) {
  execFileSync('docker', ['start', name], { encoding: 'utf8' });
}

async function login(identifier, password) {
  const response = await request(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    body: { identifier, password }
  });
  expectStatus(response, 200);
  return successData(response);
}

async function createBooking(token, courtId, slotId, date) {
  const response = await request(`${API_BASE_URL}/bookings`, {
    method: 'POST',
    token,
    body: { courtId, slotId, date }
  });
  return response;
}

async function createPaymentIntent(token, bookingId) {
  return request(`${API_BASE_URL}/payments/create-intent`, {
    method: 'POST',
    token,
    body: { bookingId }
  });
}

async function sendWebhook({ secret = true, eventId, transferCode, amountVnd }) {
  return request(`${API_BASE_URL}/payments/webhook`, {
    method: 'POST',
    headers: secret ? { Authorization: 'Bearer letronghieu1705' } : { Authorization: 'Bearer invalid' },
    body: {
      id: eventId,
      transferType: 'in',
      transactionStatus: 'success',
      content: transferCode,
      amount: amountVnd
    }
  });
}

async function prepareBaseState() {
  sql(`
    UPDATE users
    SET is_active = TRUE,
        full_name = CASE
          WHEN email = 'admin@smartbadminton.com' THEN 'Admin User'
          WHEN email = 'john@example.com' THEN 'John Player'
          ELSE full_name
        END,
        phone = CASE
          WHEN email = 'admin@smartbadminton.com' THEN '0900000001'
          WHEN email = 'john@example.com' THEN '0900000002'
          ELSE phone
        END,
        role = CASE
          WHEN email = 'admin@smartbadminton.com' THEN 'admin'
          WHEN email = 'john@example.com' THEN 'user'
          ELSE role
        END,
        updated_at = NOW()
    WHERE email IN ('admin@smartbadminton.com', 'john@example.com');
  `);

  const adminLogin = await login('admin@smartbadminton.com', 'admin123');
  const userLogin = await login('john@example.com', 'user123');

  state.tokens.admin = adminLogin.accessToken;
  state.tokens.user = userLogin.accessToken;
  state.users.admin = adminLogin.user;
  state.users.user = userLogin.user;

  const authUserPayload = {
    username: `${RUN_ID}_auth`,
    email: `${RUN_ID}_auth@example.com`,
    phone: `091${String(Date.now()).slice(-7)}`,
    password: 'secret123'
  };

  const registerResponse = await request(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    body: authUserPayload
  });
  expectStatus(registerResponse, 201);
  state.tokens.authUser = successData(registerResponse).accessToken;
  state.users.authUser = successData(registerResponse).user;
  state.users.authUserPassword = authUserPayload.password;

  const secondUserPayload = {
    username: `${RUN_ID}_user2`,
    email: `${RUN_ID}_user2@example.com`,
    phone: `092${String(Date.now()).slice(-7)}`,
    password: 'secret123',
    role: 'user'
  };

  const secondUserResponse = await request(`${API_BASE_URL}/users`, {
    method: 'POST',
    token: state.tokens.admin,
    body: secondUserPayload
  });
  expectStatus(secondUserResponse, 201);
  state.users.user2 = successData(secondUserResponse);
  state.users.user2Password = secondUserPayload.password;
  state.tokens.user2 = (await login(secondUserPayload.email, secondUserPayload.password)).accessToken;

  const admin2Payload = {
    username: `${RUN_ID}_admin2`,
    email: `${RUN_ID}_admin2@example.com`,
    phone: `093${String(Date.now()).slice(-7)}`,
    password: 'secret123',
    role: 'admin'
  };

  const admin2Response = await request(`${API_BASE_URL}/users`, {
    method: 'POST',
    token: state.tokens.admin,
    body: admin2Payload
  });
  expectStatus(admin2Response, 201);
  state.users.admin2 = successData(admin2Response);
  state.users.admin2Password = admin2Payload.password;

  const mainCourtResponse = await request(`${API_BASE_URL}/courts`, {
    method: 'POST',
    token: state.tokens.admin,
    body: {
      name: `${RUN_ID} Court Main`,
      location: 'QA Zone'
    }
  });
  expectStatus(mainCourtResponse, 201);
  state.courts.main = successData(mainCourtResponse);

  const inactiveCourtResponse = await request(`${API_BASE_URL}/courts`, {
    method: 'POST',
    token: state.tokens.admin,
    body: {
      name: `${RUN_ID} Court Inactive`,
      location: 'QA Zone'
    }
  });
  expectStatus(inactiveCourtResponse, 201);
  state.courts.inactive = successData(inactiveCourtResponse);
  const deactivateCourtResponse = await request(`${API_BASE_URL}/courts/${state.courts.inactive.id}`, {
    method: 'PATCH',
    token: state.tokens.admin,
    body: { isActive: false }
  });
  expectStatus(deactivateCourtResponse, 200);
  state.courts.inactive = successData(deactivateCourtResponse);

  const slotDefinitions = [
    { key: 'primary', label: 'Prime Slot', startTime: '18:00', endTime: '19:00', priceVnd: 120000 },
    { key: 'secondary', label: 'Late Slot', startTime: '19:00', endTime: '20:00', priceVnd: 130000 },
    { key: 'nearNow', label: 'Near Slot', startTime: '09:00', endTime: '10:00', priceVnd: 90000 },
    { key: 'third', label: 'Third Slot', startTime: '20:00', endTime: '21:00', priceVnd: 140000 }
  ];

  for (const slotDefinition of slotDefinitions) {
    const response = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots`, {
      method: 'POST',
      token: state.tokens.admin,
      body: slotDefinition
    });
    expectStatus(response, 201);
    state.slots[slotDefinition.key] = successData(response);
  }
}

async function runAuthCases() {
  await runCase('TC_AUTH_01', async () => {
    const response = await request(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: { identifier: 'john@example.com', password: 'user123' }
    });
    expectStatus(response, 200);
    const data = successData(response);
    requireCondition(Boolean(data?.accessToken), 'Missing access token');
    return `HTTP 200; user=${data.user.email}; accessToken tồn tại`;
  });

  await runCase('TC_AUTH_02', async () => {
    const response = await request(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: { identifier: 'admin@smartbadminton.com', password: 'admin123' }
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; role=${data.user.role}; email=${data.user.email}`;
  });

  await runCase('TC_AUTH_03', async () => {
    const response = await request(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: { identifier: state.users.user.username, password: 'user123' }
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; username=${data.user.username}; đăng nhập bằng username hiện tại thành công`;
  });

  await runCase('TC_AUTH_04', async () => {
    const response = await request(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: { identifier: 'john@example.com', password: 'wrong123' }
    });
    expectStatus(response, 401);
    requireCondition(errorCode(response) === 'INVALID_CREDENTIALS', `Unexpected error code ${errorCode(response)}`);
    return `HTTP 401; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_AUTH_05', async () => {
    const response = await request(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: { identifier: '', password: '' }
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_AUTH_06', async () => {
    return `HTTP 201; created user=${state.users.authUser.email}; accessToken cấp ngay sau đăng ký`;
  });

  await runCase('TC_AUTH_07', async () => {
    const response = await request(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      body: {
        username: `${RUN_ID}_dup_email`,
        email: 'john@example.com',
        phone: `094${String(Date.now()).slice(-7)}`,
        password: 'secret123'
      }
    });
    expectStatus(response, 409);
    requireCondition(errorCode(response) === 'EMAIL_EXISTS', `Unexpected error code ${errorCode(response)}`);
    return `HTTP 409; code=${errorCode(response)}`;
  });

  await runCase('TC_AUTH_08', async () => {
    const response = await request(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      body: {
        username: `${RUN_ID}_invalid`,
        email: `${RUN_ID}_invalid@example.com`,
        phone: '12abc',
        password: '123'
      }
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_AUTH_09', async () => {
    const response = await request(`${API_BASE_URL}/auth/me`, {
      token: state.tokens.user
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; current user=${data.user.email}; role=${data.user.role}`;
  });

  await runCase('TC_AUTH_11', async () => {
    const response = await request(`${API_BASE_URL}/users`, {
      token: state.tokens.user
    });
    expectStatus(response, 403);
    return `HTTP 403; code=${errorCode(response)}`;
  });
}

async function runProfileCases() {
  await runCase('TC_PROF_01', async () => {
    const response = await request(`${API_BASE_URL}/auth/me`, { token: state.tokens.authUser });
    expectStatus(response, 200);
    const user = successData(response).user;
    return `HTTP 200; username=${user.username}; email=${user.email}; phone=${user.phone}`;
  });

  await runCase('TC_PROF_02', async () => {
    const nextUsername = `${RUN_ID}_auth_updated`;
    const nextPhone = `095${String(Date.now()).slice(-7)}`;
    const response = await request(`${API_BASE_URL}/auth/me`, {
      method: 'PATCH',
      token: state.tokens.authUser,
      body: {
        username: nextUsername,
        fullName: 'Auth User Updated',
        phone: nextPhone
      }
    });
    expectStatus(response, 200);
    const updated = successData(response).user;
    state.users.authUser = updated;
    return `HTTP 200; username=${updated.username}; fullName=${updated.fullName}; phone=${updated.phone}`;
  });

  await runCase('TC_PROF_03', async () => {
    const response = await request(`${API_BASE_URL}/auth/me`, {
      method: 'PATCH',
      token: state.tokens.authUser,
      body: {
        username: 'john'
      }
    });
    expectStatus(response, 409);
    return `HTTP 409; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_PROF_04', async () => {
    const response = await request(`${API_BASE_URL}/auth/me/password`, {
      method: 'PATCH',
      token: state.tokens.authUser,
      body: {
        currentPassword: state.users.authUserPassword,
        newPassword: 'newpass123',
        confirmPassword: 'newpass123'
      }
    });
    expectStatus(response, 200);
    const relogin = await login(state.users.authUser.email, 'newpass123');
    state.tokens.authUser = relogin.accessToken;
    state.users.authUserPassword = 'newpass123';
    return `HTTP 200; đổi mật khẩu thành công; đăng nhập lại được với mật khẩu mới`;
  });

  await runCase('TC_PROF_05', async () => {
    const response = await request(`${API_BASE_URL}/auth/me/password`, {
      method: 'PATCH',
      token: state.tokens.authUser,
      body: {
        currentPassword: 'wrong123',
        newPassword: 'another123',
        confirmPassword: 'another123'
      }
    });
    expectStatus(response, 401);
    return `HTTP 401; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_PROF_06', async () => {
    const response = await request(`${API_BASE_URL}/auth/me/password`, {
      method: 'PATCH',
      token: state.tokens.authUser,
      body: {
        currentPassword: state.users.authUserPassword,
        newPassword: 'mismatch123',
        confirmPassword: 'mismatch456'
      }
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_PROF_07', async () => {
    const response = await request(`${API_BASE_URL}/auth/me/password`, {
      method: 'PATCH',
      token: state.tokens.authUser,
      body: {
        currentPassword: state.users.authUserPassword,
        newPassword: state.users.authUserPassword,
        confirmPassword: state.users.authUserPassword
      }
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });
}

async function runSettingsCases() {
  await runCase('TC_SET_01', async () => {
    const response = await request(`${API_BASE_URL}/settings`);
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; displayCurrency=${data.displayCurrency}; bookingHoldMinutes=${data.bookingHoldMinutes}`;
  });

  await runCase('TC_SET_02', async () => {
    const response = await request(`${API_BASE_URL}/settings`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: {
        displayCurrency: 'EUR',
        bookingHoldMinutes: 20
      }
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; displayCurrency=${data.displayCurrency}; bookingHoldMinutes=${data.bookingHoldMinutes}`;
  });

  await runCase('TC_SET_03', async () => {
    const response = await request(`${API_BASE_URL}/settings`, {
      method: 'PATCH',
      token: state.tokens.user,
      body: {
        displayCurrency: 'USD'
      }
    });
    expectStatus(response, 403);
    return `HTTP 403; code=${errorCode(response)}`;
  });

  await runCase('TC_SET_04', async () => {
    const response = await request(`${API_BASE_URL}/settings`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: {
        displayCurrency: 'JPY'
      }
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_SET_05', async () => {
    const response = await request(`${API_BASE_URL}/settings`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: {
        bookingHoldMinutes: 0
      }
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });
}

async function runCourtCases() {
  await runCase('TC_COURT_01', async () => {
    const response = await request(`${API_BASE_URL}/courts`, {
      token: state.tokens.user
    });
    expectStatus(response, 200);
    const data = successData(response);
    const inactiveVisible = data.some((court) => court.id === state.courts.inactive.id);
    requireCondition(!inactiveVisible, 'Inactive court leaked to normal user');
    return `HTTP 200; returned ${data.length} sân active; sân inactive test không xuất hiện`;
  });

  await runCase('TC_COURT_02', async () => {
    const response = await request(`${API_BASE_URL}/courts?includeInactive=true`, {
      token: state.tokens.admin
    });
    expectStatus(response, 200);
    const data = successData(response);
    const inactiveVisible = data.some((court) => court.id === state.courts.inactive.id);
    requireCondition(inactiveVisible, 'Inactive court missing for admin');
    return `HTTP 200; admin thấy sân inactive id=${state.courts.inactive.id}`;
  });

  await runCase('TC_COURT_03', async () => {
    const response = await request(`${API_BASE_URL}/courts?includeInactive=true`, {
      token: state.tokens.user
    });
    expectStatus(response, 200);
    const data = successData(response);
    const inactiveVisible = data.some((court) => court.id === state.courts.inactive.id);
    requireCondition(!inactiveVisible, 'Inactive court should not be visible to normal user');
    return `HTTP 200; includeInactive bị bỏ qua với user thường`;
  });

  await runCase('TC_COURT_04', async () => {
    const response = await request(`${API_BASE_URL}/courts/${state.courts.main.id}`, {
      token: state.tokens.user
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; court=${data.name}; slots=${data.slots.length}`;
  });

  await runCase('TC_COURT_05', async () => {
    const response = await request(`${API_BASE_URL}/courts/${state.courts.inactive.id}`, {
      token: state.tokens.user
    });
    expectStatus(response, 404);
    return `HTTP 404; code=${errorCode(response)}`;
  });

  await runCase('TC_COURT_06', async () => {
    const response = await request(`${API_BASE_URL}/courts/${state.courts.inactive.id}`, {
      token: state.tokens.admin
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; admin đọc được sân inactive ${data.name}`;
  });

  await runCase('TC_COURT_07', async () => {
    const response = await request(
      `${API_BASE_URL}/courts/${state.courts.main.id}/availability?date=${BOOKING_DATE}`,
      { token: state.tokens.user }
    );
    expectStatus(response, 200);
    const data = successData(response);
    requireCondition(Array.isArray(data.slots) && data.slots.length >= 3, 'Missing availability slots');
    return `HTTP 200; availability trả ${data.slots.length} slot; trạng thái đầu tiên=${data.slots[0].status}`;
  });

  await runCase('TC_COURT_08', async () => {
    const response = await request(
      `${API_BASE_URL}/courts/${state.courts.main.id}/availability?date=10-06-2026`,
      { token: state.tokens.user }
    );
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_COURT_09', async () => {
    const response = await request(`${API_BASE_URL}/courts/999999/availability?date=${BOOKING_DATE}`, {
      token: state.tokens.user
    });
    expectStatus(response, 404);
    return `HTTP 404; code=${errorCode(response)}`;
  });
}

async function runRecommendationCases() {
  await runCase('TC_REC_01', async () => {
    const response = await request(`${API_BASE_URL}/recommendations/courts?date=${BOOKING_DATE}`, {
      token: state.tokens.user
    });
    expectStatus(response, 200);
    const data = successData(response);
    requireCondition(Array.isArray(data.recommendedOptions), 'Missing recommendedOptions');
    return `HTTP 200; strategy=${data.strategy}; aiStatus=${data.aiStatus}; options=${data.recommendedOptions.length}`;
  });

  await runCase('TC_REC_02', async () => {
    stopContainer('badminton-ai-service');
    try {
      let response;
      try {
        response = await request(`${API_BASE_URL}/recommendations/courts?date=${BOOKING_DATE}`, {
          token: state.tokens.user
        });
      } catch (error) {
        throw new Error(`Request tới backend thất bại khi AI service dừng: ${error.message}`);
      }
      expectStatus(response, 200);
      const data = successData(response);
      requireCondition(data.aiStatus === 'unavailable', `Unexpected aiStatus ${data.aiStatus}`);
      requireCondition(data.strategy === 'fallback', `Unexpected strategy ${data.strategy}`);
      return `HTTP 200; aiStatus=${data.aiStatus}; strategy=${data.strategy}; options=${data.recommendedOptions.length}`;
    } finally {
      startContainer('badminton-ai-service');
      await waitForHttpOk(`${AI_BASE_URL}/health`);
    }
  });

  await runCase('TC_REC_03', async () => {
    sql(`
      INSERT INTO bookings (
        user_id, court_id, slot_id, booking_date, status, amount_vnd, currency,
        confirmed_at, created_at, updated_at
      )
      SELECT
        ${Number(state.users.user.id)},
        cs.court_id,
        cs.id,
        DATE '${FULLY_BOOKED_DATE}',
        'CONFIRMED',
        cs.price_vnd,
        'VND',
        NOW(),
        NOW(),
        NOW()
      FROM court_slots cs
      JOIN courts c ON c.id = cs.court_id
      WHERE c.is_active = TRUE
        AND cs.is_active = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.court_id = cs.court_id
            AND b.slot_id = cs.id
            AND b.booking_date = DATE '${FULLY_BOOKED_DATE}'
            AND b.status IN ('LOCKED', 'CONFIRMED')
        );
    `);

    const response = await request(`${API_BASE_URL}/recommendations/courts?date=${FULLY_BOOKED_DATE}`, {
      token: state.tokens.user
    });
    expectStatus(response, 200);
    const data = successData(response);
    requireCondition(data.recommendedOptions.length === 0, 'Expected zero recommendations');
    return `HTTP 200; strategy=${data.strategy}; recommendedOptions=0`;
  });

  await runCase('TC_REC_04', async () => {
    const response = await request(`${API_BASE_URL}/recommendations/courts`, {
      token: state.tokens.user
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_REC_05', async () => {
    const response = await request(`${API_BASE_URL}/recommendations/courts?date=${BOOKING_DATE}`);
    expectStatus(response, 401);
    return `HTTP 401; code=${errorCode(response)}`;
  });
}

async function runBookingAndPaymentSetup() {
  const bookingResponse = await createBooking(
    state.tokens.user,
    state.courts.main.id,
    state.slots.primary.id,
    BOOKING_DATE
  );
  expectStatus(bookingResponse, 201);
  state.bookings.primaryLocked = successData(bookingResponse);
}

async function runBookingCases() {
  await runCase('TC_BOOK_01', async () => {
    return `HTTP 201; bookingId=${state.bookings.primaryLocked.id}; status=${state.bookings.primaryLocked.status}; lockExpiresAt=${state.bookings.primaryLocked.lockExpiresAt}`;
  });

  await runCase('TC_BOOK_02', async () => {
    const response = await createBooking(
      state.tokens.user2,
      state.courts.main.id,
      state.slots.primary.id,
      BOOKING_DATE
    );
    expectStatus(response, 409);
    return `HTTP 409; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_BOOK_04', async () => {
    const response = await createBooking(state.tokens.user, 999999, state.slots.primary.id, BOOKING_DATE);
    expectStatus(response, 404);
    return `HTTP 404; code=${errorCode(response)}`;
  });

  await runCase('TC_BOOK_05', async () => {
    const response = await createBooking(state.tokens.user, 1, state.slots.primary.id, BOOKING_DATE);
    expectStatus(response, 404);
    return `HTTP 404; code=${errorCode(response)}`;
  });

  await runCase('TC_BOOK_06', async () => {
    const response = await createBooking(state.tokens.user, state.courts.main.id, state.slots.primary.id, '10/06/2026');
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_BOOK_07', async () => {
    const response = await request(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      token: state.tokens.user,
      body: { courtId: state.courts.main.id }
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_BOOK_08', async () => {
    const response = await request(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      body: {
        courtId: state.courts.main.id,
        slotId: state.slots.primary.id,
        date: BOOKING_DATE
      }
    });
    expectStatus(response, 401);
    return `HTTP 401; code=${errorCode(response)}`;
  });
}

async function runPaymentCases() {
  await runCase('TC_PAY_01', async () => {
    const response = await createPaymentIntent(state.tokens.user, state.bookings.primaryLocked.id);
    expectStatus(response, 201);
    const data = successData(response);
    state.bookings.primaryPayment = data;
    return `HTTP 201; transferCode=${data.transferCode}; amountVnd=${data.amountVnd}; bookingStatus=${data.bookingStatus}`;
  });

  await runCase('TC_PAY_02', async () => {
    const response = await createPaymentIntent(state.tokens.user2, state.bookings.primaryLocked.id);
    expectStatus(response, 403);
    return `HTTP 403; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_PAY_05', async () => {
    const response = await sendWebhook({
      eventId: `${RUN_ID}-pay-ok-1`,
      transferCode: state.bookings.primaryPayment.transferCode,
      amountVnd: state.bookings.primaryPayment.amountVnd
    });
    expectStatus(response, 200);
    const booking = sqlJson(`
      SELECT json_build_object('status', status, 'confirmed_at', confirmed_at)
      FROM bookings
      WHERE id = ${Number(state.bookings.primaryLocked.id)};
    `);
    requireCondition(booking.status === 'CONFIRMED', `Expected CONFIRMED but got ${booking.status}`);
    state.bookings.primaryConfirmed = booking;
    return `HTTP 200 webhook; booking status sau webhook=${booking.status}`;
  });

  await runCase('TC_BOOK_03', async () => {
    const response = await createBooking(
      state.tokens.user2,
      state.courts.main.id,
      state.slots.primary.id,
      BOOKING_DATE
    );
    expectStatus(response, 409);
    return `HTTP 409; slot đã CONFIRMED nên không đặt lại được; code=${errorCode(response)}`;
  });

  await runCase('TC_PAY_03', async () => {
    const response = await createPaymentIntent(state.tokens.user, state.bookings.primaryLocked.id);
    expectStatus(response, 409);
    return `HTTP 409; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_PAY_06', async () => {
    const response = await sendWebhook({
      secret: false,
      eventId: `${RUN_ID}-pay-bad-secret`,
      transferCode: state.bookings.primaryPayment.transferCode,
      amountVnd: state.bookings.primaryPayment.amountVnd
    });
    expectStatus(response, 401);
    return `HTTP 401; code=${errorCode(response)}`;
  });

  await runCase('TC_PAY_08', async () => {
    const response = await sendWebhook({
      eventId: `${RUN_ID}-pay-ok-1`,
      transferCode: state.bookings.primaryPayment.transferCode,
      amountVnd: state.bookings.primaryPayment.amountVnd
    });
    expectStatus(response, 200);
    const eventCount = Number(sql(`SELECT COUNT(*) FROM payment_events WHERE event_id = '${escapeSql(`${RUN_ID}-pay-ok-1`)}';`));
    requireCondition(eventCount === 1, `Expected 1 payment_event row but got ${eventCount}`);
    return `HTTP 200; duplicate webhook không tạo thêm event; payment_events count=${eventCount}`;
  });

  await runCase('TC_PAY_07', async () => {
    const lockedResponse = await createBooking(
      state.tokens.user,
      state.courts.main.id,
      state.slots.secondary.id,
      BOOKING_DATE
    );
    expectStatus(lockedResponse, 201);
    state.bookings.amountMismatch = successData(lockedResponse);

    const paymentIntentResponse = await createPaymentIntent(state.tokens.user, state.bookings.amountMismatch.id);
    expectStatus(paymentIntentResponse, 201);
    const paymentIntent = successData(paymentIntentResponse);

    const webhookResponse = await sendWebhook({
      eventId: `${RUN_ID}-pay-mismatch`,
      transferCode: paymentIntent.transferCode,
      amountVnd: paymentIntent.amountVnd - 1
    });
    expectStatus(webhookResponse, 200);
    const bookingStatus = sql(`SELECT status FROM bookings WHERE id = ${Number(state.bookings.amountMismatch.id)};`);
    const paymentStatus = sql(`SELECT status FROM payments WHERE booking_id = ${Number(state.bookings.amountMismatch.id)};`);
    requireCondition(bookingStatus === 'LOCKED', `Expected LOCKED but got ${bookingStatus}`);
    requireCondition(paymentStatus === 'pending', `Expected payment pending but got ${paymentStatus}`);
    return `HTTP 200 webhook; amount mismatch không confirm thanh toán; booking=${bookingStatus}; payment=${paymentStatus}`;
  });

  await runCase('TC_PAY_04', async () => {
    const lockedResponse = await createBooking(
      state.tokens.user,
      state.courts.main.id,
      state.slots.third.id,
      BOOKING_DATE
    );
    expectStatus(lockedResponse, 201);
    state.bookings.expiredIntent = successData(lockedResponse);

    sql(`
      UPDATE bookings
      SET lock_expires_at = NOW() - INTERVAL '5 minutes'
      WHERE id = ${Number(state.bookings.expiredIntent.id)};
    `);

    const response = await createPaymentIntent(state.tokens.user, state.bookings.expiredIntent.id);
    expectStatus(response, 409);
    return `HTTP 409; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_PAY_09', async () => {
    const newSlotResponse = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots`, {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        label: 'Expiry Slot',
        startTime: '21:00',
        endTime: '22:00',
        priceVnd: 150000
      }
    });
    expectStatus(newSlotResponse, 201);
    const expirySlot = successData(newSlotResponse);

    const lockedResponse = await createBooking(state.tokens.user, state.courts.main.id, expirySlot.id, BOOKING_DATE);
    expectStatus(lockedResponse, 201);
    const booking = successData(lockedResponse);
    const paymentIntentResponse = await createPaymentIntent(state.tokens.user, booking.id);
    expectStatus(paymentIntentResponse, 201);
    const paymentIntent = successData(paymentIntentResponse);

    sql(`
      UPDATE bookings
      SET lock_expires_at = NOW() - INTERVAL '10 minutes'
      WHERE id = ${Number(booking.id)};
    `);

    const webhookResponse = await sendWebhook({
      eventId: `${RUN_ID}-pay-expired`,
      transferCode: paymentIntent.transferCode,
      amountVnd: paymentIntent.amountVnd
    });
    expectStatus(webhookResponse, 200);
    const status = sql(`SELECT status FROM bookings WHERE id = ${Number(booking.id)};`);
    requireCondition(status === 'CANCELLED', `Expected CANCELLED but got ${status}`);
    return `HTTP 200 webhook; booking chuyển ${status} khi lock đã hết hạn`;
  });
}

async function runHistoryCases() {
  await runCase('TC_HIS_01', async () => {
    const response = await request(`${API_BASE_URL}/bookings/user/${state.users.user.id}?page=1&limit=20`, {
      token: state.tokens.user
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; items=${data.items.length}; total=${data.pagination.total}`;
  });

  await runCase('TC_HIS_02', async () => {
    const response = await request(`${API_BASE_URL}/bookings/user/${state.users.user2.id}`, {
      token: state.tokens.user
    });
    expectStatus(response, 403);
    return `HTTP 403; code=${errorCode(response)}`;
  });

  await runCase('TC_HIS_03', async () => {
    const newSlotResponse = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots`, {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        label: 'Cancel Slot',
        startTime: '22:00',
        endTime: '23:00',
        priceVnd: 160000
      }
    });
    expectStatus(newSlotResponse, 201);
    const cancelSlot = successData(newSlotResponse);
    const lockedResponse = await createBooking(state.tokens.user, state.courts.main.id, cancelSlot.id, BOOKING_DATE);
    expectStatus(lockedResponse, 201);
    const booking = successData(lockedResponse);
    const response = await request(`${API_BASE_URL}/bookings/${booking.id}`, {
      method: 'DELETE',
      token: state.tokens.user
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; bookingId=${data.id}; status=${data.status}`;
  });

  await runCase('TC_HIS_04', async () => {
    const slotResponse = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots`, {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        label: 'Refund Slot',
        startTime: '17:00',
        endTime: '18:00',
        priceVnd: 110000
      }
    });
    expectStatus(slotResponse, 201);
    const slot = successData(slotResponse);
    const lockedResponse = await createBooking(state.tokens.user, state.courts.main.id, slot.id, REFUND_DATE);
    expectStatus(lockedResponse, 201);
    const booking = successData(lockedResponse);
    const paymentIntentResponse = await createPaymentIntent(state.tokens.user, booking.id);
    expectStatus(paymentIntentResponse, 201);
    const paymentIntent = successData(paymentIntentResponse);
    const webhookResponse = await sendWebhook({
      eventId: `${RUN_ID}-refund-webhook`,
      transferCode: paymentIntent.transferCode,
      amountVnd: paymentIntent.amountVnd
    });
    expectStatus(webhookResponse, 200);

    const response = await request(`${API_BASE_URL}/bookings/${booking.id}`, {
      method: 'DELETE',
      token: state.tokens.user
    });
    expectStatus(response, 200);
    const refunded = successData(response);
    state.bookings.refunded = refunded;
    requireCondition(refunded.status === 'REFUNDED', `Expected REFUNDED but got ${refunded.status}`);
    requireCondition(refunded.refundAmountVnd === Math.floor(refunded.amountVnd * 0.7), 'Unexpected refund amount');
    return `HTTP 200; status=${refunded.status}; refundAmountVnd=${refunded.refundAmountVnd}`;
  });

  await runCase('TC_HIS_05', async () => {
    const lockedResponse = await createBooking(
      state.tokens.user,
      state.courts.main.id,
      state.slots.nearNow.id,
      EXPIRED_REFUND_DATE
    );
    expectStatus(lockedResponse, 201);
    const booking = successData(lockedResponse);
    const paymentIntentResponse = await createPaymentIntent(state.tokens.user, booking.id);
    expectStatus(paymentIntentResponse, 201);
    const paymentIntent = successData(paymentIntentResponse);
    const webhookResponse = await sendWebhook({
      eventId: `${RUN_ID}-near-refund`,
      transferCode: paymentIntent.transferCode,
      amountVnd: paymentIntent.amountVnd
    });
    expectStatus(webhookResponse, 200);
    const response = await request(`${API_BASE_URL}/bookings/${booking.id}`, {
      method: 'DELETE',
      token: state.tokens.user
    });
    expectStatus(response, 409);
    return `HTTP 409; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_HIS_06', async () => {
    const slotResponse = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots`, {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        label: 'Complete Slot',
        startTime: '16:00',
        endTime: '17:00',
        priceVnd: 100000
      }
    });
    expectStatus(slotResponse, 201);
    const slot = successData(slotResponse);
    const lockedResponse = await createBooking(state.tokens.user, state.courts.main.id, slot.id, REFUND_DATE);
    expectStatus(lockedResponse, 201);
    const booking = successData(lockedResponse);
    const completeResponse = await request(`${API_BASE_URL}/bookings/${booking.id}/complete`, {
      method: 'PATCH',
      token: state.tokens.admin
    });
    expectStatus(completeResponse, 200);
    const cancelResponse = await request(`${API_BASE_URL}/bookings/${booking.id}`, {
      method: 'DELETE',
      token: state.tokens.user
    });
    expectStatus(cancelResponse, 409);
    return `HTTP 409; code=${errorCode(cancelResponse)}; message=${errorMessage(cancelResponse)}`;
  });

  await runCase('TC_HIS_07', async () => {
    const response = await request(`${API_BASE_URL}/bookings/${state.bookings.refunded.id}`, {
      method: 'DELETE',
      token: state.tokens.user
    });
    expectStatus(response, 409);
    return `HTTP 409; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });
}

async function runAdminCourtCases() {
  await runCase('TC_ACOURT_02', async () => {
    return `HTTP 201; tạo sân test id=${state.courts.main.id}; name=${state.courts.main.name}`;
  });

  await runCase('TC_ACOURT_03', async () => {
    const response = await request(`${API_BASE_URL}/courts`, {
      method: 'POST',
      token: state.tokens.admin,
      body: {}
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_ACOURT_04', async () => {
    const response = await request(`${API_BASE_URL}/courts/${state.courts.main.id}`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: {
        name: `${RUN_ID} Court Main Updated`,
        location: 'QA Zone Updated'
      }
    });
    expectStatus(response, 200);
    state.courts.main = successData(response);
    return `HTTP 200; name=${state.courts.main.name}; location=${state.courts.main.location}`;
  });

  await runCase('TC_ACOURT_05', async () => {
    const hideResponse = await request(`${API_BASE_URL}/courts/${state.courts.main.id}`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: { isActive: false }
    });
    expectStatus(hideResponse, 200);
    const showResponse = await request(`${API_BASE_URL}/courts/${state.courts.main.id}`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: { isActive: true }
    });
    expectStatus(showResponse, 200);
    state.courts.main = successData(showResponse);
    return `HTTP 200; toggle isActive false->true thành công`;
  });

  await runCase('TC_ACOURT_06', async () => {
    const response = await request(`${API_BASE_URL}/courts/${state.courts.inactive.id}`, {
      method: 'DELETE',
      token: state.tokens.admin
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; delete mềm sân id=${data.id}; isActive=${data.isActive}`;
  });

  await runCase('TC_ACOURT_07', async () => {
    const response = await request(`${API_BASE_URL}/courts`, {
      method: 'POST',
      token: state.tokens.user,
      body: { name: `${RUN_ID} Forbidden Court` }
    });
    expectStatus(response, 403);
    return `HTTP 403; code=${errorCode(response)}`;
  });

  await runCase('TC_ACOURT_08', async () => {
    return `HTTP 201; slot primary id=${state.slots.primary.id}; time=${state.slots.primary.startTime}-${state.slots.primary.endTime}`;
  });

  await runCase('TC_ACOURT_09', async () => {
    const response = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots`, {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        startTime: '19:00',
        endTime: '18:00',
        priceVnd: 120000
      }
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_ACOURT_10', async () => {
    const response = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots`, {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        startTime: '18:00',
        endTime: '19:00',
        priceVnd: 120000
      }
    });
    expectStatus(response, 409);
    return `HTTP 409; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_ACOURT_11', async () => {
    const response = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots/${state.slots.primary.id}`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: {
        priceVnd: 150000
      }
    });
    expectStatus(response, 200);
    state.slots.primary = successData(response);
    return `HTTP 200; slot id=${state.slots.primary.id}; priceVnd=${state.slots.primary.priceVnd}`;
  });

  await runCase('TC_ACOURT_12', async () => {
    const response = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots/${state.slots.primary.id}`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: {
        priceVnd: 0
      }
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_ACOURT_13', async () => {
    const response = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots/${state.slots.secondary.id}`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: {
        isActive: false
      }
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; slot id=${data.id}; isActive=${data.isActive}`;
  });

  await runCase('TC_ACOURT_14', async () => {
    const response = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots/999999`, {
      method: 'DELETE',
      token: state.tokens.admin
    });
    expectStatus(response, 404);
    return `HTTP 404; code=${errorCode(response)}`;
  });
}

async function runAdminUserCases() {
  await runCase('TC_AUSER_02', async () => {
    return `HTTP 201; tạo user id=${state.users.user2.id}; email=${state.users.user2.email}`;
  });

  await runCase('TC_AUSER_03', async () => {
    return `HTTP 201; tạo admin id=${state.users.admin2.id}; email=${state.users.admin2.email}`;
  });

  await runCase('TC_AUSER_04', async () => {
    const response = await request(`${API_BASE_URL}/users`, {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        username: `${RUN_ID}_dup_user`,
        email: state.users.user2.email,
        phone: `096${String(Date.now()).slice(-7)}`,
        password: 'secret123'
      }
    });
    expectStatus(response, 409);
    return `HTTP 409; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_AUSER_05', async () => {
    const response = await request(`${API_BASE_URL}/users/${state.users.user2.id}`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: {
        fullName: 'User Two Updated',
        phone: `097${String(Date.now()).slice(-7)}`,
        email: `${RUN_ID}_user2_updated@example.com`,
        username: `${RUN_ID}_user2_updated`
      }
    });
    expectStatus(response, 200);
    state.users.user2 = successData(response);
    return `HTTP 200; username=${state.users.user2.username}; email=${state.users.user2.email}`;
  });

  await runCase('TC_AUSER_06', async () => {
    const promoteResponse = await request(`${API_BASE_URL}/users/${state.users.user2.id}`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: { role: 'admin' }
    });
    expectStatus(promoteResponse, 200);
    const demoteResponse = await request(`${API_BASE_URL}/users/${state.users.user2.id}`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: { role: 'user' }
    });
    expectStatus(demoteResponse, 200);
    state.users.user2 = successData(demoteResponse);
    return `HTTP 200; promote->demote user id=${state.users.user2.id} thành công`;
  });

  await runCase('TC_AUSER_07', async () => {
    const deactivateAdmin2 = await request(`${API_BASE_URL}/users/${state.users.admin2.id}`, {
      method: 'DELETE',
      token: state.tokens.admin
    });
    expectStatus(deactivateAdmin2, 200);
    const response = await request(`${API_BASE_URL}/users/${state.users.admin.id}/role`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: { role: 'user' }
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_AUSER_08', async () => {
    const response = await request(`${API_BASE_URL}/users/${state.users.admin.id}`, {
      method: 'DELETE',
      token: state.tokens.admin
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_AUSER_09', async () => {
    const response = await request(`${API_BASE_URL}/users/${state.users.user2.id}/password`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: { password: 'temp123' }
    });
    expectStatus(response, 200);
    const relogin = await login(state.users.user2.email, 'temp123');
    state.tokens.user2 = relogin.accessToken;
    return `HTTP 200; reset password thành công; user đăng nhập lại được`;
  });

  await runCase('TC_AUSER_10', async () => {
    const response = await request(`${API_BASE_URL}/users/${state.users.user2.id}/password`, {
      method: 'PATCH',
      token: state.tokens.admin,
      body: { password: '123' }
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_AUSER_11', async () => {
    const response = await request(`${API_BASE_URL}/users`, {
      token: state.tokens.user
    });
    expectStatus(response, 403);
    return `HTTP 403; code=${errorCode(response)}`;
  });
}

async function runAdminBookingCases() {
  await runCase('TC_ABOOK_01', async () => {
    const response = await request(`${API_BASE_URL}/bookings?page=1&limit=20`, {
      token: state.tokens.admin
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; items=${data.items.length}; total=${data.pagination.total}`;
  });

  await runCase('TC_ABOOK_02', async () => {
    const response = await request(
      `${API_BASE_URL}/bookings?userName=john&status=CONFIRMED&dateFrom=${BOOKING_DATE}&dateTo=${BOOKING_DATE}`,
      { token: state.tokens.admin }
    );
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; filtered items=${data.items.length}`;
  });

  await runCase('TC_ABOOK_03', async () => {
    const response = await request(`${API_BASE_URL}/bookings?status=PAID`, {
      token: state.tokens.admin
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_ABOOK_04', async () => {
    const response = await request(
      `${API_BASE_URL}/bookings?dateFrom=2026-06-30&dateTo=2026-06-01`,
      { token: state.tokens.admin }
    );
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_ABOOK_05', async () => {
    const slotResponse = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots`, {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        label: 'Admin Complete Locked Slot',
        startTime: '13:00',
        endTime: '14:00',
        priceVnd: 100000
      }
    });
    expectStatus(slotResponse, 201);
    const slot = successData(slotResponse);
    const bookingResponse = await createBooking(state.tokens.user, state.courts.main.id, slot.id, REFUND_DATE);
    expectStatus(bookingResponse, 201);
    const booking = successData(bookingResponse);
    const completeResponse = await request(`${API_BASE_URL}/bookings/${booking.id}/complete`, {
      method: 'PATCH',
      token: state.tokens.admin
    });
    expectStatus(completeResponse, 200);
    const completed = successData(completeResponse);
    return `HTTP 200; bookingId=${completed.id}; status=${completed.status}`;
  });

  await runCase('TC_ABOOK_06', async () => {
    const slotResponse = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots`, {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        label: 'Admin Complete Confirmed Slot',
        startTime: '14:00',
        endTime: '15:00',
        priceVnd: 105000
      }
    });
    expectStatus(slotResponse, 201);
    const slot = successData(slotResponse);
    const bookingResponse = await createBooking(state.tokens.user, state.courts.main.id, slot.id, REFUND_DATE);
    expectStatus(bookingResponse, 201);
    const booking = successData(bookingResponse);
    const paymentIntentResponse = await createPaymentIntent(state.tokens.user, booking.id);
    expectStatus(paymentIntentResponse, 201);
    const paymentIntent = successData(paymentIntentResponse);
    const webhookResponse = await sendWebhook({
      eventId: `${RUN_ID}-admin-complete-confirmed`,
      transferCode: paymentIntent.transferCode,
      amountVnd: paymentIntent.amountVnd
    });
    expectStatus(webhookResponse, 200);
    const completeResponse = await request(`${API_BASE_URL}/bookings/${booking.id}/complete`, {
      method: 'PATCH',
      token: state.tokens.admin
    });
    expectStatus(completeResponse, 200);
    const completed = successData(completeResponse);
    return `HTTP 200; bookingId=${completed.id}; status=${completed.status}`;
  });

  await runCase('TC_ABOOK_07', async () => {
    const cancelledResponse = await request(`${API_BASE_URL}/bookings/${state.bookings.refunded.id}/complete`, {
      method: 'PATCH',
      token: state.tokens.admin
    });
    expectStatus(cancelledResponse, 409);
    return `HTTP 409; code=${errorCode(cancelledResponse)}; message=${errorMessage(cancelledResponse)}`;
  });

  await runCase('TC_ABOOK_08', async () => {
    const slotResponse = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots`, {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        label: 'Admin Cancel Slot',
        startTime: '12:00',
        endTime: '13:00',
        priceVnd: 95000
      }
    });
    expectStatus(slotResponse, 201);
    const slot = successData(slotResponse);
    const bookingResponse = await createBooking(state.tokens.user, state.courts.main.id, slot.id, REFUND_DATE);
    expectStatus(bookingResponse, 201);
    const booking = successData(bookingResponse);
    const cancelResponse = await request(`${API_BASE_URL}/bookings/${booking.id}`, {
      method: 'DELETE',
      token: state.tokens.admin
    });
    expectStatus(cancelResponse, 200);
    const cancelled = successData(cancelResponse);
    return `HTTP 200; bookingId=${cancelled.id}; status=${cancelled.status}`;
  });

  await runCase('TC_ABOOK_09', async () => {
    const slotResponse = await request(`${API_BASE_URL}/courts/${state.courts.main.id}/slots`, {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        label: 'Admin Refund Slot',
        startTime: '15:00',
        endTime: '16:00',
        priceVnd: 98000
      }
    });
    expectStatus(slotResponse, 201);
    const slot = successData(slotResponse);
    const bookingResponse = await createBooking(state.tokens.user, state.courts.main.id, slot.id, REFUND_DATE);
    expectStatus(bookingResponse, 201);
    const booking = successData(bookingResponse);
    const paymentIntentResponse = await createPaymentIntent(state.tokens.user, booking.id);
    expectStatus(paymentIntentResponse, 201);
    const paymentIntent = successData(paymentIntentResponse);
    const webhookResponse = await sendWebhook({
      eventId: `${RUN_ID}-admin-refund`,
      transferCode: paymentIntent.transferCode,
      amountVnd: paymentIntent.amountVnd
    });
    expectStatus(webhookResponse, 200);
    const refundResponse = await request(`${API_BASE_URL}/bookings/${booking.id}`, {
      method: 'DELETE',
      token: state.tokens.admin
    });
    expectStatus(refundResponse, 200);
    const refunded = successData(refundResponse);
    return `HTTP 200; bookingId=${refunded.id}; status=${refunded.status}; refundAmountVnd=${refunded.refundAmountVnd}`;
  });
}

async function runAnalyticsCases() {
  await runCase('TC_ANALYTICS_01', async () => {
    const response = await request(`${API_BASE_URL}/analytics/overview`, {
      token: state.tokens.admin
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; stats.totalBookings=${data.stats.totalBookings}; recentBookings=${data.recentBookings.length}`;
  });

  await runCase('TC_ANALYTICS_02', async () => {
    stopContainer('badminton-ai-service');
    try {
      let response;
      try {
        response = await request(`${API_BASE_URL}/analytics/overview`, {
          token: state.tokens.admin
        });
      } catch (error) {
        throw new Error(`Request tới analytics overview thất bại khi AI service dừng: ${error.message}`);
      }
      expectStatus(response, 200);
      const data = successData(response);
      requireCondition(data.aiInsights.status === 'unavailable', `Unexpected ai status ${data.aiInsights.status}`);
      return `HTTP 200; aiInsights.status=${data.aiInsights.status}; strategy=${data.aiInsights.strategy}`;
    } finally {
      startContainer('badminton-ai-service');
      await waitForHttpOk(`${AI_BASE_URL}/health`);
    }
  });

  await runCase('TC_ANALYTICS_03', async () => {
    const response = await request(`${API_BASE_URL}/analytics/overview`, {
      token: state.tokens.user
    });
    expectStatus(response, 403);
    return `HTTP 403; code=${errorCode(response)}`;
  });

  await runCase('TC_ANALYTICS_04', async () => {
    const response = await request(`${API_BASE_URL}/analytics/revenue?start_date=2026-06-01&end_date=2026-06-30`, {
      token: state.tokens.admin
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; totalRevenueVnd=${data.totalRevenueVnd}; dailySeries=${data.dailySeries.length}`;
  });

  await runCase('TC_ANALYTICS_05', async () => {
    const response = await request(`${API_BASE_URL}/analytics/revenue?start_date=2026-06-01`, {
      token: state.tokens.admin
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_ANALYTICS_06', async () => {
    const response = await request(`${API_BASE_URL}/analytics/revenue?start_date=2026-06-30&end_date=2026-06-01`, {
      token: state.tokens.admin
    });
    expectStatus(response, 400);
    return `HTTP 400; code=${errorCode(response)}; message=${errorMessage(response)}`;
  });

  await runCase('TC_ANALYTICS_07', async () => {
    const response = await request(`${API_BASE_URL}/analytics/peak-hours?start_date=2026-06-01&end_date=2026-06-30`, {
      token: state.tokens.admin
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; peak-hours rows=${data.length}`;
  });

  await runCase('TC_ANALYTICS_08', async () => {
    const response = await request(`${API_BASE_URL}/analytics/utilization?start_date=2026-06-01&end_date=2026-06-30`, {
      token: state.tokens.admin
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; utilizationPercent=${data.utilizationPercent}; confirmedSlots=${data.confirmedSlots}`;
  });

  await runCase('TC_ANALYTICS_09', async () => {
    const response = await request(`${API_BASE_URL}/analytics/utilization-by-court`, {
      token: state.tokens.admin
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; utilization-by-court rows=${data.length}`;
  });

  await runCase('TC_ANALYTICS_10', async () => {
    const response = await request(`${API_BASE_URL}/analytics/top-users?start_date=2026-06-01&end_date=2026-06-30&limit=5`, {
      token: state.tokens.admin
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; top-users rows=${data.length}`;
  });

  await runCase('TC_ANALYTICS_11', async () => {
    const response = await request(`${API_BASE_URL}/analytics/summary`, {
      token: state.tokens.admin
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; totalRevenueVnd=${data.totalRevenueVnd}; totalBookings=${data.totalBookings}`;
  });
}

async function runAiCases() {
  await runCase('TC_AI_01', async () => {
    const response = await request(`${AI_BASE_URL}/health`);
    expectStatus(response, 200);
    return `HTTP 200; status=${response.payload.status}; service=${response.payload.service}`;
  });

  await runCase('TC_AI_02', async () => {
    const response = await request(`${AI_BASE_URL}/ai/recommendation/1`);
    expectStatus(response, 200);
    requireCondition(Array.isArray(response.payload.recommended_slots), 'recommended_slots missing');
    return `HTTP 200; recommended_slots=${response.payload.recommended_slots.join(', ')}`;
  });

  await runCase('TC_AI_03', async () => {
    const response = await request(`${AI_BASE_URL}/ai/recommendation/0`);
    expectStatus(response, 400);
    return `HTTP 400; detail=${response.payload.detail}`;
  });

  await runCase('TC_AI_04', async () => {
    const response = await request(`${AI_BASE_URL}/ai/recommendations/score`, {
      method: 'POST',
      body: {
        user: { id: 1 },
        targetDate: BOOKING_DATE,
        availableSlots: [
          {
            courtId: 1,
            courtName: 'Court A',
            location: 'Building 1',
            slotId: 1,
            startTime: '18:00',
            endTime: '19:00',
            priceVnd: 120000
          },
          {
            courtId: 2,
            courtName: 'Court B',
            location: 'Building 2',
            slotId: 2,
            startTime: '19:00',
            endTime: '20:00',
            priceVnd: 100000
          }
        ],
        history: [
          {
            bookingDate: '2026-05-20',
            courtId: 1,
            courtName: 'Court A',
            startTime: '18:00',
            endTime: '19:00',
            priceVnd: 120000
          }
        ]
      }
    });
    expectStatus(response, 200);
    return `HTTP 200; strategy=${response.payload.strategy}; recommendedOptions=${response.payload.recommendedOptions.length}`;
  });

  await runCase('TC_AI_05', async () => {
    const response = await request(`${AI_BASE_URL}/ai/recommendations/score`, {
      method: 'POST',
      body: {
        user: { id: 99 },
        targetDate: BOOKING_DATE,
        availableSlots: [
          {
            courtId: 1,
            courtName: 'Court A',
            location: 'Building 1',
            slotId: 1,
            startTime: '18:00',
            endTime: '19:00',
            priceVnd: 120000
          }
        ],
        history: []
      }
    });
    expectStatus(response, 200);
    return `HTTP 200; strategy=${response.payload.strategy}; recommendedOptions=${response.payload.recommendedOptions.length}`;
  });

  await runCase('TC_AI_06', async () => {
    const response = await request(`${AI_BASE_URL}/ai/recommendations/score`, {
      method: 'POST',
      body: {
        user: { id: 99 },
        targetDate: BOOKING_DATE,
        availableSlots: [],
        history: []
      }
    });
    expectStatus(response, 200);
    return `HTTP 200; strategy=${response.payload.strategy}; recommendedOptions=${response.payload.recommendedOptions.length}`;
  });

  await runCase('TC_AI_07', async () => {
    const response = await request(`${AI_BASE_URL}/ai/admin-insights`, {
      method: 'POST',
      body: {
        stats: {
          totalRevenueVnd: 1000000,
          totalBookings: 50,
          activeUsers: 10,
          avgUtilizationPercent: 65
        },
        revenueSeries: [
          { date: '2026-05-01', revenueVnd: 100000 },
          { date: '2026-05-02', revenueVnd: 120000 }
        ],
        peakHours: [
          { hour: 18, bookingCount: 10 },
          { hour: 19, bookingCount: 15 }
        ],
        utilizationByCourt: [
          { courtId: 1, courtName: 'Court A', utilizationPercent: 80, confirmedSlots: 16, totalAvailableSlots: 20 },
          { courtId: 2, courtName: 'Court B', utilizationPercent: 30, confirmedSlots: 6, totalAvailableSlots: 20 }
        ],
        alerts: [],
        revenueTrend: {
          direction: 'up',
          currentWindowRevenueVnd: 500000,
          previousWindowRevenueVnd: 400000,
          changePercent: 25
        }
      }
    });
    expectStatus(response, 200);
    return `HTTP 200; strategy=${response.payload.strategy}; recommendations=${response.payload.recommendations.length}`;
  });
}

async function runAdminUserListCase() {
  await runCase('TC_AUSER_01', async () => {
    const response = await request(`${API_BASE_URL}/users`, {
      token: state.tokens.admin
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; users=${data.length}; gồm cả admin/user test đã tạo`;
  });
}

async function runAdminCourtListCase() {
  await runCase('TC_ACOURT_01', async () => {
    const response = await request(`${API_BASE_URL}/courts?includeInactive=true`, {
      token: state.tokens.admin
    });
    expectStatus(response, 200);
    const data = successData(response);
    return `HTTP 200; courts=${data.length}; có sân active và inactive`;
  });
}

async function main() {
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  await waitForHttpOk(`${API_BASE_URL}/health`);
  await waitForHttpOk(`${AI_BASE_URL}/health`);

  await prepareBaseState();
  await runAuthCases();
  await runProfileCases();
  await runSettingsCases();
  await runCourtCases();
  await runRecommendationCases();
  await runBookingAndPaymentSetup();
  await runBookingCases();
  await runPaymentCases();
  await runHistoryCases();
  await runAdminCourtListCase();
  await runAdminCourtCases();
  await runAdminUserListCase();
  await runAdminUserCases();
  await runAdminBookingCases();
  await runAnalyticsCases();
  await runAiCases();

  await fs.writeFile(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ output: RESULTS_FILE, count: Object.keys(results).length }, null, 2));
}

main().catch(async (error) => {
  console.error(error);
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  await fs.writeFile(
    RESULTS_FILE,
    JSON.stringify(
      {
        fatal: error instanceof Error ? error.message : String(error),
        results
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
