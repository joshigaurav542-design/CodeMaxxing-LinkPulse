import { NextRequest, NextResponse } from 'next/server';
import { updateLinkStatus, getAllLinks } from '@/lib/db';
import { getCache } from '@/lib/cache';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { isActive, isBanned } = body;

    const allLinks = getAllLinks();
    const targetLink = allLinks.find((l) => l.id === id);

    if (!targetLink) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 });
    }

    updateLinkStatus(id, { isActive, isBanned });

    // Invalidate Redis Cache immediately to enforce instant governance
    const cache = getCache();
    cache.invalidate(targetLink.shortCode, targetLink.customAlias);

    return NextResponse.json({
      success: true,
      message: 'Link updated and cache invalidated successfully',
      linkId: id
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
