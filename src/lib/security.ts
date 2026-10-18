import crypto from 'node:crypto';

// Base62 Alphabet (RFC 4648 compatible)
const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generate a random Base62 short code of specified length (default 6 chars)
 * 62^6 = 56.8 Billion possible codes, collision-resistant
 */
export function generateShortCode(length: number = 6): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BASE62_ALPHABET[bytes[i] % BASE62_ALPHABET.length];
  }
  return result;
}

/**
 * Validates URLs against the WHATWG URL Standard
 */
export function isValidUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * OWASP Open-Redirect & SSRF Protection Check
 * Blocks private IPs, link-local metadata addresses, loopbacks, and dangerous protocols
 */
export function validateUrlSafety(urlStr: string, blockedDomains: string[] = []): { isSafe: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { isSafe: false, reason: 'Malformed URL: Fails WHATWG URL specification.' };
  }

  // 1. Enforce HTTP/HTTPS only (rejection of javascript:, data:, file:)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isSafe: false, reason: `Disallowed protocol: ${parsed.protocol}. Only http: and https: are permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Reject Localhost and Loopbacks
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
    return { isSafe: false, reason: 'SSRF Protection: Localhost and loopback destinations are restricted.' };
  }

  // 3. Reject Cloud Metadata Services (e.g. AWS/GCP/Azure 169.254.169.254)
  if (hostname === '169.254.169.254' || hostname.startsWith('169.254.')) {
    return { isSafe: false, reason: 'SSRF Protection: Link-local and cloud metadata addresses are restricted.' };
  }

  // 4. Reject RFC 1918 Private IPv4 Ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (match) {
    const [, a, b] = match.map(Number);
    if (a === 10) return { isSafe: false, reason: 'SSRF Protection: Private 10.0.0.0/8 network IP range is restricted.' };
    if (a === 192 && b === 168) return { isSafe: false, reason: 'SSRF Protection: Private 192.168.0.0/16 network IP range is restricted.' };
    if (a === 172 && b >= 16 && b <= 31) return { isSafe: false, reason: 'SSRF Protection: Private 172.16.0.0/12 network IP range is restricted.' };
  }

  // 5. Check against domain blocklist
  for (const blocked of blockedDomains) {
    const cleanBlocked = blocked.toLowerCase().trim();
    if (hostname === cleanBlocked || hostname.endsWith(`.${cleanBlocked}`)) {
      return { isSafe: false, reason: `Governance: Destination domain '${hostname}' is on the platform blocklist.` };
    }
  }

  return { isSafe: true };
}

/**
 * Hash link passwords using scrypt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify link password against stored hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Anonymized IP hash generation for GDPR/privacy compliance
 * Combines IP with a daily changing salt so raw IP is never persisted
 */
export function hashIpAddress(ip: string): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const salt = process.env.JWT_SECRET || 'linkpulse-default-salt-2026';
  return crypto.createHmac('sha256', salt).update(`${ip}-${dateStr}`).digest('hex').slice(0, 16);
}
