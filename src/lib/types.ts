export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  color: string;
  workspaceId: string;
  createdAt: string;
  linkCount?: number;
  totalClicks?: number;
}

export interface DeviceRules {
  ios?: string;
  android?: string;
  desktop?: string;
}

export interface Link {
  id: string;
  shortCode: string;
  customAlias?: string | null;
  destinationUrl: string;
  title?: string | null;
  isActive: boolean;
  isBanned: boolean;
  passwordHash?: string | null;
  hasPassword?: boolean;
  expiresAt?: string | null;
  clickLimit?: number | null;
  clickCount: number;
  deviceRules?: DeviceRules | null;
  workspaceId: string;
  campaignId?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  campaign?: Campaign;
}

export interface ClickEvent {
  id: string;
  linkId: string;
  timestamp: string;
  ipHash: string;
  isBot: boolean;
  country: string;
  city: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot';
  os: string;
  browser: string;
  referrer: string;
  createdAt: string;
}

export interface DomainBlocklist {
  id: string;
  domain: string;
  reason: string;
  createdAt: string;
}

export interface LinkInBio {
  id: string;
  slug: string;
  title: string;
  bio?: string;
  theme: 'glass-dark' | 'neon-pulse' | 'ocean-gradient' | 'minimal-clean';
  avatarUrl?: string;
  links: Array<{
    title: string;
    url: string;
    icon?: string;
    highlight?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

export type RedirectEvaluationResult =
  | { action: 'REDIRECT'; targetUrl: string; statusCode: 301 | 302 | 307; linkId: string }
  | { action: 'PASSWORD_GATE'; linkId: string; shortCode: string; title?: string }
  | { action: 'EXPIRED'; linkId: string; shortCode: string; expiresAt: string }
  | { action: 'CAPPED'; linkId: string; shortCode: string; clickLimit: number; clickCount: number }
  | { action: 'DISABLED'; linkId: string; shortCode: string; reason: string }
  | { action: 'NOT_FOUND'; shortCode: string };
