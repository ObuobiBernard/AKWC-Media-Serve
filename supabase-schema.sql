-- ==============================================================
-- AKWC MEDIASERVE: SUPABASE COMPLETE DATABASE SCHEMA & POLICIES
-- Project: COP Akweteyman Worship Center (AKWC) Media Ministry
-- Database: PostgreSQL (Supabase)
-- Instructions: Run this in your Supabase Project -> SQL Editor -> Run
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

-- ENABLE ROW LEVEL SECURITY & PERMISSIVE POLICIES FOR IN-APP AUTH
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

-- CREATE POLICIES (Read & Write permitted for anon client)
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
