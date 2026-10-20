import { NextRequest, NextResponse } from 'next/server';
import { updateLinkStatus, getLinkById, deleteLink } from '@/lib/db';
import { getCache } from '@/lib/cache';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { isActive, isBanned } = body;

    const targetLink = getLinkById(id);

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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const targetLink = getLinkById(id);

    if (!targetLink) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 });
    }

    deleteLink(id);

    // Invalidate Redis Hot-Path Cache immediately
    const cache = getCache();
    cache.invalidate(targetLink.shortCode, targetLink.customAlias);

    return NextResponse.json({
      success: true,
      message: `Link /${targetLink.customAlias || targetLink.shortCode} removed permanently from website`,
      linkId: id
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

