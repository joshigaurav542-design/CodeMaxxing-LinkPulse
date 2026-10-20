'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Share2,
  Globe,
  Lock,
  Download,
  ExternalLink,
  MessageCircle,
  Mail,
  Send
} from 'lucide-react';
import { LinkHub } from '@/lib/types';

interface ShareHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  hub: LinkHub | null;
}

export default function ShareHubModal({ isOpen, onClose, hub }: ShareHubModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [origin, setOrigin] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const shareUrl = hub && origin ? `${origin}/?hub=${hub.slug}` : '';

  useEffect(() => {
    if (!isOpen || !shareUrl || !hub) return;

    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: hub.color || '#4f46e5',
        light: '#ffffff'
      }
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Failed to generate QR:', err));
  }, [isOpen, shareUrl, hub]);

  if (!isOpen || !hub) return null;

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `hub-${hub.slug}-qr.png`;
    link.href = qrDataUrl;
    link.click();
  };

  // Social share URLs
  const encodedText = encodeURIComponent(`Explore "${hub.name}" on LinkPulse: ${shareUrl}`);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${hub.name}" on LinkPulse`)}&url=${encodeURIComponent(shareUrl)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(`Link Hub: ${hub.name}`)}&body=${encodeURIComponent(`Hi,\n\nCheck out the "${hub.name}" Link Hub here:\n${shareUrl}\n\nManaged by ${hub.adminName}`)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative transition-all animate-in zoom-in-95 duration-200">
        {/* Accent Bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: hub.color || '#6366f1' }} />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs"
              style={{ backgroundColor: hub.color || '#6366f1' }}
            >
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Share Link Hub</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                {hub.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Public vs Private Status Card */}
          {hub.isPublic ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-3">
              <div className="p-1.5 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>Public Link Hub</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                  Anyone with this link can view this hub in <strong>Visitor Mode</strong> and request contributor access. It is also discoverable in the public directory.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
              <div className="p-1.5 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>Private Link Hub (Secret Link Only)</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                  This hub is <strong>unlisted from the public directory</strong>. Only people who receive this direct share link can view and access this hub.
                </p>
              </div>
            </div>
          )}

          {/* Shareable URL Copy Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sharable Hub URL
            </label>
            <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/30">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-2.5 py-1 text-xs font-mono text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none select-all truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-3">
            {qrDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrDataUrl}
                alt={`${hub.name} QR Code`}
                className="w-36 h-36 rounded-xl shadow-xs bg-white p-2 border border-slate-100"
              />
            ) : (
              <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs">
                Generating QR...
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Save QR Code</span>
              </button>

              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Open in Tab</span>
              </a>
            </div>
          </div>

          {/* Quick Share to Socials */}
          <div className="space-y-2 pt-1">
            <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Instant Share Channels
            </span>
            <div className="grid grid-cols-4 gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>

              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>X / Twitter</span>
              </a>

              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                <span>LinkedIn</span>
              </a>

              <a
                href={mailUrl}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
