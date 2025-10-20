import { beforeEach, describe, expect, it } from 'vitest';
import { clearToken, decryptToken, encryptToken, getSettings, rotateToken, saveSettings } from '../../src/lib/storage';
import { createDefaultSettings } from '../../src/lib/schema';

beforeEach(async () => {
  await saveSettings(createDefaultSettings());
});

describe('token encryption', () => {
  it('round trips token encryption/decryption', async () => {
    const encrypted = await encryptToken('secret-token');
    const decrypted = await decryptToken(encrypted);
    expect(decrypted).toBe('secret-token');
  });

  it('rotates the token and persists to settings', async () => {
    await rotateToken('token-a');
    await rotateToken('token-b');
    const settings = await getSettings();
    const decrypted = await decryptToken(settings.tms.token ?? null);
    expect(decrypted).toBe('token-b');
  });

  it('clears the token value', async () => {
    await rotateToken('token-c');
    await clearToken();
    const settings = await getSettings();
    expect(settings.tms.token).toBeNull();
  });
});
