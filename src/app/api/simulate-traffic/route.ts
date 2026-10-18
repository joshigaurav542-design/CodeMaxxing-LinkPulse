import { NextRequest, NextResponse } from 'next/server';
import { getAllLinks } from '@/lib/db';
import { getTelemetryWorker } from '@/lib/queue';

const MOCK_IPS = [
  '49.36.120.10',   // India
  '103.21.244.0',   // India
  '142.250.190.46', // US
  '151.101.1.69',   // US
  '185.199.108.153',// UK
  '194.25.0.68',    // Germany
  '133.242.0.1'     // Japan
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.143 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Twitterbot/1.0'
];

const REFERRERS = [
  'https://twitter.com',
  'https://linkedin.com',
  'https://github.com',
  'https://google.com',
  'direct',
  'https://news.ycombinator.com'
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const count = Math.min(body.count || 15, 100);

    const links = getAllLinks().filter((l) => l.isActive && !l.isBanned);
    if (links.length === 0) {
      return NextResponse.json({ success: false, error: 'No active links found to simulate traffic against.' });
    }

    const worker = getTelemetryWorker();

    for (let i = 0; i < count; i++) {
      const link = links[Math.floor(Math.random() * links.length)];
      const ip = MOCK_IPS[Math.floor(Math.random() * MOCK_IPS.length)];
      const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const referrer = REFERRERS[Math.floor(Math.random() * REFERRERS.length)];

      worker.enqueue({
        linkId: link.id,
        shortCode: link.shortCode,
        ip,
        userAgent,
        referrer,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      simulatedCount: count,
      message: `Enqueued ${count} real-time telemetry visits into the async BullMQ worker.`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
