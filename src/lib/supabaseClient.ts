import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseUser {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  last_seen_at: string;
}

export interface SupabaseActivityLog {
  id: string;
  user_id: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Normalizes Supabase URL if a dashboard URL is accidentally passed
 * e.g. https://supabase.com/dashboard/project/onyspyvsoagutpwyissd -> https://onyspyvsoagutpwyissd.supabase.co
 */
function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  const dashboardMatch = trimmed.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  return trimmed;
}

const rawUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://onyspyvsoagutpwyissd.supabase.co';

const rawKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const SUPABASE_URL = normalizeSupabaseUrl(rawUrl);
export const SUPABASE_ANON_KEY = rawKey.trim();

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.includes('your-anon-key')
);

// Initialize client if credentials are present
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Helper to generate a unique user ID for new email records
 */
export function generateUniqueUserId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `usr_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
  }
  return `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Identify or register user by email address:
 * 1. Checks if the email exists in public.users table.
 * 2. If it exists, returns existing user record and updates last_seen_at.
 * 3. If it does not exist, generates a unique user ID, creates a new user, and returns it.
 */
export async function identifyOrRegisterUser(
  rawEmail: string
): Promise<{ success: boolean; user: SupabaseUser | null; isNew: boolean; error?: string }> {
  const email = rawEmail.trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return { success: false, user: null, isNew: false, error: 'Please enter a valid email address.' };
  }

  if (!supabase) {
    return {
      success: false,
      user: null,
      isNew: false,
      error: 'Supabase is not configured. Check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
    };
  }

  try {
    // Step 1: Check if user exists
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (selectError) {
      // Common issue: table hasn't been created yet in Supabase
      if (selectError.code === '42P01') {
        return {
          success: false,
          user: null,
          isNew: false,
          error: 'The "users" table does not exist in Supabase yet. Please execute supabase-schema.sql in your Supabase SQL Editor.'
        };
      }
      return { success: false, user: null, isNew: false, error: selectError.message };
    }

    const now = new Date().toISOString();

    // Step 2: Existing user found -> update last_seen_at and return
    if (existingUser) {
      try {
        await supabase
          .from('users')
          .update({ last_seen_at: now })
          .eq('id', existingUser.id);
      } catch {}

      return {
        success: true,
        user: { ...existingUser, last_seen_at: now },
        isNew: false
      };
    }

    // Step 3: User does not exist -> create a new user record
    const newId = generateUniqueUserId();
    const defaultName = email.split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

    const newUserRecord: SupabaseUser = {
      id: newId,
      email,
      name: defaultName,
      created_at: now,
      last_seen_at: now
    };

    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert([newUserRecord])
      .select()
      .single();

    if (insertError) {
      return { success: false, user: null, isNew: false, error: insertError.message };
    }

    return {
      success: true,
      user: insertedUser || newUserRecord,
      isNew: true
    };
  } catch (err: any) {
    return {
      success: false,
      user: null,
      isNew: false,
      error: err.message || 'An unexpected error occurred during user identification.'
    };
  }
}

/**
 * Record an activity event in the Supabase activity_logs table
 */
export async function logSupabaseActivity(
  userId: string,
  action: string,
  metadata: Record<string, any> = {}
): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !userId) {
    return { success: false, error: 'Supabase client or userId unavailable' };
  }

  try {
    const payload = {
      user_id: userId,
      action: action.toUpperCase(),
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined
      }
    };

    const { error } = await supabase.from('activity_logs').insert([payload]);

    if (error) {
      console.warn('[Supabase Activity Log Warning]:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Activity Log Exception]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch activity logs for a user from Supabase
 */
export async function fetchSupabaseUserActivities(
  userId: string,
  limit: number = 40
): Promise<SupabaseActivityLog[]> {
  if (!supabase || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Fetch Activity Logs Error]:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('[Fetch Activity Logs Exception]:', err);
    return [];
  }
}
