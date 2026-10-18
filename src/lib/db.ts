import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { User, Workspace, Campaign, Link, ClickEvent, DomainBlocklist, LinkInBio } from './types';
import { hashPassword } from './security';

// Global singleton to prevent multiple database handles in Next.js development HMR
declare global {
  // eslint-disable-next-line no-var
  var __linkpulse_db: DatabaseSync | undefined;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'linkpulse.db');

export function getDatabase(): DatabaseSync {
  if (global.__linkpulse_db) {
    return global.__linkpulse_db;
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  
  // Enable Write-Ahead Logging (WAL) for concurrency & performance
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  initSchema(db);
  seedInitialData(db);

  global.__linkpulse_db = db;
  return db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'USER',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#3b82f6',
      workspace_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      short_code TEXT UNIQUE NOT NULL,
      custom_alias TEXT UNIQUE,
      destination_url TEXT NOT NULL,
      title TEXT,
      is_active INTEGER DEFAULT 1,
      is_banned INTEGER DEFAULT 0,
      password_hash TEXT,
      expires_at TEXT,
      click_limit INTEGER,
      click_count INTEGER DEFAULT 0,
      device_rules TEXT,
      workspace_id TEXT NOT NULL,
      campaign_id TEXT,
      created_by_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);
    CREATE INDEX IF NOT EXISTS idx_links_custom_alias ON links(custom_alias);
    CREATE INDEX IF NOT EXISTS idx_links_workspace ON links(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_links_campaign ON links(campaign_id);

    CREATE TABLE IF NOT EXISTS click_events (
      id TEXT PRIMARY KEY,
      link_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      is_bot INTEGER DEFAULT 0,
      country TEXT,
      city TEXT,
      device_type TEXT,
      os TEXT,
      browser TEXT,
      referrer TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_clicks_link_ts ON click_events(link_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_clicks_link_bot ON click_events(link_id, is_bot);

    CREATE TABLE IF NOT EXISTS domain_blocklist (
      id TEXT PRIMARY KEY,
      domain TEXT UNIQUE NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS link_in_bio (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      bio TEXT,
      theme TEXT DEFAULT 'glass-dark',
      avatar_url TEXT,
      links_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function seedInitialData(db: DatabaseSync) {
  const userCheck = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (userCheck.count > 0) return; // Already seeded

  const now = new Date().toISOString();
  const defaultPw = hashPassword('linkpulse2026');

  // 1. Users
  const adminId = 'usr-admin-001';
  const userId = 'usr-marketer-002';

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(adminId, 'gaurav.joshi@gehu.ac.in', defaultPw, 'Gaurav Joshi (Admin)', 'ADMIN', now);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, 'team.lead@codemaxxing.dev', defaultPw, 'CodeMaxxing Lead', 'USER', now);

  // 2. Workspace
  const workspaceId = 'ws-codemaxxing-001';
  db.prepare(`
    INSERT INTO workspaces (id, name, owner_id, created_at)
    VALUES (?, ?, ?, ?)
  `).run(workspaceId, 'CodeMaxxing Primary Workspace', adminId, now);

  // 3. Campaigns
  const camp1 = 'camp-hackathon-01';
  const camp2 = 'camp-blackfriday-02';
  const camp3 = 'camp-mobileapp-03';

  db.prepare(`
    INSERT INTO campaigns (id, name, description, color, workspace_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(camp1, 'TECH GEEKS Hackathon 2026', 'Presentation & project showcase links', '#3b82f6', workspaceId, now);

  db.prepare(`
    INSERT INTO campaigns (id, name, description, color, workspace_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(camp2, 'Black Friday Global Blitz', 'E-commerce discount promotions & social tracking', '#ef4444', workspaceId, now);

  db.prepare(`
    INSERT INTO campaigns (id, name, description, color, workspace_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(camp3, 'Mobile App Growth Wave', 'Smart app links with iOS & Android routing', '#10b981', workspaceId, now);

  // 4. Blocklist
  db.prepare(`
    INSERT INTO domain_blocklist (id, domain, reason, created_at)
    VALUES (?, ?, ?, ?)
  `).run('blk-1', 'phishing-credential-harvest.com', 'Reported phishing gateway', now);

  db.prepare(`
    INSERT INTO domain_blocklist (id, domain, reason, created_at)
    VALUES (?, ?, ?, ?)
  `).run('blk-2', 'crypto-scam-drainer.xyz', 'Malicious smart contract distributor', now);

  // 5. Seed Links
  // Link 1: Clean Hackathon Presentation
  const link1 = 'lnk-hack-01';
  db.prepare(`
    INSERT INTO links (id, short_code, custom_alias, destination_url, title, is_active, is_banned, click_count, workspace_id, campaign_id, created_by_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(link1, 'techgeeks', 'techgeeks', 'https://gehu.ac.in', 'GEHU Tech Geeks Hackathon Portal', 1, 0, 142, workspaceId, camp1, adminId, now, now);

  // Link 2: Device-targeted App Download
  const link2 = 'lnk-app-02';
  const deviceRules = JSON.stringify({
    ios: 'https://apps.apple.com',
    android: 'https://play.google.com',
    desktop: 'https://github.com'
  });
  db.prepare(`
    INSERT INTO links (id, short_code, custom_alias, destination_url, title, is_active, is_banned, device_rules, click_count, workspace_id, campaign_id, created_by_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(link2, 'get-app', 'get-app', 'https://linkpulse.io/download', 'LinkPulse Native App (Smart Routed)', 1, 0, deviceRules, 89, workspaceId, camp3, adminId, now, now);

  // Link 3: Password-protected confidential link
  const link3 = 'lnk-conf-03';
  const confPw = hashPassword('codemaxxing');
  db.prepare(`
    INSERT INTO links (id, short_code, custom_alias, destination_url, title, is_active, is_banned, password_hash, click_count, workspace_id, campaign_id, created_by_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(link3, 'secret-pitch', 'secret-pitch', 'https://notion.so', 'Confidential Pitch Deck (Password: codemaxxing)', 1, 0, confPw, 34, workspaceId, camp1, adminId, now, now);

  // Link 4: Click-capped limited flash sale link (Cap: 100, current: 98)
  const link4 = 'lnk-flash-04';
  db.prepare(`
    INSERT INTO links (id, short_code, custom_alias, destination_url, title, is_active, is_banned, click_limit, click_count, workspace_id, campaign_id, created_by_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(link4, 'flash-90off', 'flash-90off', 'https://amazon.com', 'Black Friday VIP 90% Coupon (100 Click Cap)', 1, 0, 100, 98, workspaceId, camp2, userId, now, now);

  // Link 5: Expired link
  const link5 = 'lnk-exp-05';
  const pastDate = new Date(Date.now() - 86400000 * 2).toISOString();
  db.prepare(`
    INSERT INTO links (id, short_code, custom_alias, destination_url, title, is_active, is_banned, expires_at, click_count, workspace_id, campaign_id, created_by_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(link5, 'early-bird', 'early-bird', 'https://eventbrite.com', 'Early Bird Tickets (Expired)', 1, 0, pastDate, 210, workspaceId, camp1, userId, now, now);

  // 6. Seed Realistic Click Events across the past 7 days
  const countries = [
    { country: 'India', city: 'Dehradun', weight: 35 },
    { country: 'United States', city: 'San Francisco', weight: 25 },
    { country: 'Germany', city: 'Berlin', weight: 15 },
    { country: 'United Kingdom', city: 'London', weight: 10 },
    { country: 'Japan', city: 'Tokyo', weight: 10 },
    { country: 'Canada', city: 'Toronto', weight: 5 }
  ];

  const devices: Array<{ deviceType: 'desktop' | 'mobile' | 'tablet'; os: string; browser: string }> = [
    { deviceType: 'desktop', os: 'Windows', browser: 'Chrome' },
    { deviceType: 'mobile', os: 'iOS', browser: 'Safari' },
    { deviceType: 'mobile', os: 'Android', browser: 'Chrome' },
    { deviceType: 'desktop', os: 'macOS', browser: 'Chrome' },
    { deviceType: 'desktop', os: 'Linux', browser: 'Firefox' },
    { deviceType: 'tablet', os: 'iOS', browser: 'Safari' }
  ];

  const referrers = ['https://twitter.com', 'https://linkedin.com', 'https://github.com', 'https://google.com', 'direct', 'https://instagram.com'];

  const clickInsertStmt = db.prepare(`
    INSERT INTO click_events (id, link_id, timestamp, ip_hash, is_bot, country, city, device_type, os, browser, referrer, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Generate 250 realistic clicks distributed over the last 7 days
  for (let i = 0; i < 250; i++) {
    const hoursAgo = Math.floor(Math.random() * 168); // within 7 days
    const eventTime = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
    const isBot = Math.random() < 0.08; // 8% bot traffic
    const targetLink = [link1, link2, link3, link4, link5][Math.floor(Math.random() * 5)];
    const countryObj = countries[Math.floor(Math.random() * countries.length)];
    const devObj = devices[Math.floor(Math.random() * devices.length)];
    const ref = referrers[Math.floor(Math.random() * referrers.length)];

    clickInsertStmt.run(
      `clk-${i}-${Math.random().toString(36).substring(2, 7)}`,
      targetLink,
      eventTime,
      `hash-${Math.random().toString(36).substring(2, 10)}`,
      isBot ? 1 : 0,
      countryObj.country,
      countryObj.city,
      isBot ? 'bot' : devObj.deviceType,
      devObj.os,
      isBot ? 'CrawlerBot' : devObj.browser,
      ref,
      eventTime
    );
  }

  // 7. Seed Link-in-Bio
  db.prepare(`
    INSERT INTO link_in_bio (id, slug, title, bio, theme, avatar_url, links_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'bio-codemaxxing',
    'codemaxxing',
    'Team CodeMaxxing @ GEHU',
    'Innovating URL Shortening, High-Performance Micro-Redirections & Live Analytics.',
    'glass-dark',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
    JSON.stringify([
      { title: 'GEHU Hackathon Project Hub', url: 'https://gehu.ac.in', icon: 'award', highlight: true },
      { title: 'Live GitHub Source Repository', url: 'https://github.com', icon: 'github', highlight: false },
      { title: 'Team LinkedIn Updates', url: 'https://linkedin.com', icon: 'linkedin', highlight: false },
      { title: 'Interactive Documentation', url: 'https://notion.so', icon: 'book', highlight: false }
    ]),
    now,
    now
  );
}

// ==================== Repository Helpers ====================

export function getAllLinks(): Link[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT l.*, c.name as campaign_name, c.color as campaign_color
    FROM links l
    LEFT JOIN campaigns c ON l.campaign_id = c.id
    ORDER BY l.created_at DESC
  `).all() as any[];

  return rows.map(mapLinkRow);
}

export function getLinkByCodeOrAlias(code: string): Link | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT l.*, c.name as campaign_name, c.color as campaign_color
    FROM links l
    LEFT JOIN campaigns c ON l.campaign_id = c.id
    WHERE l.short_code = ? OR l.custom_alias = ?
  `).get(code, code) as any;

  if (!row) return null;
  return mapLinkRow(row);
}

export function createLink(data: {
  shortCode: string;
  customAlias?: string;
  destinationUrl: string;
  title?: string;
  password?: string;
  expiresAt?: string;
  clickLimit?: number;
  deviceRules?: Record<string, string>;
  campaignId?: string;
  workspaceId?: string;
  createdById?: string;
}): Link {
  const db = getDatabase();
  const id = `lnk-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const pwHash = data.password ? hashPassword(data.password) : null;
  const devRulesJson = data.deviceRules ? JSON.stringify(data.deviceRules) : null;
  const wsId = data.workspaceId || 'ws-codemaxxing-001';
  const userId = data.createdById || 'usr-admin-001';

  db.prepare(`
    INSERT INTO links (
      id, short_code, custom_alias, destination_url, title,
      is_active, is_banned, password_hash, expires_at, click_limit, click_count,
      device_rules, workspace_id, campaign_id, created_by_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.shortCode,
    data.customAlias || null,
    data.destinationUrl,
    data.title || null,
    pwHash,
    data.expiresAt || null,
    data.clickLimit || null,
    devRulesJson,
    wsId,
    data.campaignId || null,
    userId,
    now,
    now
  );

  return getLinkByCodeOrAlias(data.shortCode)!;
}

export function updateLinkStatus(id: string, updates: { isActive?: boolean; isBanned?: boolean }): void {
  const db = getDatabase();
  const sets: string[] = [];
  const args: any[] = [];

  if (updates.isActive !== undefined) {
    sets.push('is_active = ?');
    args.push(updates.isActive ? 1 : 0);
  }
  if (updates.isBanned !== undefined) {
    sets.push('is_banned = ?');
    args.push(updates.isBanned ? 1 : 0);
  }

  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  args.push(new Date().toISOString());
  args.push(id);

  db.prepare(`UPDATE links SET ${sets.join(', ')} WHERE id = ?`).run(...args);
}

export function incrementLinkClickCount(id: string): void {
  const db = getDatabase();
  db.prepare('UPDATE links SET click_count = click_count + 1 WHERE id = ?').run(id);
}

export function recordClickEvent(event: Omit<ClickEvent, 'id' | 'createdAt'>): void {
  const db = getDatabase();
  const id = `clk-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO click_events (
      id, link_id, timestamp, ip_hash, is_bot, country, city,
      device_type, os, browser, referrer, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    event.linkId,
    event.timestamp,
    event.ipHash,
    event.isBot ? 1 : 0,
    event.country,
    event.city,
    event.deviceType,
    event.os,
    event.browser,
    event.referrer,
    now
  );

  incrementLinkClickCount(event.linkId);
}

export function getCampaigns(): Campaign[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT c.*,
      COUNT(DISTINCT l.id) as link_count,
      COALESCE(SUM(l.click_count), 0) as total_clicks
    FROM campaigns c
    LEFT JOIN links l ON c.id = l.campaign_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all() as any[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    color: r.color,
    workspaceId: r.workspace_id,
    createdAt: r.created_at,
    linkCount: Number(r.link_count || 0),
    totalClicks: Number(r.total_clicks || 0)
  }));
}

export function getBlockedDomains(): DomainBlocklist[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM domain_blocklist ORDER BY created_at DESC').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    domain: r.domain,
    reason: r.reason,
    createdAt: r.created_at
  }));
}

export function addBlockedDomain(domain: string, reason: string): DomainBlocklist {
  const db = getDatabase();
  const id = `blk-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO domain_blocklist (id, domain, reason, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, domain.toLowerCase().trim(), reason, now);

  return { id, domain: domain.toLowerCase().trim(), reason, createdAt: now };
}

export function removeBlockedDomain(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM domain_blocklist WHERE id = ?').run(id);
}

export function getLinkInBio(slug: string): LinkInBio | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM link_in_bio WHERE slug = ?').get(slug) as any;
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    bio: row.bio,
    theme: row.theme,
    avatarUrl: row.avatar_url,
    links: JSON.parse(row.links_json || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function getAnalyticsOverview(linkId?: string) {
  const db = getDatabase();

  const whereClause = linkId ? 'WHERE link_id = ?' : '';
  const args = linkId ? [linkId] : [];

  // Total and bot clicks
  const totals = db.prepare(`
    SELECT 
      COUNT(*) as total_clicks,
      SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot_clicks,
      COUNT(DISTINCT ip_hash) as unique_visitors
    FROM click_events ${whereClause}
  `).get(...args) as any;

  // Clicks over time (grouped by day)
  const timeSeries = db.prepare(`
    SELECT 
      SUBSTR(timestamp, 1, 10) as date,
      COUNT(*) as clicks,
      SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) as human_clicks
    FROM click_events ${whereClause}
    GROUP BY SUBSTR(timestamp, 1, 10)
    ORDER BY date ASC
    LIMIT 30
  `).all(...args) as any[];

  // Top Countries
  const countries = db.prepare(`
    SELECT country, COUNT(*) as count
    FROM click_events ${whereClause ? whereClause + ' AND is_bot = 0' : 'WHERE is_bot = 0'}
    GROUP BY country
    ORDER BY count DESC
    LIMIT 8
  `).all(...args) as any[];

  // Device Breakdown
  const devices = db.prepare(`
    SELECT device_type, COUNT(*) as count
    FROM click_events ${whereClause ? whereClause + ' AND is_bot = 0' : 'WHERE is_bot = 0'}
    GROUP BY device_type
    ORDER BY count DESC
  `).all(...args) as any[];

  // OS Breakdown
  const os = db.prepare(`
    SELECT os, COUNT(*) as count
    FROM click_events ${whereClause ? whereClause + ' AND is_bot = 0' : 'WHERE is_bot = 0'}
    GROUP BY os
    ORDER BY count DESC
    LIMIT 5
  `).all(...args) as any[];

  // Referrers
  const referrers = db.prepare(`
    SELECT referrer, COUNT(*) as count
    FROM click_events ${whereClause ? whereClause + ' AND is_bot = 0' : 'WHERE is_bot = 0'}
    GROUP BY referrer
    ORDER BY count DESC
    LIMIT 6
  `).all(...args) as any[];

  return {
    totalClicks: totals.total_clicks || 0,
    humanClicks: (totals.total_clicks || 0) - (totals.bot_clicks || 0),
    botClicks: totals.bot_clicks || 0,
    uniqueVisitors: totals.unique_visitors || 0,
    timeSeries: timeSeries.map((t) => ({ date: t.date, clicks: t.clicks, humanClicks: t.human_clicks })),
    countries: countries.map((c) => ({ country: c.country || 'Unknown', count: c.count })),
    devices: devices.map((d) => ({ device: d.device_type || 'other', count: d.count })),
    os: os.map((o) => ({ os: o.os || 'Other', count: o.count })),
    referrers: referrers.map((r) => ({ referrer: r.referrer || 'Direct', count: r.count }))
  };
}

function mapLinkRow(r: any): Link {
  return {
    id: r.id,
    shortCode: r.short_code,
    customAlias: r.custom_alias,
    destinationUrl: r.destination_url,
    title: r.title,
    isActive: Boolean(r.is_active),
    isBanned: Boolean(r.is_banned),
    hasPassword: Boolean(r.password_hash),
    passwordHash: r.password_hash,
    expiresAt: r.expires_at,
    clickLimit: r.click_limit,
    clickCount: r.click_count || 0,
    deviceRules: r.device_rules ? JSON.parse(r.device_rules) : null,
    workspaceId: r.workspace_id,
    campaignId: r.campaign_id,
    createdById: r.created_by_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    campaign: r.campaign_name ? {
      id: r.campaign_id,
      name: r.campaign_name,
      color: r.campaign_color,
      workspaceId: r.workspace_id,
      createdAt: r.created_at
    } : undefined
  };
}
