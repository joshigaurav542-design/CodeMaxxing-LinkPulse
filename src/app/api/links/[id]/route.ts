import { NextRequest, NextResponse } from 'next/server';
import { updateLinkStatus, getLinkById, deleteLink } from '@/lib/db';
import { getCache } from '@/lib/cache';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { isActive, isBanned, role, requestingUserId } = body;

    const targetLink = getLinkById(id);

    if (!targetLink) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 });
    }

    // Server-side RBAC enforcement:
    // Visitors cannot modify links
    if (role === 'VISITOR' || (!role && !requestingUserId)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Visitors cannot modify link status. Please sign in.' },
        { status: 403 }
      );
    }

    // Only Admin can ban/unban links
    if (isBanned !== undefined && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only administrators can ban or unban links.' },
        { status: 403 }
      );
    }

    // Users can only toggle active status on their own links
    if (role === 'USER' && requestingUserId && targetLink.createdById && targetLink.createdById !== requestingUserId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You only have permission to modify your own links.' },
        { status: 403 }
      );
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
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || req.headers.get('x-user-role');
    const requestingUserId = searchParams.get('userId') || req.headers.get('x-user-id');

    const targetLink = getLinkById(id);

    if (!targetLink) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 });
    }

    // Server-side RBAC enforcement:
    // Visitors cannot delete links
    if (!role || role === 'VISITOR') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Visitors do not have permission to delete links.' },
        { status: 403 }
      );
    }

    // Regular users can only delete their own links
    if (role !== 'ADMIN' && targetLink.createdById && targetLink.createdById !== requestingUserId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to delete this link.' },
        { status: 403 }
      );
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

