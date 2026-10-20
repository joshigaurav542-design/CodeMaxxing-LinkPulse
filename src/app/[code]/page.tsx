import { headers } from 'next/headers';
import { redirect, RedirectType } from 'next/navigation';
import { evaluateRedirect } from '@/lib/redirect-engine';
import PasswordGate from '@/components/PasswordGate';
import Link from 'next/link';
import { Clock, AlertTriangle, HelpCircle, ArrowLeft, ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RedirectPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const headerList = await headers();

  const ip = headerList.get('x-forwarded-for')?.split(',')[0].trim() ||
             headerList.get('x-real-ip') ||
             '127.0.0.1';
  const userAgent = headerList.get('user-agent') || 'Mozilla/5.0';
  const referrer = headerList.get('referer') || 'direct';

  const country = headerList.get('cf-ipcountry') ||
                  headerList.get('x-vercel-ip-country') ||
                  headerList.get('cloudfront-viewer-country-name') ||
                  headerList.get('x-country-code') ||
                  undefined;
  const city = headerList.get('cf-ipcity') ||
               headerList.get('x-vercel-ip-city') ||
               headerList.get('cloudfront-viewer-city') ||
               undefined;

  const result = await evaluateRedirect({
    code,
    ip,
    userAgent,
    referrer,
    country,
    city
  });


  // 1. Direct Passthrough Redirect (RFC 9110 HTTP 302/307)
  if (result.action === 'REDIRECT') {
    redirect(result.targetUrl, RedirectType.replace);
  }

  // 2. Password Gate UI
  if (result.action === 'PASSWORD_GATE') {
    return <PasswordGate shortCode={code} title={result.title} />;
  }

  // 3. Clean Fallback Screens (Expired, Capped, Disabled, Not Found)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl relative backdrop-blur-xl">
        {result.action === 'EXPIRED' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-5">
              <Clock className="w-8 h-8" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              HTTP 410 Gone
            </span>
            <h1 className="text-2xl font-bold mt-4 mb-2">Campaign Link Expired</h1>
            <p className="text-sm text-slate-400 mb-6">
              This short link reached its scheduled expiration date on{' '}
              <span className="font-semibold text-slate-200">{new Date(result.expiresAt).toLocaleString()}</span>.
            </p>
          </div>
        )}

        {result.action === 'CAPPED' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              HTTP 410 Capped
            </span>
            <h1 className="text-2xl font-bold mt-4 mb-2">Click Limit Reached</h1>
            <p className="text-sm text-slate-400 mb-6">
              This promotional link had a strict maximum cap of{' '}
              <span className="font-semibold text-white">{result.clickLimit.toLocaleString()} clicks</span> which has now been exhausted.
            </p>
          </div>
        )}

        {result.action === 'DISABLED' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-5">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              HTTP 403 Forbidden
            </span>
            <h1 className="text-2xl font-bold mt-4 mb-2">Link Unavailable</h1>
            <p className="text-sm text-rose-300/90 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-6 text-left text-xs leading-relaxed">
              {result.reason}
            </p>
          </div>
        )}

        {result.action === 'NOT_FOUND' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-5">
              <HelpCircle className="w-8 h-8" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
              HTTP 404 Not Found
            </span>
            <h1 className="text-2xl font-bold mt-4 mb-2">Short Link Not Found</h1>
            <p className="text-sm text-slate-400 mb-6">
              The short code <span className="font-mono text-indigo-400 font-semibold">/{code}</span> does not exist or has been removed.
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to LinkPulse Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
