-- Kalā media sharing: profiles / threads / messages
-- Paste once into the Supabase SQL editor (spec §9 step 1).
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('artist','organiser')),
  display_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

-- This project previously ran another app's schema: its profiles table has no
-- role/display_name/avatar_url, and `create table if not exists` above skips.
-- Add them idempotently (no-op on a fresh install). Legacy rows stay role-NULL
-- until ensureProfile upserts the role at their next login; NULL role simply
-- reads as "not organiser". Keeping role nullable here also lets the old
-- signup trigger keep inserting (id, name) without a role.
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  opportunity_id text not null,
  opportunity_title text not null,
  artist_id uuid not null references public.profiles(id),
  artist_name text,
  artist_avatar text,
  organiser_id uuid references public.profiles(id),
  organiser_name text,
  organiser_avatar text,
  artist_last_read_at timestamptz not null default now(),
  organiser_last_read_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (opportunity_id, artist_id)
);

-- id has NO default: the client generates it so a retry is an idempotent
-- upsert rather than a duplicate row (spec §4).
create table if not exists public.messages (
  id uuid primary key,
  thread_id uuid not null references public.threads(id) on delete cascade,
  sender_id uuid not null,
  sender_role text not null check (sender_role in ('artist','organiser')),
  body text,
  media_url text,
  media_public_id text,
  media_type text check (media_type in ('image','video')),
  media_bytes int,
  created_at timestamptz not null default now(),
  constraint has_body_or_media check (body is not null or media_url is not null)
);

create index if not exists messages_thread_created_idx
  on public.messages (thread_id, created_at);
create index if not exists messages_sender_created_idx
  on public.messages (sender_id, created_at);
create index if not exists threads_artist_idx on public.threads (artist_id);
create index if not exists threads_organiser_idx on public.threads (organiser_id);

-- ---------------------------------------------------------------------------
-- 2. Triggers (spec §4 "Triggers")
-- ---------------------------------------------------------------------------

-- Trigger 1: per-user monthly upload budget, 100 MB.
-- Runs as the inserting user so it sits inside RLS.
create or replace function public.enforce_media_budget()
returns trigger
language plpgsql
as $$
declare
  used bigint;
begin
  if new.media_bytes is null then
    return new;
  end if;

  select coalesce(sum(media_bytes), 0)
    into used
    from public.messages
   where sender_id = auth.uid()
     and created_at >= date_trunc('month', now())
     and id <> new.id;

  if used + new.media_bytes > 104857600 then
    raise exception 'MONTHLY_BUDGET_EXCEEDED: % of 104857600 bytes used', used;
  end if;

  return new;
end;
$$;

-- Trigger 2: at most 20 media items per thread.
create or replace function public.enforce_thread_media_cap()
returns trigger
language plpgsql
as $$
declare
  n int;
begin
  if new.media_url is null then
    return new;
  end if;

  select count(*)
    into n
    from public.messages
   where thread_id = new.thread_id
     and media_url is not null
     and id <> new.id;

  if n >= 20 then
    raise exception 'THREAD_MEDIA_CAP: thread already holds % media items', n;
  end if;

  return new;
end;
$$;

-- Trigger 3: keep last_message_at fresh for inbox ordering and unread.
-- MUST be security definer: the threads UPDATE policy permits only
-- *_last_read_at from a participant, so an invoker-rights update would
-- be rejected by RLS and inbox ordering would silently stop updating.
create or replace function public.touch_thread_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.threads
     set last_message_at = new.created_at
   where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists messages_budget_trg on public.messages;
create trigger messages_budget_trg
  before insert or update of media_bytes on public.messages
  for each row execute function public.enforce_media_budget();

drop trigger if exists messages_thread_media_cap_trg on public.messages;
create trigger messages_thread_media_cap_trg
  before insert on public.messages
  for each row execute function public.enforce_thread_media_cap();

drop trigger if exists messages_touch_thread_trg on public.messages;
create trigger messages_touch_thread_trg
  after insert on public.messages
  for each row execute function public.touch_thread_on_message();

