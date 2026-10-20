import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsOverview } from '@/lib/db';
import { getCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get('linkId') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const role = searchParams.get('role');

    // Server-side RBAC enforcement: Visitors or unauthenticated callers cannot access analytics
    if (!role || role === 'VISITOR') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Visitors do not have access to analytics. Please sign in as User or Admin.' },
        { status: 403 }
      );
    }

    // Role-based visibility: 'USER' views analytics for own links only; 'ADMIN' views platform-wide
    const scopeUserId = role === 'USER' && userId ? userId : undefined;
    const data = getAnalyticsOverview(linkId, scopeUserId);
    const cacheStats = getCache().getStats();

    return NextResponse.json({
      success: true,
      analytics: data,
      cacheStats
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
