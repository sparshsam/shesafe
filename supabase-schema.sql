-- ============================================================
-- SheSafe Schema v2 — Guest-first public safety map
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qoxmibmbyjmkntzrckyr/sql/new
-- ============================================================

-- 1. Extensions
create extension if not exists "pgcrypto";

-- 2. Tables
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists pins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete set null,
  session_id text,                                   -- guest identifier for abuse prevention
  lat double precision not null,
  lng double precision not null,
  tag text not null check (tag in ('safe', 'mixed', 'unsafe')),
  category text check (category in ('lighting', 'harassment', 'traffic', 'security', 'general', 'other')),
  description text,
  time_of_day text check (time_of_day in ('morning', 'afternoon', 'evening', 'night', 'any')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists pin_upvotes (
  id uuid default gen_random_uuid() primary key,
  pin_id uuid references pins(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade,
  session_id text,                                   -- guest identifier
  created_at timestamptz default now()
);

-- Partial unique indexes for pin_upvotes:
--   authenticated users are unique per (pin_id, user_id)
--   guests are unique per (pin_id, session_id)
drop index if exists pin_upvotes_user_unique;
create unique index pin_upvotes_user_unique on pin_upvotes (pin_id, user_id) where user_id is not null;
drop index if exists pin_upvotes_session_unique;
create unique index pin_upvotes_session_unique on pin_upvotes (pin_id, session_id) where user_id is null and session_id is not null;

create table if not exists pin_comments (
  id uuid default gen_random_uuid() primary key,
  pin_id uuid references pins(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete set null,
  session_id text,                                   -- guest identifier
  body text not null,
  created_at timestamptz default now()
);

create table if not exists pin_flags (
  id uuid default gen_random_uuid() primary key,
  pin_id uuid references pins(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete set null,
  session_id text,                                   -- guest identifier
  reason text,
  created_at timestamptz default now()
);

-- 3. Indexes
create index if not exists pins_tag_idx on pins (tag);
create index if not exists pins_created_at_idx on pins (created_at desc);
create index if not exists pins_session_idx on pins (session_id);
create index if not exists pin_upvotes_pin_id_idx on pin_upvotes (pin_id);
create index if not exists pin_upvotes_session_idx on pin_upvotes (session_id);
create index if not exists pin_comments_pin_id_idx on pin_comments (pin_id);
create index if not exists pin_flags_pin_id_idx on pin_flags (pin_id);
create index if not exists pin_flags_session_idx on pin_flags (session_id);

-- 4. Row Level Security
alter table profiles enable row level security;
alter table pins enable row level security;
alter table pin_upvotes enable row level security;
alter table pin_comments enable row level security;
alter table pin_flags enable row level security;

-- 5. RLS Policies

-- Profiles
drop policy if exists "Profiles publicly readable" on profiles;
create policy "Profiles publicly readable" on profiles for select using (true);

drop policy if exists "Users update own profile" on profiles;
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- Pins
drop policy if exists "Pins publicly readable" on pins;
create policy "Pins publicly readable" on pins for select using (true);

drop policy if exists "Auth users insert pins" on pins;
drop policy if exists "Public insert pins" on pins;
create policy "Public insert pins" on pins for insert with check (
  -- Authenticated users: user_id must match
  -- Anonymous users: session_id must be provided
  (auth.role() = 'authenticated' and auth.uid() = user_id)
  or
  (auth.role() = 'anon' and session_id is not null)
);

drop policy if exists "Users update own pins" on pins;
create policy "Users update own pins" on pins for update using (auth.uid() = user_id);

drop policy if exists "Users delete own pins" on pins;
create policy "Users delete own pins" on pins for delete using (auth.uid() = user_id);

-- Upvotes
drop policy if exists "Upvotes publicly readable" on pin_upvotes;
create policy "Upvotes publicly readable" on pin_upvotes for select using (true);

drop policy if exists "Auth users upvote" on pin_upvotes;
drop policy if exists "Public insert upvotes" on pin_upvotes;
create policy "Public insert upvotes" on pin_upvotes for insert with check (
  (auth.role() = 'authenticated' and auth.uid() = user_id)
  or
  (auth.role() = 'anon' and session_id is not null)
);

drop policy if exists "Users remove own upvote" on pin_upvotes;
create policy "Users remove own upvote" on pin_upvotes for delete using (
  auth.uid() = user_id or session_id is not null
);

-- Comments
drop policy if exists "Comments publicly readable" on pin_comments;
create policy "Comments publicly readable" on pin_comments for select using (true);

drop policy if exists "Auth users comment" on pin_comments;
drop policy if exists "Public insert comments" on pin_comments;
create policy "Public insert comments" on pin_comments for insert with check (
  (auth.role() = 'authenticated' and auth.uid() = user_id)
  or
  (auth.role() = 'anon' and session_id is not null)
);

-- Flags
drop policy if exists "Auth users flag pins" on pin_flags;
drop policy if exists "Public insert flags" on pin_flags;
create policy "Public insert flags" on pin_flags for insert with check (
  (auth.role() = 'authenticated' and auth.uid() = user_id)
  or
  (auth.role() = 'anon' and session_id is not null)
);

-- 6. Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Anonymous'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ✅ Done! Run this once, then toggle on Email auth in Supabase Dashboard.
