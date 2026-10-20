import { NextRequest, NextResponse } from 'next/server';
import { joinHub, leaveHub, getHubById } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userId, userName } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required to get access.' }, { status: 400 });
    }

    const hub = getHubById(id);
    if (!hub) {
      return NextResponse.json({ success: false, error: 'Hub not found.' }, { status: 404 });
    }

    joinHub(hub.id, userId, userName);

    const updatedHub = getHubById(hub.id, userId);

    return NextResponse.json({
      success: true,
      message: `You now have User Access to "${hub.name}". You can now add links to this hub!`,
      hub: updatedHub
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });
    }

    const hub = getHubById(id);
    if (!hub) {
      return NextResponse.json({ success: false, error: 'Hub not found.' }, { status: 404 });
    }

    leaveHub(hub.id, userId);

    return NextResponse.json({
      success: true,
      message: `You have left "${hub.name}".`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
