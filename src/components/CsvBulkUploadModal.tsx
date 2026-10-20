'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { X, UploadCloud, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden relative transition-all">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-slate-900 dark:text-white">Bulk CSV Import</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Upload multiple links simultaneously</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {rows.length === 0 ? (
            <div className="border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-8 text-center transition-colors bg-slate-50 dark:bg-slate-950/40">
              <UploadCloud className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mx-auto mb-2.5" />
              <h3 className="font-medium text-xs text-slate-900 dark:text-white mb-1">Upload CSV spreadsheet</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-4">
                Supported columns: <code className="text-indigo-600 dark:text-indigo-300 font-mono">url</code>,{' '}
                <code className="text-indigo-600 dark:text-indigo-300 font-mono">alias</code>,{' '}
                <code className="text-indigo-600 dark:text-indigo-300 font-mono">title</code>
              </p>

              <div className="flex items-center justify-center gap-2.5">
                <label className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer transition shadow-xs">
                  Choose CSV File
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <button
                  onClick={handleDownloadSample}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Template
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {validCount} Valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> {invalidCount} Invalid
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setRows([])}
                  className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white underline cursor-pointer text-xs"
                >
                  Change file
                </button>
              </div>

              {/* Table Preview */}
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="p-2 font-medium">Status</th>
                      <th className="p-2 font-medium">Destination URL</th>
                      <th className="p-2 font-medium">Alias</th>
                      <th className="p-2 font-medium">Title</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-mono text-[11px]">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-100/60 dark:hover:bg-white/5">
                        <td className="p-2">
                          {r.status === 'valid' ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 font-sans font-medium">
                              Ready
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 font-sans font-medium" title={r.reason}>
                              Invalid
                            </span>
                          )}
                        </td>
                        <td className="p-2 truncate max-w-[180px] text-slate-700 dark:text-slate-300" title={r.destinationUrl}>
                          {r.destinationUrl}
                        </td>
                        <td className="p-2 text-indigo-600 dark:text-indigo-300">{r.customAlias || 'auto'}</td>
                        <td className="p-2 font-sans truncate max-w-[130px] text-slate-600 dark:text-slate-400">{r.title || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {resultMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs">
                  Successfully imported {resultMsg.count} links!
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            Close
          </button>
          {rows.length > 0 && validCount > 0 && !resultMsg && (
            <button
              onClick={handleImportValid}
              disabled={isImporting}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...
                </>
              ) : (
                `Import ${validCount} Links`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
