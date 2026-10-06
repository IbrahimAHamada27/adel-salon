/**
 * Client-Side Encrypted Storage Layer
 * Uses WebCrypto AES-256-GCM with SHA-256 derived keys
 */

const STORAGE_KEY_PREFIX = 'tech_cashier_vault_';

async function deriveKey(salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const host = typeof window !== 'undefined' && window.location ? window.location.host : 'local';
  const rawKey = enc.encode(`tech_vault_seed_pos_${salt}_${host}`);
  const hash = await crypto.subtle.digest('SHA-256', rawKey);

  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptAndSave(key: string, data: any): Promise<void> {
  try {
    const jsonStr = JSON.stringify(data);
    const enc = new TextEncoder();
    const encoded = enc.encode(jsonStr);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await deriveKey(key);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encoded
    );

    const payload = {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(ciphertext)),
    };

    localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to encrypt local storage:', e);
  }
}

export async function decryptAndGet<T>(key: string): Promise<T | null> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
    if (!raw) return null;

    const payload = JSON.parse(raw);
    const iv = new Uint8Array(payload.iv);
    const ciphertext = new Uint8Array(payload.data);

    const cryptoKey = await deriveKey(key);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext
    );

    const dec = new TextDecoder();
    const jsonStr = dec.decode(decrypted);
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error('Failed to decrypt local storage:', e);
    return null;
  }
}

export function clearEncrypted(key: string): void {
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${key}`);
}
