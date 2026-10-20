import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { User, Workspace, Campaign, Link, ClickEvent, DomainBlocklist, LinkInBio, LinkHub, HubMember, UserActivity, ActivityActionType, HubRole } from './types';
import { hashPassword, verifyPassword } from './security';

// Global singleton to prevent multiple database handles in Next.js development HMR
declare global {
  // eslint-disable-next-line no-var
  var __linkpulse_db: DatabaseSync | undefined;
}

const DB_DIR = process.env.DB_DIR || (process.env.VERCEL ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data'));
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'linkpulse.db');

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
  seedLinkHubsIfEmpty(db);

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
      tags TEXT,
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

    CREATE TABLE IF NOT EXISTS link_hubs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#4f46e5',
      category TEXT DEFAULT 'General',
      admin_id TEXT NOT NULL,
      is_public INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hub_members (
      id TEXT PRIMARY KEY,
      hub_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'CONTRIBUTOR',
      created_at TEXT NOT NULL,
      FOREIGN KEY (hub_id) REFERENCES link_hubs(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(hub_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS user_activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT,
      action_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      hub_id TEXT,
      hub_name TEXT,
      link_id TEXT,
      link_title TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activities(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_hubs_slug ON link_hubs(slug);
    CREATE INDEX IF NOT EXISTS idx_hubs_admin ON link_hubs(admin_id);
    CREATE INDEX IF NOT EXISTS idx_hub_members_hub ON hub_members(hub_id);
    CREATE INDEX IF NOT EXISTS idx_hub_members_user ON hub_members(user_id);
  `);

  try {
    db.exec('ALTER TABLE links ADD COLUMN tags TEXT;');
  } catch {}
  try {
    db.exec('ALTER TABLE links ADD COLUMN hub_id TEXT;');
  } catch {}
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

function seedLinkHubsIfEmpty(db: DatabaseSync) {
  try {
    const hubCheck = db.prepare('SELECT count(*) as count FROM link_hubs').get() as { count: number };
    if (hubCheck && hubCheck.count > 0) return;

    const now = new Date().toISOString();
    const adminId = 'usr-admin-001';
    const userId = 'usr-marketer-002';

    const hub1 = 'hub-innovista-01';
    const hub2 = 'hub-growth-02';
    const hub3 = 'hub-developer-03';

    const insertHubStmt = db.prepare(`
      INSERT INTO link_hubs (id, name, slug, description, color, category, admin_id, is_public, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    insertHubStmt.run(hub1, 'Innovista 2026 Hackathon Hub', 'innovista-2026', 'Official presentation links, demo portal, and project documentation for Innovista 2026.', '#6366f1', 'Hackathon & Tech', adminId, now, now);
    insertHubStmt.run(hub2, 'Growth & Product Marketing Hub', 'global-growth', 'Affiliate promotions, social blitz links, flash coupons, and partner landing pages.', '#10b981', 'Marketing & Sales', userId, now, now);
    insertHubStmt.run(hub3, 'Developer APIs & Tooling Hub', 'dev-ecosystem', 'SDK downloads, documentation portals, Postman collections, and open-source packages.', '#06b6d4', 'Developer Tools', adminId, now, now);

    const insertMemberStmt = db.prepare(`
      INSERT OR IGNORE INTO hub_members (id, hub_id, user_id, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertMemberStmt.run('mem-1', hub1, adminId, 'ADMIN', now);
    insertMemberStmt.run('mem-2', hub1, userId, 'CONTRIBUTOR', now);
    insertMemberStmt.run('mem-3', hub2, userId, 'ADMIN', now);
    insertMemberStmt.run('mem-4', hub3, adminId, 'ADMIN', now);

    try {
      db.prepare(`UPDATE links SET hub_id = ? WHERE id IN ('lnk-hack-01', 'lnk-conf-03', 'lnk-exp-05')`).run(hub1);
      db.prepare(`UPDATE links SET hub_id = ? WHERE id IN ('lnk-flash-04')`).run(hub2);
      db.prepare(`UPDATE links SET hub_id = ? WHERE id IN ('lnk-app-02')`).run(hub3);
    } catch {}

    const actStmt = db.prepare(`
      INSERT INTO user_activities (id, user_id, user_name, action_type, title, description, hub_id, hub_name, link_id, link_title, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    actStmt.run(
      'act-1',
      adminId,
      'Gaurav Joshi (Admin)',
      'CREATE_HUB',
      'Created Link Hub',
      'Created new Link Hub "Innovista 2026 Hackathon Hub"',
      hub1,
      'Innovista 2026 Hackathon Hub',
      null,
      null,
      new Date(Date.now() - 3600000 * 5).toISOString()
    );

    actStmt.run(
      'act-2',
      adminId,
      'Gaurav Joshi (Admin)',
      'ADD_LINK',
      'Added Link to Hub',
      'Added link "GEHU Tech Geeks Hackathon Portal" to Innovista 2026 Hackathon Hub',
      hub1,
      'Innovista 2026 Hackathon Hub',
      'lnk-hack-01',
      'GEHU Tech Geeks Hackathon Portal',
      new Date(Date.now() - 3600000 * 4).toISOString()
    );

    actStmt.run(
      'act-3',
      userId,
      'CodeMaxxing Lead',
      'JOIN_HUB',
      'Gained User Access',
      'Gained contributor access to "Innovista 2026 Hackathon Hub"',
      hub1,
      'Innovista 2026 Hackathon Hub',
      null,
      null,
      new Date(Date.now() - 3600000 * 3).toISOString()
    );

    actStmt.run(
      'act-4',
      userId,
      'CodeMaxxing Lead',
      'CREATE_HUB',
      'Created Link Hub',
      'Created new Link Hub "Growth & Product Marketing Hub"',
      hub2,
      'Growth & Product Marketing Hub',
      null,
      null,
      new Date(Date.now() - 3600000 * 2).toISOString()
    );

    actStmt.run(
      'act-5',
      userId,
      'CodeMaxxing Lead',
      'ADD_LINK',
      'Added Link to Hub',
      'Added link "Black Friday VIP 90% Coupon" to Growth & Product Marketing Hub',
      hub2,
      'Growth & Product Marketing Hub',
      'lnk-flash-04',
      'Black Friday VIP 90% Coupon',
      new Date(Date.now() - 3600000).toISOString()
    );
  } catch (err) {
    console.error('Error seeding link hubs:', err);
  }
}

// ==================== Repository Helpers ====================

export function getAllLinks(userId?: string, hubId?: string): Link[] {
  const db = getDatabase();
  const whereClauses: string[] = [];
  const args: any[] = [];

  if (userId) {
    whereClauses.push('l.created_by_id = ?');
    args.push(userId);
  }

  if (hubId) {
    whereClauses.push('l.hub_id = ?');
    args.push(hubId);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const query = `
    SELECT l.*, c.name as campaign_name, c.color as campaign_color,
           h.name as hub_name, h.slug as hub_slug, h.color as hub_color
    FROM links l
    LEFT JOIN campaigns c ON l.campaign_id = c.id
    LEFT JOIN link_hubs h ON l.hub_id = h.id
    ${whereSql}
    ORDER BY l.created_at DESC
  `;

  const rows = db.prepare(query).all(...args) as any[];
  return rows.map(mapLinkRow);
}

export function getLinkByCodeOrAlias(code: string): Link | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT l.*, c.name as campaign_name, c.color as campaign_color,
           h.name as hub_name, h.slug as hub_slug, h.color as hub_color
    FROM links l
    LEFT JOIN campaigns c ON l.campaign_id = c.id
    LEFT JOIN link_hubs h ON l.hub_id = h.id
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
  hubId?: string;
  workspaceId?: string;
  createdById?: string;
  tags?: string[];
}): Link {
  const db = getDatabase();
  const id = `lnk-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const pwHash = data.password ? hashPassword(data.password) : null;
  const devRulesJson = data.deviceRules ? JSON.stringify(data.deviceRules) : null;
  const tagsJson = data.tags && data.tags.length > 0 ? JSON.stringify(data.tags) : null;
  const wsId = data.workspaceId || 'ws-codemaxxing-001';
  const userId = data.createdById || 'usr-admin-001';

  db.prepare(`
    INSERT INTO links (
      id, short_code, custom_alias, destination_url, title,
      is_active, is_banned, password_hash, expires_at, click_limit, click_count,
      device_rules, tags, workspace_id, campaign_id, hub_id, created_by_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
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
    tagsJson,
    wsId,
    data.campaignId || null,
    data.hubId || null,
    userId,
    now,
    now
  );

  // If created in a hub or by user, log activity
  try {
    let hubName = 'Global Links';
    if (data.hubId) {
      const hubRow = db.prepare('SELECT name FROM link_hubs WHERE id = ?').get(data.hubId) as any;
      if (hubRow) hubName = hubRow.name;
    }
    const userRow = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
    logUserActivity({
      userId,
      userName: userRow?.name || 'User',
      actionType: 'ADD_LINK',
      title: 'Added Link to Hub',
      description: `Added link "${data.title || data.shortCode}" to ${hubName}`,
      hubId: data.hubId || null,
      hubName: data.hubId ? hubName : null,
      linkId: id,
      linkTitle: data.title || data.shortCode
    });
  } catch {}

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

export function getLinkById(id: string): Link | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT l.*, c.name as campaign_name, c.color as campaign_color,
           h.name as hub_name, h.slug as hub_slug, h.color as hub_color
    FROM links l
    LEFT JOIN campaigns c ON l.campaign_id = c.id
    LEFT JOIN link_hubs h ON l.hub_id = h.id
    WHERE l.id = ?
  `).get(id) as any;

  if (!row) return null;
  return mapLinkRow(row);
}

export function deleteLink(id: string, requestingUserId?: string): boolean {
  const db = getDatabase();
  try {
    const link = getLinkById(id);
    if (link) {
      const uId = requestingUserId || link.createdById;
      const userRow = db.prepare('SELECT name FROM users WHERE id = ?').get(uId) as any;
      logUserActivity({
        userId: uId,
        userName: userRow?.name || 'User',
        actionType: 'DELETE_LINK',
        title: 'Deleted Link',
        description: `Removed link "${link.title || link.shortCode}"`,
        hubId: link.hubId || null,
        hubName: link.hub?.name || null,
        linkId: id,
        linkTitle: link.title || link.shortCode
      });
    }
  } catch {}
  const info = db.prepare('DELETE FROM links WHERE id = ?').run(id);
  return Number(info.changes) > 0;
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

export function getAnalyticsOverview(linkId?: string, userId?: string) {
  const db = getDatabase();

  const whereClauses: string[] = [];
  const args: any[] = [];

  if (linkId) {
    whereClauses.push('link_id = ?');
    args.push(linkId);
  }

  if (userId) {
    whereClauses.push('link_id IN (SELECT id FROM links WHERE created_by_id = ?)');
    args.push(userId);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const humanWhere = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')} AND is_bot = 0` : 'WHERE is_bot = 0';

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

  const baseWhere = linkId ? 'WHERE link_id = ? AND is_bot = 0' : 'WHERE is_bot = 0';

  // Top Countries
  const countries = db.prepare(`
    SELECT country, COUNT(*) as count
<<<<<<< HEAD
    FROM click_events
    ${baseWhere} AND country IS NOT NULL AND country != ''
=======
    FROM click_events ${humanWhere}
>>>>>>> 40f1a20 (feat: implement RBAC user roles matrix, secure SQLite database auth, and link tag management)
    GROUP BY country
    ORDER BY count DESC
    LIMIT 10
  `).all(...args) as any[];

  // Top Cities (Real Geographical Distribution)
  const cities = db.prepare(`
    SELECT city, country, COUNT(*) as count
    FROM click_events
    ${baseWhere} AND city IS NOT NULL AND city != ''
    GROUP BY city, country
    ORDER BY count DESC
    LIMIT 10
  `).all(...args) as any[];

  // Recent Live Locations
  const recentLocations = db.prepare(`
    SELECT id, country, city, timestamp, device_type, os, browser, referrer
    FROM click_events
    ${baseWhere} AND country IS NOT NULL AND country != ''
    ORDER BY timestamp DESC
    LIMIT 10
  `).all(...args) as any[];

  // Device Breakdown
  const devices = db.prepare(`
    SELECT device_type, COUNT(*) as count
<<<<<<< HEAD
    FROM click_events
    ${baseWhere}
=======
    FROM click_events ${humanWhere}
>>>>>>> 40f1a20 (feat: implement RBAC user roles matrix, secure SQLite database auth, and link tag management)
    GROUP BY device_type
    ORDER BY count DESC
  `).all(...args) as any[];

  // OS Breakdown
  const os = db.prepare(`
    SELECT os, COUNT(*) as count
<<<<<<< HEAD
    FROM click_events
    ${baseWhere}
=======
    FROM click_events ${humanWhere}
>>>>>>> 40f1a20 (feat: implement RBAC user roles matrix, secure SQLite database auth, and link tag management)
    GROUP BY os
    ORDER BY count DESC
    LIMIT 5
  `).all(...args) as any[];

  // Referrers
  const referrers = db.prepare(`
    SELECT referrer, COUNT(*) as count
<<<<<<< HEAD
    FROM click_events
    ${baseWhere}
=======
    FROM click_events ${humanWhere}
>>>>>>> 40f1a20 (feat: implement RBAC user roles matrix, secure SQLite database auth, and link tag management)
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
    cities: cities.map((c) => ({ city: c.city || 'Unknown', country: c.country || 'Unknown', count: c.count })),
    recentLocations: recentLocations.map((r) => ({
      id: r.id,
      country: r.country,
      city: r.city,
      timestamp: r.timestamp,
      deviceType: r.device_type,
      os: r.os,
      browser: r.browser,
      referrer: r.referrer
    })),
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
    hubId: r.hub_id || null,
    createdById: r.created_by_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    campaign: r.campaign_name ? {
      id: r.campaign_id,
      name: r.campaign_name,
      color: r.campaign_color,
      workspaceId: r.workspace_id,
      createdAt: r.created_at
    } : undefined,
    hub: r.hub_name ? {
      id: r.hub_id,
      name: r.hub_name,
      slug: r.hub_slug,
      color: r.hub_color || '#4f46e5',
      category: '',
      adminId: '',
      adminName: '',
      adminEmail: '',
      isPublic: true,
      createdAt: '',
      updatedAt: '',
      linkCount: 0,
      membersCount: 0
    } : undefined,
    tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : []
  };
}

// ================= USER AUTHENTICATION =================

export function findUserByEmail(email: string): (User & { passwordHash: string }) | null {
  const db = getDatabase();
  const row = db.prepare('SELECT id, email, password_hash, name, role, created_at FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim()) as any;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    role: row.role,
    createdAt: row.created_at
  };
}

export function registerUser(email: string, password: string, name?: string): User {
  const db = getDatabase();
  const existing = findUserByEmail(email);
  if (existing) {
    throw new Error('A user with this email address already exists.');
  }

  const id = `usr-${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const passwordHash = hashPassword(password);
  const displayName = name?.trim() || email.split('@')[0];

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, created_at)
    VALUES (?, ?, ?, ?, 'USER', ?)
  `).run(id, email.toLowerCase().trim(), passwordHash, displayName, now);

  return {
    id,
    email: email.toLowerCase().trim(),
    name: displayName,
    role: 'USER',
    createdAt: now
  };
}

export function authenticateUser(email: string, password: string): User | null {
  const user = findUserByEmail(email);
  if (!user) return null;
  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt
  };
}

// ================= LINK HUBS & COLLABORATION =================

export function getAllHubs(userId?: string): LinkHub[] {
  const db = getDatabase();
  let rows: any[];
  if (userId) {
    rows = db.prepare(`
      SELECT h.*, u.name as admin_name, u.email as admin_email,
             (SELECT COUNT(*) FROM links l WHERE l.hub_id = h.id) as link_count,
             (SELECT COUNT(*) FROM hub_members hm WHERE hm.hub_id = h.id) as members_count
      FROM link_hubs h
      LEFT JOIN users u ON h.admin_id = u.id
      WHERE h.is_public = 1
         OR h.admin_id = ?
         OR EXISTS (SELECT 1 FROM hub_members hm WHERE hm.hub_id = h.id AND hm.user_id = ?)
      ORDER BY h.created_at DESC
    `).all(userId, userId) as any[];
  } else {
    rows = db.prepare(`
      SELECT h.*, u.name as admin_name, u.email as admin_email,
             (SELECT COUNT(*) FROM links l WHERE l.hub_id = h.id) as link_count,
             (SELECT COUNT(*) FROM hub_members hm WHERE hm.hub_id = h.id) as members_count
      FROM link_hubs h
      LEFT JOIN users u ON h.admin_id = u.id
      WHERE h.is_public = 1
      ORDER BY h.created_at DESC
    `).all() as any[];
  }

  return rows.map((r) => {
    let currentUserRole: HubRole = 'VISITOR';
    if (userId) {
      if (r.admin_id === userId) {
        currentUserRole = 'ADMIN';
      } else {
        const mem = db.prepare('SELECT role FROM hub_members WHERE hub_id = ? AND user_id = ?').get(r.id, userId) as any;
        if (mem) {
          currentUserRole = mem.role === 'ADMIN' ? 'ADMIN' : 'CONTRIBUTOR';
        }
      }
    }

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description || '',
      color: r.color || '#4f46e5',
      category: r.category || 'General',
      adminId: r.admin_id,
      adminName: r.admin_name || 'Admin',
      adminEmail: r.admin_email || '',
      isPublic: Boolean(r.is_public),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      linkCount: Number(r.link_count || 0),
      membersCount: Number(r.members_count || 0),
      currentUserRole
    };
  });
}

export function getHubById(idOrSlug: string, userId?: string): LinkHub | null {
  const db = getDatabase();
  const r = db.prepare(`
    SELECT h.*, u.name as admin_name, u.email as admin_email,
           (SELECT COUNT(*) FROM links l WHERE l.hub_id = h.id) as link_count,
           (SELECT COUNT(*) FROM hub_members hm WHERE hm.hub_id = h.id) as members_count
    FROM link_hubs h
    LEFT JOIN users u ON h.admin_id = u.id
    WHERE h.id = ? OR h.slug = ?
  `).get(idOrSlug, idOrSlug) as any;

  if (!r) return null;

  let currentUserRole: HubRole = 'VISITOR';
  if (userId) {
    if (r.admin_id === userId) {
      currentUserRole = 'ADMIN';
    } else {
      const mem = db.prepare('SELECT role FROM hub_members WHERE hub_id = ? AND user_id = ?').get(r.id, userId) as any;
      if (mem) {
        currentUserRole = mem.role === 'ADMIN' ? 'ADMIN' : 'CONTRIBUTOR';
      }
    }
  }

  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description || '',
    color: r.color || '#4f46e5',
    category: r.category || 'General',
    adminId: r.admin_id,
    adminName: r.admin_name || 'Admin',
    adminEmail: r.admin_email || '',
    isPublic: Boolean(r.is_public),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    linkCount: Number(r.link_count || 0),
    membersCount: Number(r.members_count || 0),
    currentUserRole
  };
}

export function createHub(data: {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  category?: string;
  adminId: string;
  adminName?: string;
  adminEmail?: string;
  isPublic?: boolean;
}): LinkHub {
  const db = getDatabase();
  const id = `hub-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const cleanSlug = data.slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');

  const existing = db.prepare('SELECT id FROM link_hubs WHERE slug = ?').get(cleanSlug);
  if (existing) {
    throw new Error(`A link hub with slug "${cleanSlug}" already exists. Please choose a different slug.`);
  }

  db.prepare(`
    INSERT INTO link_hubs (id, name, slug, description, color, category, admin_id, is_public, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name.trim(),
    cleanSlug,
    data.description?.trim() || null,
    data.color || '#4f46e5',
    data.category || 'General',
    data.adminId,
    data.isPublic !== false ? 1 : 0,
    now,
    now
  );

  // Automatically add creator as ADMIN in hub_members
  db.prepare(`
    INSERT OR IGNORE INTO hub_members (id, hub_id, user_id, role, created_at)
    VALUES (?, ?, ?, 'ADMIN', ?)
  `).run(`mem-${Date.now().toString(36)}`, id, data.adminId, now);

  logUserActivity({
    userId: data.adminId,
    userName: data.adminName || 'Admin',
    actionType: 'CREATE_HUB',
    title: 'Created Link Hub',
    description: `Created new Link Hub "${data.name.trim()}"`,
    hubId: id,
    hubName: data.name.trim()
  });

  return getHubById(id, data.adminId)!;
}

export function joinHub(hubId: string, userId: string, userName?: string): boolean {
  const db = getDatabase();
  const hub = getHubById(hubId);
  if (!hub) throw new Error('Hub not found.');

  // If already admin, don't downgrade
  if (hub.adminId === userId) return true;

  const memId = `mem-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO hub_members (id, hub_id, user_id, role, created_at)
    VALUES (?, ?, ?, 'CONTRIBUTOR', ?)
  `).run(memId, hubId, userId, now);

  logUserActivity({
    userId,
    userName: userName || 'User',
    actionType: 'JOIN_HUB',
    title: 'Gained User Access',
    description: `Gained contributor access to add links in "${hub.name}"`,
    hubId: hub.id,
    hubName: hub.name
  });

  return true;
}

export function leaveHub(hubId: string, userId: string): boolean {
  const db = getDatabase();
  const hub = getHubById(hubId);
  if (!hub) return false;
  if (hub.adminId === userId) throw new Error('Hub Admin cannot leave their own hub.');

  const info = db.prepare('DELETE FROM hub_members WHERE hub_id = ? AND user_id = ?').run(hubId, userId);
  return Number(info.changes) > 0;
}

export function deleteHub(hubId: string, requestingUserId: string): boolean {
  const db = getDatabase();
  const hub = getHubById(hubId);
  if (!hub) return false;

  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(requestingUserId) as any;
  if (hub.adminId !== requestingUserId && user?.role !== 'ADMIN') {
    throw new Error('Only the Hub Admin can delete this hub.');
  }

  db.prepare('DELETE FROM links WHERE hub_id = ?').run(hubId);
  db.prepare('DELETE FROM hub_members WHERE hub_id = ?').run(hubId);
  const info = db.prepare('DELETE FROM link_hubs WHERE id = ?').run(hubId);

  logUserActivity({
    userId: requestingUserId,
    actionType: 'DELETE_LINK',
    title: 'Deleted Link Hub',
    description: `Deleted Hub "${hub.name}" and all its links`,
    hubId,
    hubName: hub.name
  });

  return Number(info.changes) > 0;
}

export function getHubMembers(hubId: string): HubMember[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT hm.id, hm.hub_id, hm.user_id, hm.role, hm.created_at,
           u.name as user_name, u.email as user_email
    FROM hub_members hm
    LEFT JOIN users u ON hm.user_id = u.id
    WHERE hm.hub_id = ?
    ORDER BY hm.role ASC, hm.created_at DESC
  `).all(hubId) as any[];

  return rows.map((r) => ({
    id: r.id,
    hubId: r.hub_id,
    userId: r.user_id,
    userName: r.user_name || 'User',
    userEmail: r.user_email || '',
    role: r.role,
    createdAt: r.created_at
  }));
}

export function getHubLinks(hubId: string): Link[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT l.*, c.name as campaign_name, c.color as campaign_color,
           h.name as hub_name, h.slug as hub_slug, h.color as hub_color
    FROM links l
    LEFT JOIN campaigns c ON l.campaign_id = c.id
    LEFT JOIN link_hubs h ON l.hub_id = h.id
    WHERE l.hub_id = ?
    ORDER BY l.created_at DESC
  `).all(hubId) as any[];

  return rows.map(mapLinkRow);
}

// ================= USER ACTIVITY LOGGING =================

export function logUserActivity(data: {
  userId: string;
  userName?: string;
  actionType: ActivityActionType;
  title: string;
  description: string;
  hubId?: string | null;
  hubName?: string | null;
  linkId?: string | null;
  linkTitle?: string | null;
}): UserActivity {
  const db = getDatabase();
  const id = `act-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  let name: string = data.userName || '';
  if (!name) {
    const u = db.prepare('SELECT name FROM users WHERE id = ?').get(data.userId) as any;
    name = (u?.name as string) || 'User';
  }

  db.prepare(`
    INSERT INTO user_activities (id, user_id, user_name, action_type, title, description, hub_id, hub_name, link_id, link_title, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.userId,
    name,
    data.actionType,
    data.title,
    data.description,
    data.hubId || null,
    data.hubName || null,
    data.linkId || null,
    data.linkTitle || null,
    now
  );

  return {
    id,
    userId: data.userId,
    userName: name,
    actionType: data.actionType,
    title: data.title,
    description: data.description,
    hubId: data.hubId || null,
    hubName: data.hubName || null,
    linkId: data.linkId || null,
    linkTitle: data.linkTitle || null,
    createdAt: now
  };
}

export function getUserActivities(userId?: string, limit: number = 60): UserActivity[] {
  const db = getDatabase();
  const query = userId
    ? `SELECT * FROM user_activities WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    : `SELECT * FROM user_activities ORDER BY created_at DESC LIMIT ?`;

  const rows = (userId ? db.prepare(query).all(userId, limit) : db.prepare(query).all(limit)) as any[];

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    userName: r.user_name || 'User',
    actionType: r.action_type,
    title: r.title,
    description: r.description,
    hubId: r.hub_id,
    hubName: r.hub_name,
    linkId: r.link_id,
    linkTitle: r.link_title,
    createdAt: r.created_at
  }));
}
