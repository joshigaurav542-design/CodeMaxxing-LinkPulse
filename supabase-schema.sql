-- ==============================================================================
-- SUPABASE SCHEMA: Email-Based User Identification & Activity Tracking
-- Project: LinkPulse / Innovista 2026 Hackathon
-- Note: Email entry is used for user identification and event tracking in demo
--       environments, not cryptographic password/magic-link authentication.
-- ==============================================================================

-- 1. Create the Users table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for instant email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (lower(email));

-- 2. Create the Activity Logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for fetching a user's recent activities in reverse chronological order
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_timestamp 
ON public.activity_logs (user_id, timestamp DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Anonymous / Frontend Publishable Key Access

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Allow select users for identification" ON public.users;
DROP POLICY IF EXISTS "Allow insert new user" ON public.users;
DROP POLICY IF EXISTS "Allow update user timestamp" ON public.users;
DROP POLICY IF EXISTS "Allow insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow select activity logs" ON public.activity_logs;

-- USERS TABLE POLICIES:
-- Allow frontend to query by email to check existing accounts
CREATE POLICY "Allow select users for identification"
ON public.users
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow frontend to register a new email record
CREATE POLICY "Allow insert new user"
ON public.users
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow updating last_seen_at timestamp upon identification
CREATE POLICY "Allow update user timestamp"
ON public.users
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ACTIVITY LOGS TABLE POLICIES:
-- Allow frontend to insert activity tracking events (logins, clicks, page views)
CREATE POLICY "Allow insert activity logs"
ON public.activity_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow users to view their activity log timeline
CREATE POLICY "Allow select activity logs"
ON public.activity_logs
FOR SELECT
TO anon, authenticated
USING (true);

-- ==============================================================================
-- INSTRUCTIONS TO RUN IN SUPABASE:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/onyspyvsoagutpwyissd
-- 2. Click "SQL Editor" in the left sidebar navigation.
-- 3. Click "New query" (or paste into the query window).
-- 4. Paste the entire content of this file and click "Run".
-- ==============================================================================
