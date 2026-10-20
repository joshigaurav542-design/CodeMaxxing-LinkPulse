import { getLinkInBio } from '@/lib/db';
import Link from 'next/link';
import { ExternalLink, Globe, BookOpen, ArrowLeft, Code2, Award, Share2 } from 'lucide-react';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export default async function BioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bio = getLinkInBio(slug);

  if (!bio) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">The bio page for &apos;{slug}&apos; does not exist.</p>
          <Link href="/" className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium">Return Home</Link>
        </div>
      </div>
    );
  }

  // Generate QR code for this bio page
  const pageUrl = `http://localhost:3000/bio/${slug}`;
  const qrDataUrl = await QRCode.toDataURL(pageUrl, {
    margin: 1,
    width: 180,
    color: { dark: '#4f46e5', light: '#ffffff' }
  });

  const getIcon = (icon?: string) => {
    switch (icon) {
      case 'github':
        return <Code2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
      case 'linkedin':
        return <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'award':
        return <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'book':
        return <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <Globe className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-between p-6 transition-colors">
      <div className="w-full max-w-sm mx-auto pt-8 pb-12">
        {/* Profile Header */}
        <div className="text-center mb-7">
          <div className="relative inline-block mb-3.5">
            <div className="w-20 h-20 rounded-full p-0.5 bg-indigo-600 dark:bg-indigo-500 shadow-xs">
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 overflow-hidden flex items-center justify-center text-xl font-bold text-indigo-600 dark:text-indigo-400">
                LP
              </div>
            </div>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-1.5">{bio.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto mb-3">{bio.bio}</p>

          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            /{bio.slug}
          </span>
        </div>

        {/* Links Stack */}
        <div className="space-y-2.5 mb-8">
          {bio.links.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all group ${
                link.highlight
                  ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`p-1.5 rounded-lg ${link.highlight ? 'bg-white/10 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  {getIcon(link.icon)}
                </span>
                <span className="font-medium text-xs tracking-tight">{link.title}</span>
              </div>
              <ExternalLink className={`w-3.5 h-3.5 ${link.highlight ? 'text-white/70' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white'}`} />
            </a>
          ))}
        </div>

        {/* QR Code Section */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">Scan to Connect</p>
          <div className="inline-block p-2 bg-white rounded-lg border border-slate-200 dark:border-slate-700 mb-2 shadow-2xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR Code" className="w-24 h-24" />
          </div>
          <p className="text-[11px] text-slate-400">Scan using smartphone camera</p>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 pb-4">
        <Link href="/" className="inline-flex items-center gap-1.5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
      </footer>
    </div>
  );
}
