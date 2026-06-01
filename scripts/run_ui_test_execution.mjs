import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(path.resolve('.automation/node_modules/playwright'));

const WEB_BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:4000';
const RESULTS_DIR = path.resolve('artifacts');
const RESULTS_FILE = path.join(RESULTS_DIR, 'ui-test-results.json');
const RUN_ID = `ui${Date.now()}`;
const TEST_DATE = datePlusDays(20);

const results = {};

function datePlusDays(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function record(id, status, actual) {
  results[id] = { status, actual };
}

async function runCase(id, fn) {
  try {
    const actual = await fn();
    record(id, 'Pass', actual);
  } catch (error) {
    record(id, 'Fail', error instanceof Error ? error.message : String(error));
  }
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function api(pathname, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json();
  return { status: response.status, payload };
}

async function login(identifier, password) {
  const response = await api('/auth/login', {
    method: 'POST',
    body: { identifier, password }
  });
  expect(response.status === 200, `Login failed for ${identifier}: ${JSON.stringify(response.payload)}`);
  return response.payload.data;
}

async function prepareBrowserPage(browser, auth = null) {
  const context = await browser.newContext();
  if (auth) {
    await context.addInitScript((value) => {
      window.localStorage.setItem('smart-badminton-token', value.token);
      window.localStorage.setItem('smart-badminton-user', JSON.stringify(value.user));
    }, auth);
  }

  const page = await context.newPage();
  return { context, page };
}

async function waitForPageReady(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

async function createUiCourt(adminToken) {
  const courtResponse = await api('/courts', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `${RUN_ID} Court UI`,
      location: 'Browser QA'
    }
  });
  expect(courtResponse.status === 201, `Create court failed: ${JSON.stringify(courtResponse.payload)}`);
  const court = courtResponse.payload.data;

  const slotResponse = await api(`/courts/${court.id}/slots`, {
    method: 'POST',
    token: adminToken,
    body: {
      label: 'UI Slot',
      startTime: '18:00',
      endTime: '19:00',
      priceVnd: 115000
    }
  });
  expect(slotResponse.status === 201, `Create slot failed: ${JSON.stringify(slotResponse.payload)}`);

  return {
    court,
    slot: slotResponse.payload.data
  };
}

async function main() {
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    const adminAuth = await login('admin@smartbadminton.com', 'admin123');
    const userAuth = await login('john@example.com', 'user123');

    await runCase('TC_AUTH_10', async () => {
      const { context, page } = await prepareBrowserPage(browser);
      try {
        await page.goto(`${WEB_BASE_URL}/dashboard`);
        await page.waitForURL(`${WEB_BASE_URL}/`, { timeout: 10000 });
        await waitForPageReady(page);
        const title = await page.locator('h2').first().textContent();
        return `UI redirect về ${new URL(page.url()).pathname}; heading=${title?.trim() || 'N/A'}`;
      } finally {
        await context.close();
      }
    });

    await runCase('TC_BOOK_09', async () => {
      const uiCourt = await createUiCourt(adminAuth.accessToken);
      const { context, page } = await prepareBrowserPage(browser, {
        token: userAuth.accessToken,
        user: userAuth.user
      });

      try {
        await page.goto(`${WEB_BASE_URL}/courts/${uiCourt.court.id}/booking?date=${TEST_DATE}`);
        await waitForPageReady(page);

        await page.getByRole('button', { name: /18:00 - 19:00/i }).click();
        await page.getByRole('button', { name: 'Xác nhận' }).click();
        await page.getByText('Đặt sân thành công').waitFor({ timeout: 10000 });
        await page.getByRole('button', { name: 'Đóng thông báo' }).click();
        await page.getByText('Đã khóa').waitFor({ timeout: 10000 });

        return `UI tạo booking thành công cho courtId=${uiCourt.court.id}; badge slot đổi sang "Đã khóa"`;
      } finally {
        await context.close();
      }
    });

    await runCase('TC_HIS_08', async () => {
      const { context, page } = await prepareBrowserPage(browser, {
        token: userAuth.accessToken,
        user: userAuth.user
      });

      try {
        await page.goto(`${WEB_BASE_URL}/bookings`);
        await waitForPageReady(page);

        await page.getByRole('heading', { name: 'Sân đang đặt' }).waitFor();
        await page.getByRole('heading', { name: 'Lịch sử đặt sân' }).waitFor();

        const activeRows = await page.locator('section').nth(0).locator('tbody tr').count();
        const historyRows = await page.locator('section').nth(1).locator('tbody tr').count();
        expect(activeRows > 0, 'No active booking rows found');
        expect(historyRows > 0, 'No history booking rows found');

        return `UI hiển thị 2 nhóm booking; activeRows=${activeRows}; historyRows=${historyRows}`;
      } finally {
        await context.close();
      }
    });

    await runCase('TC_UDASH_01', async () => {
      const { context, page } = await prepareBrowserPage(browser, {
        token: userAuth.accessToken,
        user: userAuth.user
      });

      try {
        await page.goto(`${WEB_BASE_URL}/dashboard`);
        await waitForPageReady(page);

        const labels = await page.locator('section').first().locator('h3, p').allTextContents();
        expect(labels.some((text) => text.includes('Tổng lượt đặt của tôi')), 'Missing total bookings card');
        expect(labels.some((text) => text.includes('Đã xác nhận')), 'Missing confirmed card');
        expect(labels.some((text) => text.includes('Đang chờ')), 'Missing pending card');

        const statTexts = await page.locator('section').first().textContent();
        return `UI dashboard render đủ stat cards; nội dung=${statTexts?.replace(/\s+/g, ' ').trim().slice(0, 180)}`;
      } finally {
        await context.close();
      }
    });

    await runCase('TC_UDASH_02', async () => {
      const { context, page } = await prepareBrowserPage(browser, {
        token: userAuth.accessToken,
        user: userAuth.user
      });

      try {
        await page.goto(`${WEB_BASE_URL}/dashboard`);
        await waitForPageReady(page);

        await page.getByRole('heading', { name: 'Lịch đặt sân gần đây' }).waitFor();
        const rowCount = await page.locator('tbody tr').count();
        expect(rowCount > 0, 'No recent booking rows found');

        return `UI bảng lịch đặt sân gần đây hiển thị ${rowCount} dòng`;
      } finally {
        await context.close();
      }
    });
  } finally {
    await browser.close();
  }

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
