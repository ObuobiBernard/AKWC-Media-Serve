import React, { useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  isSupabaseConfigured,
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
} from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SUPABASE_SETUP_SQL = `-- ==============================================================
-- AKWC MEDIASERVE: SUPABASE COMPLETE DATABASE SCHEMA & POLICIES
-- Run this in your Supabase Project -> SQL Editor -> New Query -> Run
-- ==============================================================

-- 1. ROLES TABLE
create table if not exists public.roles (
  id text primary key,
  name text not null,
  category text not null,
  description text default '',
  "defaultCount" integer default 1,
  station text not null,
  "skillRequired" text not null
);

-- 2. MEMBERS TABLE
create table if not exists public.members (
  id text primary key,
  name text not null,
  email text not null unique,
  phone text not null,
  gender text default 'Male',
  "avatarUrl" text,
  "primaryRole" text not null,
  "secondaryRoles" jsonb default '[]'::jsonb,
  "skillLevel" text not null,
  "rawSkillDescription" text default '',
  availability text default 'Flexible',
  status text default 'active',
  "joinedDate" text not null,
  notes text default '',
  "isLeader" boolean default false,
  "blackoutDates" jsonb default '[]'::jsonb
);

-- 3. ACCOUNTS TABLE
create table if not exists public.accounts (
  id text primary key,
  email text not null unique,
  "memberId" text not null,
  "allowedPortals" jsonb default '["team"]'::jsonb,
  "defaultPortal" text default 'team',
  password text,
  "hasSetPassword" boolean default false,
  "passwordSetAt" text
);

-- 4. PROGRAMS TABLE
create table if not exists public.programs (
  id text primary key,
  title text not null,
  "serviceType" text not null,
  date text not null,
  "startTime" text not null,
  "endTime" text not null,
  "callTime" text not null,
  location text not null,
  theme text default '',
  "directorName" text not null,
  "googleCalendarEventId" text,
  "isCompleted" boolean default false
);

-- 5. ASSIGNMENTS TABLE
create table if not exists public.assignments (
  id text primary key,
  "programId" text not null,
  "roleId" text not null,
  "memberId" text,
  status text not null default 'pending',
  "confirmedAt" text,
  "declineReason" text,
  "replacementForMemberId" text,
  "remindersSent" jsonb default '[]'::jsonb,
  "whatsappNotificationSent" boolean default false,
  "whatsappNotificationAt" text,
  "arrivalComment" text,
  "estimatedArrivalTime" text
);

-- 6. ANNOUNCEMENTS TABLE
create table if not exists public.announcements (
  id text primary key,
  title text not null,
  content text not null,
  author text not null,
  date text not null,
  priority text default 'normal',
  tag text not null default 'Ministry'
);

-- 7. DAILY VERSE TABLE
create table if not exists public.verse (
  id text primary key default 'daily_verse',
  verse text not null,
  reference text not null,
  reflection text default '',
  date text not null
);

-- 8. REMINDER CONFIG TABLE
create table if not exists public.reminder_config (
  id text primary key default 'default_config',
  intervals jsonb not null,
  "autoReplacementAlert" boolean default true,
  "whatsappTemplate" text not null
);

-- 9. AUDIT LOGS TABLE
create table if not exists public.audit_logs (
  id text primary key,
  timestamp text not null,
  "actorName" text not null,
  action text not null,
  details text default '',
  type text default 'system'
);

-- 10. PUSH SUBSCRIPTIONS TABLE
create table if not exists public.push_subscriptions (
  id text primary key,
  "memberId" text not null,
  subscription jsonb not null,
  "createdAt" text not null
);

-- ENABLE ROW LEVEL SECURITY & OPEN POLICIES FOR IN-APP AUTH
alter table public.roles enable row level security;
alter table public.members enable row level security;
alter table public.accounts enable row level security;
alter table public.programs enable row level security;
alter table public.assignments enable row level security;
alter table public.announcements enable row level security;
alter table public.verse enable row level security;
alter table public.reminder_config enable row level security;
alter table public.audit_logs enable row level security;
alter table public.push_subscriptions enable row level security;

-- CREATE UNIVERSAL POLICIES (Read & Write permitted for anon client)
do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop policy if exists "anon_full_access" on public.%I;', t);
    execute format('create policy "anon_full_access" on public.%I for all using (true) with check (true);', t);
  end loop;
end $$;

-- ENABLE REALTIME REPLICATION FOR LIVE ROSTER UPDATES
alter publication supabase_realtime add table public.programs;
alter publication supabase_realtime add table public.assignments;
alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.accounts;
alter publication supabase_realtime add table public.announcements;
`;

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast } = useApp();
  const currentConfig = getSupabaseConfig();

  const [url, setUrl] = useState(currentConfig.url || '');
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey || '');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      showToast('Please provide both the Supabase Project URL and Anon Public Key.');
      return;
    }
    saveSupabaseConfig(url.trim(), anonKey.trim());
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopied(true);
    showToast('Supabase SQL schema script copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Supabase DBMS Connection
                </h2>
                {isSupabaseConfigured ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30">
                    Configuration Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Cloud PostgreSQL database for AKWC MediaServe
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="my-4 space-y-4 text-xs">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Step 1: Create Database Tables in Supabase</span>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-lg border border-emerald-500/40 transition-colors cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied SQL!' : 'Copy SQL Script'}</span>
              </button>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Copy our schema script, open your Supabase project&apos;s <strong>SQL Editor</strong>, paste, and tap <strong>Run</strong>. It creates all tables (roles, members, programs, assignments, accounts) and enables real-time synchronization.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-3.5">
            <div className="font-semibold text-white">
              Step 2: Enter Supabase API Credentials
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Found in Supabase Dashboard → Project Settings → API
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Supabase Anon / Public API Key
              </label>
              <input
                type="text"
                required
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Public anon key (safe for client-side applications)
              </span>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-slate-300 leading-relaxed space-y-1">
              <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>GitHub Actions Secrets Setup (Permanent)</span>
              </div>
              <p>
                To automatically bake these keys into your GitHub Pages build whenever you push to main:
                Go to your GitHub repo → <strong>Settings</strong> → <strong>Secrets and variables</strong> → <strong>Actions</strong> → add:
              </p>
              <ul className="list-disc list-inside pl-1 font-mono text-[10px] text-slate-400">
                <li>VITE_SUPABASE_URL</li>
                <li>VITE_SUPABASE_ANON_KEY</li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-2">
              {isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={clearSupabaseConfig}
                  className="text-xs text-rose-400 hover:text-rose-300"
                >
                  Disconnect / Reset
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Connect & Reload</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
