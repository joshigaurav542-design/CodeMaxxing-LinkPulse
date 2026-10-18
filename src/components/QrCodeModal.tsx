'use client';

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Download, Copy, Check, ExternalLink, QrCode as QrIcon } from 'lucide-react';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortUrl: string;
  title?: string | null;
}

export default function QrCodeModal({ isOpen, onClose, shortUrl, title }: QrCodeModalProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [color, setColor] = useState('#4f46e5');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen || !shortUrl) return;

    QRCode.toDataURL(shortUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: color,
        light: '#ffffff'
      }
    }).then(setDataUrl);
  }, [isOpen, shortUrl, color]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `linkpulse-qr-${title || 'code'}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <QrIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">QR Code Generator</h2>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">{title || shortUrl}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner mb-6">
          {dataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={dataUrl} alt="LinkPulse QR" className="w-48 h-48 rounded-lg shadow-sm" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-sm">Generating...</div>
          )}
          <span className="text-xs font-mono text-slate-600 font-semibold mt-2 break-all text-center">
            {shortUrl}
          </span>
        </div>

        {/* Color Palette Selector */}
        <div className="mb-6">
          <label className="text-xs font-medium text-slate-300 block mb-2">Brand Accent Color</label>
          <div className="flex items-center gap-2">
            {['#4f46e5', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#0f172a'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                  color === c ? 'scale-110 border-white ring-2 ring-indigo-500/50' : 'border-transparent opacity-80'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied URL!' : 'Copy Link'}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
