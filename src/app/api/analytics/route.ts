import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsOverview } from '@/lib/db';
import { getCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get('linkId') || undefined;

    const data = getAnalyticsOverview(linkId);
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
