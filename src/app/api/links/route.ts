import { NextRequest, NextResponse } from 'next/server';
import { getAllLinks, createLink, getBlockedDomains } from '@/lib/db';
import { generateShortCode, isValidUrl, validateUrlSafety } from '@/lib/security';
import { getCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');
    const hubId = searchParams.get('hubId');
    const tag = searchParams.get('tag')?.toLowerCase();
    const search = searchParams.get('search')?.toLowerCase();
    const userId = searchParams.get('userId');
    const role = (searchParams.get('role') || 'VISITOR') as 'VISITOR' | 'USER' | 'ADMIN';

    // Role-based visibility enforcement on the server:
    // - 'ADMIN': Platform-wide access to all links
    // - 'USER': Access to own links
    // - 'VISITOR': Only public, non-password-protected, active, unbanned links from public hubs
    let links = getAllLinks(
      role === 'USER' && userId ? userId : undefined,
      hubId || undefined
    );

    if (role === 'VISITOR' || (!role && !userId)) {
      links = links.filter((l) => {
        // Hide password-protected links from visitors
        if (l.hasPassword || l.passwordHash) return false;
        // Hide inactive or banned links from visitors
        if (!l.isActive || l.isBanned) return false;
        // Hide links belonging to private hubs from visitors
        if (l.hub && !l.hub.isPublic) return false;
        return true;
      });
    }

    if (campaignId) {
      links = links.filter((l) => l.campaignId === campaignId);
    }

    if (hubId) {
      links = links.filter((l) => l.hubId === hubId);
    }

    if (tag) {
      links = links.filter((l) => l.tags?.some((t) => t.toLowerCase() === tag));
    }

    if (search) {
      links = links.filter(
        (l) =>
          l.shortCode.toLowerCase().includes(search) ||
          (l.customAlias && l.customAlias.toLowerCase().includes(search)) ||
          l.destinationUrl.toLowerCase().includes(search) ||
          (l.title && l.title.toLowerCase().includes(search)) ||
          (l.tags && l.tags.some((t) => t.toLowerCase().includes(search)))
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
    const { destinationUrl, customAlias, title, password, expiresAt, clickLimit, deviceRules, campaignId, hubId, createdById, tags, role } = body;

    // Server-side RBAC enforcement: Visitors cannot create links
    if (role === 'VISITOR' || !createdById || createdById === 'usr-visitor-guest') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Visitors do not have permission to create links. Please sign in as User or Admin.' },
        { status: 403 }
      );
    }

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
      campaignId: campaignId || undefined,
      hubId: hubId || undefined,
      createdById: createdById || undefined,
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : undefined
    });

    // 5. Pre-warm Redis Cache for immediate sub-50ms redirects
    getCache().setLink(shortCode, newLink);

    return NextResponse.json({ success: true, link: newLink }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
