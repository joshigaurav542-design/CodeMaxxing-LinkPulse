import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, getDatabase } from '@/lib/db';

export async function GET() {
  try {
    const campaigns = getCampaigns();
    return NextResponse.json({ success: true, campaigns });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, color } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Campaign name is required' }, { status: 400 });
    }

    const db = getDatabase();
    const id = `camp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const workspaceId = 'ws-codemaxxing-001';

    db.prepare(`
      INSERT INTO campaigns (id, name, description, color, workspace_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name.trim(), description || null, color || '#3b82f6', workspaceId, now);

    return NextResponse.json({
      success: true,
      campaign: {
        id,
        name: name.trim(),
        description: description || null,
        color: color || '#3b82f6',
        workspaceId,
        createdAt: now,
        linkCount: 0,
        totalClicks: 0
      }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
