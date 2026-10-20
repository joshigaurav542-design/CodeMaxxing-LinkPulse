import { NextRequest, NextResponse } from 'next/server';
import { getHubById, getHubLinks, getHubMembers, deleteHub } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || undefined;

    const hub = getHubById(id, userId);
    if (!hub) {
      return NextResponse.json({ success: false, error: 'Link Hub not found.' }, { status: 404 });
    }

    const links = getHubLinks(hub.id);
    const members = getHubMembers(hub.id);

    return NextResponse.json({
      success: true,
      hub,
      links,
      members
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const requestingUserId = body.requestingUserId || req.nextUrl.searchParams.get('userId');

    if (!requestingUserId) {
      return NextResponse.json({ success: false, error: 'User authentication required.' }, { status: 401 });
    }

    const deleted = deleteHub(id, requestingUserId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Hub not found or could not be deleted.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Link Hub deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
}
