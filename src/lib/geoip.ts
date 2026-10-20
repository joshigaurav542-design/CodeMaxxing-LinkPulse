/**
 * High-Performance Real Geo-IP Resolution Engine
 * 
 * Multi-Tier Resolution:
 * 1. Edge CDN Provider Headers (Cloudflare, Vercel, CloudFront)
 * 2. In-Memory Hot Cache (0ms latency for repeated visitors)
 * 3. Localhost/Private IP detection with automatic Host Public IP discovery
 * 4. High-Reliability Live GeoIP Lookups (ipwho.is & ip-api.com)
 * 5. System Timezone Inference Fallback (zero-failure offline safety)
 */

export interface GeoLocation {
  country: string;
  city: string;
  countryCode?: string;
  region?: string;
}

// In-Memory cache for resolved IPs
const geoCache = new Map<string, { data: GeoLocation; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

// Cached host machine geo for local testing / private networks
let hostMachineGeo: GeoLocation | null = null;
let hostLookupPromise: Promise<GeoLocation | null> | null = null;

// Common Country Name to ISO Alpha-2 Code mapping
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'india': 'IN',
  'united states': 'US',
  'usa': 'US',
  'united kingdom': 'GB',
  'uk': 'GB',
  'germany': 'DE',
  'japan': 'JP',
  'canada': 'CA',
  'france': 'FR',
  'australia': 'AU',
  'singapore': 'SG',
  'brazil': 'BR',
  'netherlands': 'NL',
  'united arab emirates': 'AE',
  'uae': 'AE',
  'south korea': 'KR',
  'italy': 'IT',
  'spain': 'ES',
  'switzerland': 'CH',
  'sweden': 'SE',
  'russia': 'RU',
  'china': 'CN',
  'mexico': 'MX',
  'indonesia': 'ID',
  'ireland': 'IE'
};

/**
 * Convert 2-letter country code or common country name to Flag Emoji
 */
export function getCountryFlag(countryOrCode: string): string {
  if (!countryOrCode) return '🌐';
  
  const clean = countryOrCode.trim();
  let code = clean.toUpperCase();

  if (code.length !== 2) {
    const mapped = COUNTRY_NAME_TO_CODE[clean.toLowerCase()];
    if (mapped) code = mapped;
    else return '🌐';
  }

  try {
    return String.fromCodePoint(...code.split('').map(c => 127397 + c.charCodeAt(0)));
  } catch {
    return '🌐';
  }
}

/**
 * Check if an IP address is private, loopback, or local
 */
export function isLocalOrPrivateIp(ip: string): boolean {
  if (!ip || ip === 'unknown' || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    return true;
  }
  // RFC 1918 private ranges & local subnets
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) {
    return true;
  }
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) {
    return true;
  }
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) {
    return true;
  }
  return false;
}

/**
 * Infer Country from System Timezone (air-gapped / offline fallback)
 */
function inferCountryFromTimezone(): GeoLocation {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Kolkata') || tz.includes('Calcutta') || tz.includes('India')) {
      return { country: 'India', city: 'Delhi', countryCode: 'IN' };
    }
    if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago') || tz.includes('America')) {
      return { country: 'United States', city: 'New York', countryCode: 'US' };
    }
    if (tz.includes('London') || tz.includes('Europe/Belfast')) {
      return { country: 'United Kingdom', city: 'London', countryCode: 'GB' };
    }
    if (tz.includes('Berlin') || tz.includes('Frankfurt')) {
      return { country: 'Germany', city: 'Berlin', countryCode: 'DE' };
    }
    if (tz.includes('Tokyo')) {
      return { country: 'Japan', city: 'Tokyo', countryCode: 'JP' };
    }
    if (tz.includes('Toronto') || tz.includes('Vancouver')) {
      return { country: 'Canada', city: 'Toronto', countryCode: 'CA' };
    }
  } catch {
    // ignore
  }
  return { country: 'India', city: 'Delhi', countryCode: 'IN' };
}

/**
 * Detect the real external location of the current host machine
 * (Used when testing on localhost so real location is accurately detected)
 */
async function discoverHostGeo(): Promise<GeoLocation> {
  if (hostMachineGeo) return hostMachineGeo;
  if (hostLookupPromise) return (await hostLookupPromise) || inferCountryFromTimezone();

  hostLookupPromise = (async () => {
    // 1. Try ipwho.is (fast HTTPS)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://ipwho.is/', { signal: controller.signal });
      clearTimeout(timeout);
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          hostMachineGeo = {
            country: data.country || 'India',
            city: data.city || 'Delhi',
            countryCode: data.country_code || 'IN',
            region: data.region || ''
          };
          return hostMachineGeo;
        }
      }
    } catch {
      // fallback
    }

    // 2. Try ip-api.com
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('http://ip-api.com/json/', { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          hostMachineGeo = {
            country: data.country || 'India',
            city: data.city || 'Delhi',
            countryCode: data.countryCode || 'IN',
            region: data.regionName || ''
          };
          return hostMachineGeo;
        }
      }
    } catch {
      // fallback
    }

    // 3. System Timezone fallback
    hostMachineGeo = inferCountryFromTimezone();
    return hostMachineGeo;
  })();

  const result = await hostLookupPromise;
  hostLookupPromise = null;
  return result || inferCountryFromTimezone();
}

/**
 * Resolve real geographical location from IP address or CDN headers
 */
export async function resolveRealGeo(
  ip: string,
  headerCountry?: string,
  headerCity?: string
): Promise<GeoLocation> {
  // Tier 1: Direct CDN headers (0ms)
  if (headerCountry && headerCountry !== 'XX' && headerCountry !== 'T1') {
    let countryName = headerCountry;
    let countryCode = headerCountry.toUpperCase();

    // If 2-letter code, find friendly name if possible
    for (const [name, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
      if (code === countryCode) {
        countryName = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        break;
      }
    }

    return {
      country: countryName,
      city: headerCity && headerCity !== '' ? headerCity : 'Edge Node',
      countryCode: countryCode.length === 2 ? countryCode : undefined
    };
  }

  // Tier 2: Check in-memory cache
  const cleanIp = (ip || '').trim();
  const cached = geoCache.get(cleanIp);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // Tier 3: Localhost / Private IP Resolution
  if (isLocalOrPrivateIp(cleanIp)) {
    const localGeo = await discoverHostGeo();
    geoCache.set(cleanIp, { data: localGeo, expiresAt: Date.now() + CACHE_TTL_MS });
    return localGeo;
  }

  // Tier 4: Real External IP Geolocation Lookup
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://ipwho.is/${cleanIp}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const geo: GeoLocation = {
          country: data.country || 'Unknown',
          city: data.city || 'Unknown',
          countryCode: data.country_code,
          region: data.region
        };
        geoCache.set(cleanIp, { data: geo, expiresAt: Date.now() + CACHE_TTL_MS });
        return geo;
      }
    }
  } catch {
    // fallback to secondary provider
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`http://ip-api.com/json/${cleanIp}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        const geo: GeoLocation = {
          country: data.country || 'Unknown',
          city: data.city || 'Unknown',
          countryCode: data.countryCode,
          region: data.regionName
        };
        geoCache.set(cleanIp, { data: geo, expiresAt: Date.now() + CACHE_TTL_MS });
        return geo;
      }
    }
  } catch {
    // fallback
  }

  // Tier 5: Fallback
  const fallback = inferCountryFromTimezone();
  geoCache.set(cleanIp, { data: fallback, expiresAt: Date.now() + (5 * 60 * 1000) });
  return fallback;
}
