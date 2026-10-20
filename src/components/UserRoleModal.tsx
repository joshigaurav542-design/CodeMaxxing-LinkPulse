'use client';

import React from 'react';
import { X, Globe, UserCheck, ShieldCheck, Check, ArrowRight, Sparkles } from 'lucide-react';
import { Role } from '@/lib/types';

interface UserRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: Role;
  onSelectRole: (role: Role) => void;
}

export default function UserRoleModal({
  isOpen,
  onClose,
  currentRole,
  onSelectRole
}: UserRoleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative transition-all">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 dark:bg-sky-500/10 text-sky-800 dark:text-sky-300 border border-sky-200/60 dark:border-sky-500/20 mb-1.5">
              <Sparkles className="w-3 h-3 text-sky-600 dark:text-sky-400" /> RBAC Permissions Matrix
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Platform User Roles
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Role-Based Access Control hierarchy implemented across all endpoints and UI views.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Roles Grid matching user diagram */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Visitor (Anonymous) */}
          <div
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              currentRole === 'VISITOR'
                ? 'bg-sky-50/60 dark:bg-sky-500/10 border-sky-400/80 dark:border-sky-500/40 shadow-xs ring-2 ring-sky-500/20'
                : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <Globe className="w-4 h-4" />
                </div>
                {currentRole === 'VISITOR' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-600 text-white">
                    Active
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                Visitor <span className="text-xs text-slate-500 font-normal">(Anonymous)</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-1.5">
                  <span className="text-sky-500 mt-0.5">•</span>
                  <span>Open short links and enter passwords</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-sky-500 mt-0.5">•</span>
                  <span>No management access</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onSelectRole('VISITOR')}
              className={`mt-4 w-full py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                currentRole === 'VISITOR'
                  ? 'bg-sky-600 text-white'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {currentRole === 'VISITOR' ? <Check className="w-3.5 h-3.5" /> : null}
              {currentRole === 'VISITOR' ? 'Current Role' : 'Simulate Visitor'}
            </button>
          </div>

          {/* 2. User */}
          <div
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              currentRole === 'USER'
                ? 'bg-emerald-50/60 dark:bg-emerald-500/10 border-emerald-400/80 dark:border-emerald-500/40 shadow-xs ring-2 ring-emerald-500/20'
                : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <UserCheck className="w-4 h-4" />
                </div>
                {currentRole === 'USER' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white">
                    Active
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                User
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>Manage own links, campaigns, tags, and QR codes</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>View analytics for own links only</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onSelectRole('USER')}
              className={`mt-4 w-full py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                currentRole === 'USER'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {currentRole === 'USER' ? <Check className="w-3.5 h-3.5" /> : null}
              {currentRole === 'USER' ? 'Current Role' : 'Simulate User'}
            </button>
          </div>

          {/* 3. Admin */}
          <div
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              currentRole === 'ADMIN'
                ? 'bg-indigo-50/60 dark:bg-indigo-500/10 border-indigo-400/80 dark:border-indigo-500/40 shadow-xs ring-2 ring-indigo-500/20'
                : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                {currentRole === 'ADMIN' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600 text-white">
                    Active
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                Admin
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-500 mt-0.5">•</span>
                  <span>Full access to all links, users, and settings</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-500 mt-0.5">•</span>
                  <span>Disable abusive links and manage the domain blocklist</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-500 mt-0.5">•</span>
                  <span>View platform-wide analytics</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onSelectRole('ADMIN')}
              className={`mt-4 w-full py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                currentRole === 'ADMIN'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {currentRole === 'ADMIN' ? <Check className="w-3.5 h-3.5" /> : null}
              {currentRole === 'ADMIN' ? 'Current Role' : 'Simulate Admin'}
            </button>
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Clicking a role switches the dashboard view to verify RBAC enforcement in real time.
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