-- Trigger 4: RLS cannot restrict WHICH columns an UPDATE touches, so the
-- threads read-receipt policy below is column-agnostic. This enforces it:
-- a participant may change only their own *_last_read_at, plus the claim
-- fields (organiser_id null -> value) on an unclaimed thread. The column
-- list keeps trigger 3's security definer last_message_at bump out of scope.
create or replace function public.enforce_thread_update()
returns trigger
language plpgsql
as $$
begin
  -- Claim: the first organiser sets the claim fields on an unclaimed thread.
  if old.organiser_id is null and new.organiser_id is not null then
    if new.id is distinct from old.id
       or new.opportunity_id is distinct from old.opportunity_id
       or new.opportunity_title is distinct from old.opportunity_title
       or new.artist_id is distinct from old.artist_id
       or new.artist_name is distinct from old.artist_name
       or new.artist_avatar is distinct from old.artist_avatar
       or new.artist_last_read_at is distinct from old.artist_last_read_at
       or new.organiser_last_read_at is distinct from old.organiser_last_read_at
       or new.last_message_at is distinct from old.last_message_at
       or new.created_at is distinct from old.created_at then
      raise exception 'THREAD_CLAIM_COLUMNS: a claim may only set the organiser fields';
    end if;
    return new;
  end if;

  -- Read receipt: nothing but the caller's own cursor may move.
  if new.id is distinct from old.id
     or new.opportunity_id is distinct from old.opportunity_id
     or new.opportunity_title is distinct from old.opportunity_title
     or new.artist_id is distinct from old.artist_id
     or new.artist_name is distinct from old.artist_name
     or new.artist_avatar is distinct from old.artist_avatar
     or new.organiser_id is distinct from old.organiser_id
     or new.organiser_name is distinct from old.organiser_name
     or new.organiser_avatar is distinct from old.organiser_avatar
     or new.last_message_at is distinct from old.last_message_at
     or new.created_at is distinct from old.created_at then
    raise exception 'THREAD_UPDATE_COLUMNS: only read cursors may change';
  end if;

  if auth.uid() = old.artist_id then
    if new.organiser_last_read_at is distinct from old.organiser_last_read_at then
      raise exception 'THREAD_UPDATE_COLUMNS: you may only advance your own read cursor';
    end if;
  elsif auth.uid() = old.organiser_id then
    if new.artist_last_read_at is distinct from old.artist_last_read_at then
      raise exception 'THREAD_UPDATE_COLUMNS: you may only advance your own read cursor';
    end if;
  else
    raise exception 'THREAD_UPDATE_COLUMNS: not a participant';
  end if;
  return new;
end;
$$;

drop trigger if exists threads_update_columns_trg on public.threads;
create trigger threads_update_columns_trg
  before update of artist_last_read_at, organiser_last_read_at,
                   organiser_id, organiser_name, organiser_avatar
  on public.threads
  for each row execute function public.enforce_thread_update();

-- ---------------------------------------------------------------------------
-- 3. Row Level Security (spec §4 "Access control")
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.threads  enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_organiser()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'organiser'
  );
$$;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists threads_select on public.threads;
create policy threads_select on public.threads
  for select using (
    artist_id = auth.uid()
    or organiser_id = auth.uid()
    or (organiser_id is null and public.is_organiser())
  );

drop policy if exists threads_insert on public.threads;
create policy threads_insert on public.threads
  for insert with check (artist_id = auth.uid());

drop policy if exists threads_claim on public.threads;
create policy threads_claim on public.threads
  for update using (
    organiser_id is null
    and artist_id <> auth.uid()
    and public.is_organiser()
  )
  with check (
    organiser_id = auth.uid()
    and artist_id <> auth.uid()
    and public.is_organiser()
  );

-- Column-agnostic by necessity: RLS cannot restrict which columns an UPDATE
-- touches, so this policy scopes only WHO may update. The own-cursor-only
-- rule is enforced by public.enforce_thread_update() (trigger 4 above).
drop policy if exists threads_read_receipt on public.threads;
create policy threads_read_receipt on public.threads
  for update using (
    artist_id = auth.uid() or organiser_id = auth.uid()
  )
  with check (
    artist_id = auth.uid() or organiser_id = auth.uid()
  );

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (
    exists (select 1 from public.threads t where t.id = thread_id)
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.threads t
       where t.id = thread_id
         and (t.artist_id = auth.uid() or t.organiser_id = auth.uid())
    )
  );

