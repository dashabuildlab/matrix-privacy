/**
 * Password hashing using expo-crypto (SHA-256 + random salt).
 *
 * Layout of a stored credential:
 *   "<hex-salt>:<hex-hash>"   (both 64 hex chars, separated by colon)
 *
 * Why not bcrypt? expo-crypto is already in the bundle; adding bcryptjs adds
 * ~70 KB and is CPU-heavy on low-end devices. SHA-256 + unique random salt
 * is sufficient for local device storage (the real threat model here).
 */
import * as Crypto from 'expo-crypto';

const ALGORITHM = Crypto.CryptoDigestAlgorithm.SHA256;

/** Hash a plain-text password. Returns a "<salt>:<hash>" string to store. */
export async function hashPassword(password: string): Promise<string> {
  const saltBytes = Crypto.getRandomBytes(32);
  const salt = uint8ToHex(saltBytes);
  const hash = await Crypto.digestStringAsync(ALGORITHM, salt + password);
  return `${salt}:${hash}`;
}

/**
 * Verify a plain-text password against a stored "<salt>:<hash>" string.
 * Also accepts legacy plain-text passwords (no colon format) and returns
 * true if they match — so existing accounts keep working until they next log in.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  if (!stored.includes(':')) {
    // Legacy plain-text — direct comparison (will be re-hashed on next register)
    return stored === password;
  }
  const [salt, expectedHash] = stored.split(':');
  const actualHash = await Crypto.digestStringAsync(ALGORITHM, salt + password);
  return actualHash === expectedHash;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function uint8ToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
