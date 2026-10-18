import { NextRequest, NextResponse } from 'next/server';
import { getLinkByCodeOrAlias } from '@/lib/db';
import { verifyPassword } from '@/lib/security';
import { getTelemetryWorker } from '@/lib/queue';

export async function POST(req: NextRequest) {
  try {
    const { shortCode, password } = await req.json();

    if (!shortCode || !password) {
      return NextResponse.json({ success: false, error: 'Short code and password are required' }, { status: 400 });
    }

    const link = getLinkByCodeOrAlias(shortCode);
    if (!link) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 });
    }

    if (!link.passwordHash) {
      return NextResponse.json({ success: true, targetUrl: link.destinationUrl });
    }

    const isMatch = verifyPassword(password, link.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Invalid password. Please check and try again.' }, { status: 401 });
    }

    // Password passed! Dispatch non-blocking telemetry event
    const worker = getTelemetryWorker();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Mozilla/5.0';
    const referrer = req.headers.get('referer') || 'password-gate';

    worker.enqueue({
      linkId: link.id,
      shortCode: link.shortCode,
      ip,
      userAgent,
      referrer,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      targetUrl: link.destinationUrl
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
