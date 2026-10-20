import { NextRequest, NextResponse } from 'next/server';
import { getAllHubs, createHub } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || undefined;
    const category = searchParams.get('category')?.toLowerCase();
    const search = searchParams.get('search')?.toLowerCase();

    let hubs = getAllHubs(userId);

    if (category && category !== 'all') {
      hubs = hubs.filter((h) => h.category.toLowerCase() === category);
    }

    if (search) {
      hubs = hubs.filter(
        (h) =>
          h.name.toLowerCase().includes(search) ||
          h.slug.toLowerCase().includes(search) ||
          (h.description && h.description.toLowerCase().includes(search)) ||
          h.adminName.toLowerCase().includes(search) ||
          h.category.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ success: true, hubs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, description, color, category, adminId, adminName, adminEmail, isPublic } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Hub name is required.' }, { status: 400 });
    }

    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      return NextResponse.json({ success: false, error: 'Hub slug identifier is required.' }, { status: 400 });
    }

    if (!adminId) {
      return NextResponse.json({ success: false, error: 'Admin ID is required. Please sign in.' }, { status: 401 });
    }

    const hub = createHub({
      name: name.trim(),
      slug: slug.trim(),
      description: description?.trim(),
      color: color || '#4f46e5',
      category: category || 'General',
      adminId,
      adminName: adminName || 'Admin',
      adminEmail: adminEmail || '',
      isPublic: isPublic !== false
    });

    return NextResponse.json({ success: true, hub }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