-- No UPDATE or DELETE policy on messages: messages are immutable (spec §3).

grant select, insert on public.profiles to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.threads to authenticated;
grant select, insert on public.messages to authenticated;
grant execute on function public.is_organiser() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Realtime (spec §9 step 3)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'threads'
  ) then
    alter publication supabase_realtime add table public.threads;
  end if;
end $$;

-- ===========================================================================
-- 5. Marketplace: opportunities + applications
--     Paste the WHOLE file (it is idempotent) into the Supabase SQL editor.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 5.1 Opportunities (an organiser's casting/audition call)
-- ---------------------------------------------------------------------------
create table if not exists public.opportunities (
  id              uuid primary key default gen_random_uuid(),
  organiser_id    uuid not null references public.profiles(id) on delete cascade,
  -- Display snapshots: profiles RLS stops other users reading the organiser row.
  organiser_name  text,
  organiser_avatar text,
  title           text not null check (length(btrim(title)) between 3 and 300),
  category        text not null check (length(btrim(category)) between 1 and 80),
  description     text,
  requirements    text[],
  location        text,
  venue           text,
  city            text,
  date_range      text,
  deadline        timestamptz,
  compensation    text,
  image_url       text,
  status          text not null default 'active' check (status in ('active', 'closed')),
  featured        boolean not null default false,
  -- Maintained by trigger in 5.3 — never written by clients.
  applicant_count int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists opportunities_organiser_idx on public.opportunities (organiser_id);
create index if not exists opportunities_status_deadline_idx on public.opportunities (status, deadline);
create index if not exists opportunities_category_idx on public.opportunities (category);
create index if not exists opportunities_created_idx on public.opportunities (created_at desc);

-- ---------------------------------------------------------------------------
-- 5.2 Applications (one artist -> one opportunity, enforced by the DB)
-- ---------------------------------------------------------------------------
create table if not exists public.applications (
  id                uuid primary key default gen_random_uuid(),
  opportunity_id    uuid not null references public.opportunities(id) on delete cascade,
  applicant_id      uuid not null references public.profiles(id) on delete cascade,
  -- Snapshot of the applicant at submission time (profiles RLS blocks later reads)
  applicant_name    text not null,
  applicant_avatar  text,
  applicant_role    text,
  applicant_city    text,
  skills            text,
  experience_years  int check (experience_years is null or experience_years between 0 and 80),
  statement         text,
  portfolio_url     text,
  reel_url          text,
  file_name         text,
  -- Set by the reviewing organiser only (column grant, see 5.5).
  status            text not null default 'under_review'
                    check (status in ('under_review', 'interview', 'selected', 'rejected')),
  rating            int check (rating is null or rating between 1 and 5),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Business rule: an artist may apply at most once per opportunity.
  unique (opportunity_id, applicant_id)
);

create index if not exists applications_opportunity_idx on public.applications (opportunity_id);
create index if not exists applications_applicant_idx on public.applications (applicant_id);
create index if not exists applications_status_idx on public.applications (status);

-- ---------------------------------------------------------------------------
-- 5.3 Triggers: applicant_count stays correct no matter who writes
-- ---------------------------------------------------------------------------
create or replace function public.refresh_opportunity_applicant_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.opportunities
       set applicant_count = applicant_count + 1
     where id = new.opportunity_id;
  elsif tg_op = 'DELETE' then
    update public.opportunities
       set applicant_count = greatest(applicant_count - 1, 0)
     where id = old.opportunity_id;
  elsif tg_op = 'UPDATE' and new.opportunity_id is distinct from old.opportunity_id then
    update public.opportunities set applicant_count = greatest(applicant_count - 1, 0)
     where id = old.opportunity_id;
    update public.opportunities set applicant_count = applicant_count + 1
     where id = new.opportunity_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists applications_count_trg on public.applications;
create trigger applications_count_trg
  after insert or update or delete on public.applications
  for each row execute function public.refresh_opportunity_applicant_count();

-- ---------------------------------------------------------------------------
-- 5.4 Row Level Security
-- ---------------------------------------------------------------------------
alter table public.opportunities enable row level security;
alter table public.applications  enable row level security;

-- Anyone signed in can browse the marketplace; only the owning organiser may
-- write. is_organiser() is the product's own gate (organiser is a self-serve
-- signup role — this stops artists who never chose it from posting calls).
drop policy if exists opportunities_select on public.opportunities;
create policy opportunities_select on public.opportunities
  for select to authenticated using (true);

drop policy if exists opportunities_insert on public.opportunities;
create policy opportunities_insert on public.opportunities
  for insert to authenticated
  with check (organiser_id = auth.uid() and public.is_organiser());

drop policy if exists opportunities_update on public.opportunities;
create policy opportunities_update on public.opportunities
  for update to authenticated
  using (organiser_id = auth.uid())
  with check (organiser_id = auth.uid());

drop policy if exists opportunities_delete on public.opportunities;
create policy opportunities_delete on public.opportunities
  for delete to authenticated
  using (organiser_id = auth.uid());

drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications
  for select to authenticated
  using (
    applicant_id = auth.uid()
    or exists (
      select 1 from public.opportunities o
       where o.id = opportunity_id and o.organiser_id = auth.uid()
    )
  );

-- Applicants may only file applications as themselves, and only against a live
-- call (status + deadline enforced server-side, not just in the UI).
drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications
  for insert to authenticated
  with check (
    applicant_id = auth.uid()
    and exists (
      select 1 from public.opportunities o
       where o.id = opportunity_id
         and o.status = 'active'
         and (o.deadline is null or o.deadline > now())
    )
  );

-- Only the organiser who owns the call may review, and only via the columns
-- granted in 5.5 (status / rating / updated_at) — they cannot re-file the
-- application as someone else.
drop policy if exists applications_update on public.applications;
create policy applications_update on public.applications
  for update to authenticated
  using (
    exists (
      select 1 from public.opportunities o
       where o.id = opportunity_id and o.organiser_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.opportunities o
       where o.id = opportunity_id and o.organiser_id = auth.uid()
    )
  );

-- No DELETE policy: application records are transactional history.

-- ---------------------------------------------------------------------------
-- 5.5 Column-level grants (RLS scopes WHO; these scope WHICH COLUMNS)
-- ---------------------------------------------------------------------------
revoke all on table public.opportunities from anon;
revoke all on table public.applications  from anon;

grant select, insert, delete on table public.opportunities to authenticated;
revoke update on table public.opportunities from authenticated;
grant update (title, category, description, requirements, location, venue,
              city, date_range, deadline, compensation, image_url, status,
              featured, updated_at)
  on table public.opportunities to authenticated;

grant select, insert on table public.applications to authenticated;
revoke update, delete on table public.applications from authenticated;
grant update (status, rating, updated_at)
  on table public.applications to authenticated;

-- ---------------------------------------------------------------------------
-- 5.6 Aggregates: every displayed metric is computed here, once
-- ---------------------------------------------------------------------------
create or replace function public.platform_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'artists',       (select count(*) from public.profiles where role = 'artist'),
    'organisers',    (select count(*) from public.profiles where role = 'organiser'),
    'opportunities', (select count(*) from public.opportunities),
    'applications',  (select count(*) from public.applications),
    'cities',        (select count(distinct city) from public.opportunities
                       where city is not null and btrim(city) <> '')
  );
$$;

create or replace function public.category_counts()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_object_agg(category, n)
       from (select category, count(*)::int as n
               from public.opportunities
              group by category) counts),
    '{}'::jsonb
  );
$$;

revoke execute on function public.platform_stats() from public, anon;
revoke execute on function public.category_counts() from public, anon;
grant execute on function public.platform_stats() to authenticated;
grant execute on function public.category_counts() to authenticated;

