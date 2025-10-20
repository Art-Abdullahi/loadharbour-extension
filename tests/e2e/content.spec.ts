import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const fixturePath = path.resolve('tests/e2e/fixtures/results.html');
const contentScriptPath = path.resolve('dist/content.js');

test.beforeAll(() => {
  if (!fs.existsSync(contentScriptPath)) {
    throw new Error('Run npm run build before e2e tests');
  }
});

test('icons inject and drawer actions call background', async ({ page }) => {
  const settings = {
    company: { name: 'LoadHarbour', mc: '123', phone: '512-555-0100' },
    identity: { loginEmail: 'user@example.com', senderEmail: 'dispatch@example.com' },
    emailTemplate: { subject: 'Load {{origin_city}}', body: 'Body {{company}}' },
    operations: { deadheadRadius: 50 },
    tms: { url: '', token: null },
    allowedHosts: ['example.com'],
    telemetryEnabled: false,
  };

  await page.addInitScript((initialSettings) => {
    const listeners: ((changes: any, area: string) => void)[] = [];
    const storage = { dispatcher_settings_v1: initialSettings };
    (window as any).__messages = [];
    (window as any).__copiedText = '';
    (window as any).chrome = {
      runtime: {
        lastError: null,
        sendMessage: (message: any, callback: (value: any) => void) => {
          (window as any).__messages.push(message);
          setTimeout(() => {
            switch (message.type) {
              case 'CHECK_HOST':
                callback(true);
                break;
              case 'COPY_POSTING':
                (window as any).__copiedText = message.asJson
                  ? JSON.stringify(message.posting)
                  : `${message.posting.origin.city}`;
                callback(undefined);
                break;
              case 'COMPUTE_RPM':
              case 'OPEN_MAILTO':
              case 'OPEN_TEL':
              case 'SEND_TMS':
              case 'TELEMETRY':
                callback(undefined);
                break;
              default:
                callback(undefined);
            }
          }, 0);
        },
      },
      storage: {
        local: {
          get: async (key: string) => ({ [key]: storage[key as keyof typeof storage] }),
          set: async (items: Record<string, unknown>) => {
            Object.assign(storage, items);
            listeners.forEach((fn) => fn({ dispatcher_settings_v1: { newValue: storage.dispatcher_settings_v1 } }, 'local'));
          },
        },
        onChanged: {
          addListener(fn: (changes: any, area: string) => void) {
            listeners.push(fn);
          },
        },
      },
    };
    (navigator as any).clipboard = {
      writeText: async (text: string) => {
        (window as any).__copiedText = text;
      },
    };
  }, settings);

  await page.goto(`file://${fixturePath}`);
  await page.addScriptTag({ path: contentScriptPath });

  await expect(page.locator('.dcp-row-action-btn')).toHaveCount(2);
  await page.locator('.dcp-row-action-btn').first().click();

  const drawer = page.getByRole('dialog', { name: 'Dispatcher Co-Pilot' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Send to TMS' })).toBeDisabled();

  await drawer.getByRole('button', { name: 'Compute RPM' }).click();
  await drawer.getByRole('button', { name: 'Copy' }).click();

  await expect.poll(() => page.evaluate(() => (window as any).__copiedText)).toContain('Austin');

  const messages = await page.evaluate(() => (window as any).__messages);
  const types = messages.map((msg: any) => msg.type);
  expect(types).toContain('COMPUTE_RPM');
  expect(types).toContain('COPY_POSTING');
});
