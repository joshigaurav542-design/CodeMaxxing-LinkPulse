import { NextRequest, NextResponse } from 'next/server';
import { getUserActivities, logUserActivity } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '60', 10);

    const activities = getUserActivities(userId, limit);

    return NextResponse.json({ success: true, activities });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userName, actionType, title, description, hubId, hubName, linkId, linkTitle } = body;

    if (!userId || !actionType || !title) {
      return NextResponse.json(
        { success: false, error: 'userId, actionType, and title are required.' },
        { status: 400 }
      );
    }

    const activity = logUserActivity({
      userId,
      userName,
      actionType,
      title,
      description: description || '',
      hubId,
      hubName,
      linkId,
      linkTitle
    });

    return NextResponse.json({ success: true, activity }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
