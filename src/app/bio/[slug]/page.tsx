import { getLinkInBio } from '@/lib/db';
import Link from 'next/link';
import { ExternalLink, Sparkles, Globe, BookOpen, ArrowLeft, Code2, Award, Share2 } from 'lucide-react';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export default async function BioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bio = getLinkInBio(slug);

  if (!bio) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-sm text-slate-400 mb-6">The link-in-bio page for &apos;{slug}&apos; does not exist.</p>
          <Link href="/" className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-medium">Return Home</Link>
        </div>
      </div>
    );
  }

  // Generate QR code for this bio page
  const pageUrl = `http://localhost:3000/bio/${slug}`;
  const qrDataUrl = await QRCode.toDataURL(pageUrl, { margin: 1, width: 180, color: { dark: '#ffffff', light: '#00000000' } });

  const getIcon = (icon?: string) => {
    switch (icon) {
      case 'github':
        return <Code2 className="w-5 h-5 text-indigo-300" />;
      case 'linkedin':
        return <Share2 className="w-5 h-5 text-blue-400" />;
      case 'award':
        return <Award className="w-5 h-5 text-amber-300" />;
      case 'book':
        return <BookOpen className="w-5 h-5 text-emerald-300" />;
      default:
        return <Globe className="w-5 h-5 text-slate-300" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white flex flex-col items-center justify-between p-6">
      <div className="w-full max-w-md mx-auto pt-8 pb-12">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-indigo-500/20">
              <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-3xl font-bold text-indigo-400">
                LP
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 rounded-full text-white shadow">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2">{bio.title}</h1>
          <p className="text-sm text-slate-300/80 leading-relaxed max-w-xs mx-auto mb-4">{bio.bio}</p>
          
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-white/10 text-indigo-300 border border-white/10 backdrop-blur">
            linkpulse.io/bio/{bio.slug}
          </span>
        </div>

        {/* Links Stack */}
        <div className="space-y-3 mb-10">
          {bio.links.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group ${
                link.highlight
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:scale-[1.02] border border-white/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 backdrop-blur-md hover:scale-[1.01]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-black/20 text-white/90 group-hover:scale-110 transition-transform">
                  {getIcon(link.icon)}
                </span>
                <span className="font-semibold text-sm tracking-wide">{link.title}</span>
              </div>
              <ExternalLink className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
            </a>
          ))}
        </div>

        {/* QR Code Section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center backdrop-blur-md">
          <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-3">Scan to Share Profile</p>
          <div className="inline-block p-2 bg-slate-900 rounded-xl border border-white/10 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR Code" className="w-28 h-28" />
          </div>
          <p className="text-[11px] text-slate-400">Point your smartphone camera to connect instantly.</p>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-500 pb-4">
        <Link href="/" className="inline-flex items-center gap-1.5 hover:text-slate-300 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to LinkPulse Hub
        </Link>
      </footer>
    </div>
  );
}
