/**
 * Security, Cryptography & Sanitization Utilities for AKWC MediaServe
 * Implements PBKDF2 password hashing, XSS sanitization, and brute-force rate limiting.
 */

// --- 1. PBKDF2 Password Hashing (Web Crypto API) ---

const PBKDF2_ITERATIONS = 100000;
const HASH_ALGO = 'SHA-256';

/** Convert Uint8Array to hex string */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/** Convert hex string to Uint8Array */
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/** Constant-time string equality check to prevent timing attacks */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Hashes a plaintext password using PBKDF2 with SHA-256 and a random salt.
 * Output format: `pbkdf2:100000:<saltHex>:<hashHex>`
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Fallback if Web Crypto is unavailable (rare modern browsers)
    return `plain:${password}`;
  }

  // 16-byte random salt
  const salt = new Uint8Array(16);
  window.crypto.getRandomValues(salt);

  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGO,
    },
    passwordKey,
    256
  );

  const saltHex = bufferToHex(salt.buffer);
  const hashHex = bufferToHex(derivedBits);

  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Verifies a plaintext password against a stored hash (or legacy plaintext).
 */
export async function verifyPassword(
  attempt: string,
  storedHash: string | undefined | null
): Promise<boolean> {
  if (!storedHash || !attempt) return false;

  // Check if password was stored with PBKDF2
  if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 4) return false;

    const iterations = parseInt(parts[1], 10);
    const saltHex = parts[2];
    const expectedHashHex = parts[3];

    const salt = hexToBuffer(saltHex);
    const encoder = new TextEncoder();

    try {
      const passwordKey = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(attempt),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt as any,
          iterations,
          hash: HASH_ALGO,
        },
        passwordKey,
        256
      );

      const computedHashHex = bufferToHex(derivedBits);
      return constantTimeEqual(computedHashHex, expectedHashHex);
    } catch (err) {
      console.warn('Password verification error:', err);
      return false;
    }
  }

  // Fallback for pre-existing unhashed accounts: constant-time equality check
  return constantTimeEqual(attempt, storedHash);
}

/** Checks whether a stored string is already hashed with PBKDF2 */
export function isPasswordHashed(val: string | undefined | null): boolean {
  return Boolean(val && val.startsWith('pbkdf2:'));
}

// --- 2. Form Sanitization & XSS Defense ---

/**
 * Sanitizes generic user text inputs to prevent XSS and HTML injection.
 * Strips script tags, iframes, inline event handlers, and javascript: links.
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/<[^>]+>/g, (tag) => {
      // Whitelist safe simple formatting if any, otherwise strip raw HTML tags
      return '';
    });
}

/**
 * Sanitizes and normalizes an email address.
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._%+-@]/g, '');
}

/**
 * Sanitizes phone numbers, keeping international prefixes.
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

// --- 3. Rate Limiting & Anti-Brute-Force Throttle ---

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const rateLimitStore: Record<string, RateLimitRecord> = {};

/**
 * Checks if an action is allowed for an identifier under rate limiting rules.
 * @param action E.g. 'login', 'reset_pwd', 'register'
 * @param identifier E.g. email or ip/device key
 * @param maxAttempts Max allowed attempts before lockout
 * @param windowMs Time window in milliseconds (default 60s)
 * @param lockoutDurationMs Lockout duration when exceeded (default 60s)
 */
export function checkRateLimit(
  action: string,
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60000,
  lockoutDurationMs: number = 60000
): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
} {
  const key = `${action}:${identifier.toLowerCase().trim()}`;
  const now = Date.now();
  const record = rateLimitStore[key];

  if (!record) {
    return { allowed: true, remainingAttempts: maxAttempts, retryAfterSeconds: 0 };
  }

  // Check if locked
  if (record.lockedUntil && now < record.lockedUntil) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds: retryAfter };
  }

  // Window expired -> reset
  if (now - record.firstAttemptAt > windowMs) {
    delete rateLimitStore[key];
    return { allowed: true, remainingAttempts: maxAttempts, retryAfterSeconds: 0 };
  }

  // Check limit
  if (record.attempts >= maxAttempts) {
    record.lockedUntil = now + lockoutDurationMs;
    const retryAfter = Math.ceil(lockoutDurationMs / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds: retryAfter };
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - record.attempts,
    retryAfterSeconds: 0,
  };
}

/**
 * Records a failed attempt for rate limiting.
 */
export function recordFailedAttempt(
  action: string,
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60000,
  lockoutDurationMs: number = 60000
): void {
  const key = `${action}:${identifier.toLowerCase().trim()}`;
  const now = Date.now();
  const record = rateLimitStore[key];

  if (!record || now - record.firstAttemptAt > windowMs) {
    rateLimitStore[key] = {
      attempts: 1,
      firstAttemptAt: now,
    };
  } else {
    record.attempts += 1;
    if (record.attempts >= maxAttempts) {
      record.lockedUntil = now + lockoutDurationMs;
    }
  }
}

/**
 * Resets the rate limit after a successful action (e.g. successful login).
 */
export function resetRateLimit(action: string, identifier: string): void {
  const key = `${action}:${identifier.toLowerCase().trim()}`;
  delete rateLimitStore[key];
}
