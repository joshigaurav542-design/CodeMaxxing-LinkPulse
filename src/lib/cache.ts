import { Link } from './types';
import { getLinkByCodeOrAlias, getBlockedDomains } from './db';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// In-Memory High-Speed Redis Simulation for Sub-5ms Hot Path
class HotPathCache {
  private linkStore = new Map<string, CacheEntry<Link>>();
  private clickCounters = new Map<string, number>();
  private blocklistSet = new Set<string>();
  private isWarmed = false;

  private defaultTtlMs = 60 * 60 * 1000; // 1 Hour

  public warmCache(): void {
    if (this.isWarmed) return;
    try {
      const blocked = getBlockedDomains();
      for (const b of blocked) {
        this.blocklistSet.add(b.domain.toLowerCase().trim());
      }
      this.isWarmed = true;
    } catch (e) {
      console.warn('Cache warm warning:', e);
    }
  }

  public getLink(code: string): Link | null {
    this.warmCache();
    const entry = this.linkStore.get(code);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.linkStore.delete(code);
      return null;
    }

    // Merge in-memory atomic click counter if present
    const inMemClicks = this.clickCounters.get(code);
    if (inMemClicks !== undefined) {
      return { ...entry.value, clickCount: inMemClicks };
    }

    return entry.value;
  }

  public setLink(code: string, link: Link, ttlMs: number = this.defaultTtlMs): void {
    this.warmCache();
    this.linkStore.set(code, {
      value: link,
      expiresAt: Date.now() + ttlMs
    });
    if (link.customAlias && link.customAlias !== code) {
      this.linkStore.set(link.customAlias, {
        value: link,
        expiresAt: Date.now() + ttlMs
      });
    }
    // Initialize atomic counter
    this.clickCounters.set(code, link.clickCount);
  }

  public invalidate(code: string, customAlias?: string | null): void {
    this.linkStore.delete(code);
    this.clickCounters.delete(code);
    if (customAlias) {
      this.linkStore.delete(customAlias);
      this.clickCounters.delete(customAlias);
    }
  }

  /**
   * Atomic click increment (equivalent to Redis INCR)
   */
  public atomicIncrement(code: string): number {
    const current = this.clickCounters.get(code) || 0;
    const next = current + 1;
    this.clickCounters.set(code, next);
    return next;
  }

  public isBlocked(domain: string): boolean {
    this.warmCache();
    const clean = domain.toLowerCase().trim();
    if (this.blocklistSet.has(clean)) return true;
    for (const b of this.blocklistSet) {
      if (clean.endsWith(`.${b}`)) return true;
    }
    return false;
  }

  public addBlocked(domain: string): void {
    this.blocklistSet.add(domain.toLowerCase().trim());
  }

  public removeBlocked(domain: string): void {
    this.blocklistSet.delete(domain.toLowerCase().trim());
  }

  public getStats() {
    return {
      cachedLinksCount: this.linkStore.size,
      blockedDomainsCount: this.blocklistSet.size,
      activeCountersCount: this.clickCounters.size
    };
  }
}

// Global singleton cache across Next.js API requests
declare global {
  // eslint-disable-next-line no-var
  var __linkpulse_cache: HotPathCache | undefined;
}

export function getCache(): HotPathCache {
  if (!global.__linkpulse_cache) {
    global.__linkpulse_cache = new HotPathCache();
  }
  return global.__linkpulse_cache;
}

/**
 * Hot Path Cache-Aside fetch
 * 1. Checks Redis/Memory Cache
 * 2. On miss, loads from DB and caches result
 */
export function getLinkFast(code: string): Link | null {
  const cache = getCache();
  const cached = cache.getLink(code);
  if (cached) return cached;

  const dbLink = getLinkByCodeOrAlias(code);
  if (dbLink) {
    cache.setLink(code, dbLink);
    return dbLink;
  }

  return null;
}
