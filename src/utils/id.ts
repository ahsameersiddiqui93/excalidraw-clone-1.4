/**
 * utils/id.ts
 * -----------------------------------------------------------------------------
 * Identifier and deterministic-seed helpers. Self-contained (no dependencies)
 * so the core can be unit-tested in isolation.
 */

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * Generate a unique, URL-safe identifier. Uses crypto.getRandomValues when
 * available (browser / modern Node) and falls back to Math.random.
 */
export function generateId(size = 12): string {
  let id = "";
  const bytes = new Uint8Array(size);
  const cryptoObj =
    typeof globalThis !== "undefined"
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;

  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < size; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  for (let i = 0; i < size; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

/**
 * Generate an integer seed for rough.js so that an element's sketchy
 * appearance remains stable across re-renders.
 */
export function generateSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
