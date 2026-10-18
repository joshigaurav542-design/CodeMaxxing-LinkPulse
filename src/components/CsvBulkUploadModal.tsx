'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import { Link } from '@/lib/types';

interface CsvBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinksImported: () => void;
}

interface ParsedRow {
  destinationUrl: string;
  customAlias?: string;
  title?: string;
  status: 'valid' | 'invalid';
  reason?: string;
}

export default function CsvBulkUploadModal({ isOpen, onClose, onLinksImported }: CsvBulkUploadModalProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ count?: number; error?: string } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setResultMsg(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: ParsedRow[] = results.data.map((item: any) => {
          const url = item.url || item.destinationUrl || item.DestinationUrl || '';
          const alias = item.alias || item.customAlias || item.Alias || '';
          const title = item.title || item.Title || '';

          if (!url) {
            return { destinationUrl: '', status: 'invalid', reason: 'Missing URL column' };
          }

          try {
            const p = new URL(url.trim());
            if (p.protocol !== 'http:' && p.protocol !== 'https:') {
              return { destinationUrl: url, status: 'invalid', reason: 'Protocol must be http/https' };
            }
          } catch {
            return { destinationUrl: url, status: 'invalid', reason: 'Malformed URL' };
          }

          return {
            destinationUrl: url.trim(),
            customAlias: alias ? alias.trim().toLowerCase() : undefined,
            title: title ? title.trim() : undefined,
            status: 'valid'
          };
        });

        setRows(parsed);
        setIsParsing(false);
      },
      error: () => {
        setIsParsing(false);
        setResultMsg({ error: 'Failed to parse CSV file. Please verify formatting.' });
      }
    });
  };

  const handleDownloadSample = () => {
    const csvContent = 'url,alias,title\nhttps://github.com,gehu-github,GitHub Portal\nhttps://google.com,gehu-google,Google Search\nhttps://notion.so,gehu-notes,Notion Workspace';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'linkpulse-sample-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportValid = async () => {
    const validRows = rows.filter((r) => r.status === 'valid');
    if (validRows.length === 0) return;

    setIsImporting(true);
    let successCount = 0;

    for (const row of validRows) {
      try {
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destinationUrl: row.destinationUrl,
            customAlias: row.customAlias,
            title: row.title
          })
        });
        if (res.ok) successCount++;
      } catch {
        // continue with next
      }
    }

    setIsImporting(false);
    setResultMsg({ count: successCount });
    onLinksImported();
  };

  const validCount = rows.filter((r) => r.status === 'valid').length;
  const invalidCount = rows.filter((r) => r.status === 'invalid').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative text-white">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">CSV Bulk Link Uploader & Validator</h2>
              <p className="text-xs text-slate-400">Stream parse, pre-flight linting, and batch creation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* File Upload Zone */}
          {rows.length === 0 ? (
            <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center transition-colors bg-slate-950/40">
              <UploadCloud className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <h3 className="font-semibold text-sm mb-1">Choose a CSV file to upload</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
                Supported columns: <code className="text-indigo-300 font-mono">url</code>,{' '}
                <code className="text-indigo-300 font-mono">alias</code>,{' '}
                <code className="text-indigo-300 font-mono">title</code>
              </p>

              <div className="flex items-center justify-center gap-3">
                <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-indigo-600/30 transition">
                  Browse Files
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <button
                  onClick={handleDownloadSample}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Sample Template
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> {validCount} Valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 text-rose-400 font-semibold">
                      <AlertCircle className="w-4 h-4" /> {invalidCount} Invalid
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setRows([])}
                  className="text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Upload different file
                </button>
              </div>

              {/* Table Preview */}
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 sticky top-0 text-slate-400">
                    <tr>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Destination URL</th>
                      <th className="p-2.5">Alias</th>
                      <th className="p-2.5">Title</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="p-2.5">
                          {r.status === 'valid' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-sans font-semibold">
                              Ready
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 font-sans font-semibold" title={r.reason}>
                              Invalid
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 truncate max-w-[200px]" title={r.destinationUrl}>
                          {r.destinationUrl}
                        </td>
                        <td className="p-2.5 text-indigo-300">{r.customAlias || 'auto'}</td>
                        <td className="p-2.5 font-sans truncate max-w-[150px]">{r.title || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {resultMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                  Successfully imported {resultMsg.count} short links! Links are cached and ready for instant resolution.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
          >
            Close
          </button>
          {rows.length > 0 && validCount > 0 && !resultMsg && (
            <button
              onClick={handleImportValid}
              disabled={isImporting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Batch Importing...
                </>
              ) : (
                <>
                  Import {validCount} Links
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
