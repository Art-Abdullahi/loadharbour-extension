import { SettingsSchema } from './schema';
import type { EncryptedToken, Settings } from '../types/shared';

export const SETTINGS_KEY = 'dispatcher_settings_v1';
const SALT_KEY = 'dispatcher_token_salt';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(data: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)));
}

function fromBase64(data: string): ArrayBuffer {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getCryptoKey(): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto is not available');
  }

  const { [SALT_KEY]: storedSalt } = await chrome.storage.local.get(SALT_KEY);
  let saltBase64 = storedSalt as string | undefined;
  if (!saltBase64) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    saltBase64 = toBase64(salt.buffer);
    await chrome.storage.local.set({ [SALT_KEY]: saltBase64 });
  }

  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(chrome.runtime.id), 'PBKDF2', false, [
    'deriveKey',
  ]);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromBase64(saltBase64),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptToken(token: string): Promise<EncryptedToken> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(token)
  );
  return {
    ciphertext: toBase64(cipherBuffer),
    iv: toBase64(iv.buffer),
    createdAt: Date.now(),
  };
}

export async function decryptToken(data?: EncryptedToken | null): Promise<string | null> {
  if (!data) return null;
  const key = await getCryptoKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(data.iv) },
    key,
    fromBase64(data.ciphertext)
  );
  return decoder.decode(decrypted);
}

export async function rotateToken(newToken: string): Promise<EncryptedToken> {
  const encrypted = await encryptToken(newToken);
  const current = await getSettings();
  const next: Settings = {
    ...current,
    tms: {
      ...current.tms,
      token: encrypted,
    },
  };
  await saveSettings(next);
  return encrypted;
}

export async function getSettings(): Promise<Settings> {
  const { [SETTINGS_KEY]: raw } = await chrome.storage.local.get(SETTINGS_KEY);
  const parsed = SettingsSchema.parse(raw ?? {});
  return parsed;
}

export async function saveSettings(settings: Settings): Promise<void> {
  const parsed = SettingsSchema.parse(settings);
  await chrome.storage.local.set({ [SETTINGS_KEY]: parsed });
}

export async function exportSettings(): Promise<Omit<Settings, 'tms'> & { tms: { url: string } }>
{
  const settings = await getSettings();
  return {
    ...settings,
    tms: {
      url: settings.tms.url,
    },
  };
}

export async function importSettings(input: unknown): Promise<Settings> {
  const parsed = SettingsSchema.parse(input);
  await saveSettings(parsed);
  return parsed;
}

export async function clearToken(): Promise<void> {
  const current = await getSettings();
  await saveSettings({
    ...current,
    tms: {
      ...current.tms,
      token: null,
    },
  });
}
