import { NextRequest, NextResponse } from 'next/server';
import { getLinkByCodeOrAlias } from '@/lib/db';
import { getCache } from '@/lib/cache';

const RESERVED_ALIASES = new Set([
  'api', 'admin', 'dashboard', 'login', 'signup', 'bio', 'settings',
  'analytics', 'privacy', 'terms', 'help', 'static', 'favicon.ico', '_next'
]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const alias = searchParams.get('alias')?.trim().toLowerCase();

  if (!alias) {
    return NextResponse.json({ available: false, reason: 'Alias cannot be blank.' });
  }

  if (RESERVED_ALIASES.has(alias)) {
    return NextResponse.json({ available: false, reason: `'${alias}' is a reserved system path.` });
  }

  const aliasRegex = /^[a-zA-Z0-9-_]{3,30}$/;
  if (!aliasRegex.test(alias)) {
    return NextResponse.json({
      available: false,
      reason: 'Alias must be between 3 and 30 alphanumeric characters, hyphens, or underscores.'
    });
  }

  // Check cache and DB
  const cached = getCache().getLink(alias);
  if (cached) {
    return NextResponse.json({ available: false, reason: 'This custom alias is already claimed.' });
  }

  const dbCheck = getLinkByCodeOrAlias(alias);
  if (dbCheck) {
    return NextResponse.json({ available: false, reason: 'This custom alias is already claimed.' });
  }

  return NextResponse.json({ available: true, message: 'Alias is available!' });
}
