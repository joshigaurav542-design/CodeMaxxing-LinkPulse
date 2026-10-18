import { NextRequest, NextResponse } from 'next/server';
import { getAllLinks, createLink, getBlockedDomains } from '@/lib/db';
import { generateShortCode, isValidUrl, validateUrlSafety } from '@/lib/security';
import { getCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');
    const search = searchParams.get('search')?.toLowerCase();

    let links = getAllLinks();

    if (campaignId) {
      links = links.filter((l) => l.campaignId === campaignId);
    }

    if (search) {
      links = links.filter(
        (l) =>
          l.shortCode.toLowerCase().includes(search) ||
          (l.customAlias && l.customAlias.toLowerCase().includes(search)) ||
          l.destinationUrl.toLowerCase().includes(search) ||
          (l.title && l.title.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({ success: true, links });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destinationUrl, customAlias, title, password, expiresAt, clickLimit, deviceRules, campaignId } = body;

    // 1. WHATWG URL Standard Validation
    if (!destinationUrl || !isValidUrl(destinationUrl)) {
      return NextResponse.json(
        { success: false, error: 'Invalid destination URL. Must be a valid http:// or https:// URL.' },
        { status: 400 }
      );
    }

    // 2. OWASP SSRF & Open-Redirect Validation
    const blockedDomains = getBlockedDomains().map((b) => b.domain);
    const safety = validateUrlSafety(destinationUrl, blockedDomains);
    if (!safety.isSafe) {
      return NextResponse.json({ success: false, error: safety.reason }, { status: 400 });
    }

    // 3. Short Code / Alias Setup & Collision Detection
    let shortCode = customAlias ? customAlias.trim().toLowerCase() : generateShortCode(6);

    // Validate alias format (alphanumeric + hyphen/underscore)
    if (customAlias) {
      const aliasRegex = /^[a-zA-Z0-9-_]+$/;
      if (!aliasRegex.test(customAlias)) {
        return NextResponse.json(
          { success: false, error: 'Custom alias may only contain letters, numbers, hyphens, and underscores.' },
          { status: 400 }
        );
      }
    }

    // Check collision in Cache / DB
    const existing = getCache().getLink(shortCode);
    if (existing) {
      return NextResponse.json(
        { success: false, error: `The short code or alias '${shortCode}' is already in use.` },
        { status: 409 }
      );
    }

    // 4. Create in DB
    const newLink = createLink({
      shortCode,
      customAlias: customAlias ? customAlias.trim().toLowerCase() : undefined,
      destinationUrl,
      title: title || undefined,
      password: password || undefined,
      expiresAt: expiresAt || undefined,
      clickLimit: clickLimit ? parseInt(clickLimit, 10) : undefined,
      deviceRules: deviceRules || undefined,
      campaignId: campaignId || undefined
    });

    // 5. Pre-warm Redis Cache for immediate sub-50ms redirects
    getCache().setLink(shortCode, newLink);

    return NextResponse.json({ success: true, link: newLink }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
