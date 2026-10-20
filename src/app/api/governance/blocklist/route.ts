import { NextRequest, NextResponse } from 'next/server';
import { getBlockedDomains, addBlockedDomain, removeBlockedDomain } from '@/lib/db';
import { getCache } from '@/lib/cache';

export async function GET() {
  try {
    const list = getBlockedDomains();
    return NextResponse.json({ success: true, blocklist: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role') || req.nextUrl.searchParams.get('role');
    const body = await req.json();
    const effectiveRole = role || body.role;

    if (effectiveRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only administrators can modify domain governance policies.' },
        { status: 403 }
      );
    }

    const { domain, reason } = body;

    if (!domain || domain.trim() === '') {
      return NextResponse.json({ success: false, error: 'Domain is required' }, { status: 400 });
    }

    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const entry = addBlockedDomain(cleanDomain, reason || 'Administrative Policy Violation');

    // Add to Redis Cache Set immediately for O(1) hot-path checks
    getCache().addBlocked(cleanDomain);

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || req.headers.get('x-user-role');

    if (role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only administrators can delete domain governance policies.' },
        { status: 403 }
      );
    }

    const id = searchParams.get('id');
    const domain = searchParams.get('domain');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Blocklist entry ID is required' }, { status: 400 });
    }

    removeBlockedDomain(id);
    if (domain) {
      getCache().removeBlocked(domain);
    }

    return NextResponse.json({ success: true, message: 'Domain removed from blocklist' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
