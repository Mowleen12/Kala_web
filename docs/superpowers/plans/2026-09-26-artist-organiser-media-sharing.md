# Artist ↔ Organiser Media Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give artists and organisers a durable, two-way, per-application thread in which photos and videos can be exchanged, while keeping both parties inside Supabase and Cloudinary free-tier limits.

**Architecture:** Three Supabase Postgres tables (`profiles`, `threads`, `messages`) with Row Level Security and three triggers enforcing quotas; Cloudinary unsigned direct uploads for media; Supabase Realtime scoped to a single open thread; a `threads.ts` data layer that falls back to local state when env vars are absent.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, `@supabase/supabase-js` v2, Cloudinary unsigned uploads, `tsx` + `node:test` for the one runnable check.

**Spec:** `docs/superpowers/specs/2026-09-26-artist-organiser-media-sharing-design.md` — this plan argues from that spec; read both.

## Global Constraints

- Image max file size: **5 MB** (`IMAGE_MAX_BYTES = 5 * 1024 * 1024`). Cloudinary Free ceiling is 10 MB; we sit below it.
- Video max file size: **40 MB** (`VIDEO_MAX_BYTES = 40 * 1024 * 1024`). Cloudinary Free only transforms videos ≤ 40 MB and `getOptimizedCloudinaryUrl` always emits `f_auto,q_auto` — this is a hard delivery constraint, not a preference.
- Per-user uploads: **100 MB per calendar month** (`USER_MONTHLY_BYTES = 100 * 1024 * 1024`).
- Media per thread: **20** (`MEDIA_PER_THREAD = 20`). Messages per thread: **200** (UI-only, soft).
- Three tables only: `profiles`, `threads`, `messages`. Do not add a fourth.
- `messages.id` is generated **client-side** (`crypto.randomUUID()`); the column has no default. Server-side `gen_random_uuid()` breaks idempotent retry.
- Messages are **immutable**: no UPDATE or DELETE policy on `messages`.
- Realtime subscriptions exist **only while a thread is open**; unsubscribe on close.
- **No new npm dependencies.** `tsx` and `node:test` are already available; `npm test` must not require installing anything.
- `maxSizeMB` prop is **removed** from `MediaUploader`, not made optional — every cap comes from `src/lib/limits.ts`.
- Fallback mode: **triggered by capability, not by env.** `isSupabaseConfigured` is `true` on every load — `supabase.ts:4-5` hardcodes a real URL/key as fallback — so the spec's original "`isSupabaseConfigured === false`" trigger can never fire. `threads.ts` instead exposes `isDbReady()`: true only when a Supabase **session exists** (quick-demo users have none, `auth.uid()` would be NULL and RLS would reject every write) **and** the `threads` table is queryable (migration not yet run). While not ready, all `threads.ts` calls serve local in-memory state. The modal's preview-mode banner remains keyed to `isCloudinaryConfigured` — it is about media delivery, not the database.
- `npm run lint` (`tsc --noEmit`) must pass before every commit.

---

### Task 1: Quota limits module

**Files:**
- Create: `src/lib/limits.ts`
- Create: `src/lib/limits.test.ts`
- Modify: `package.json` (add `"test"` script)

**Interfaces:**
- Consumes: nothing.
- Produces (later tasks rely on these exact names):
  - `IMAGE_MAX_BYTES: number`, `VIDEO_MAX_BYTES: number`, `USER_MONTHLY_BYTES: number`
  - `MEDIA_PER_THREAD: number`, `MESSAGES_PER_THREAD: number`
  - `isVideoFile(file: File): boolean`
  - `maxBytesFor(file: File): number`
  - `remaining(usedBytes: number): number`
  - `formatMB(bytes: number): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/limits.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  USER_MONTHLY_BYTES,
  MEDIA_PER_THREAD,
  MESSAGES_PER_THREAD,
  isVideoFile,
  maxBytesFor,
  remaining,
  formatMB,
} from './limits';

const MB = 1024 * 1024;

function fakeFile(name: string, type: string): File {
  return new File(['x'], name, { type });
}

test('video ceiling is exactly 40 MB — Cloudinary Free transform limit', () => {
  assert.equal(VIDEO_MAX_BYTES, 40 * MB);
  assert.ok(VIDEO_MAX_BYTES <= 40 * MB, 'video cap must not exceed the transform ceiling');
});

test('image ceiling is exactly 5 MB and sits below Cloudinary Free 10 MB', () => {
  assert.equal(IMAGE_MAX_BYTES, 5 * MB);
  assert.ok(IMAGE_MAX_BYTES <= 10 * MB);
});

test('monthly budget is 100 MB', () => {
  assert.equal(USER_MONTHLY_BYTES, 100 * MB);
});

test('thread caps', () => {
  assert.equal(MEDIA_PER_THREAD, 20);
  assert.equal(MESSAGES_PER_THREAD, 200);
});

test('isVideoFile detects by MIME type', () => {
  assert.equal(isVideoFile(fakeFile('reel.mp4', 'video/mp4')), true);
  assert.equal(isVideoFile(fakeFile('still.jpg', 'image/jpeg')), false);
});

test('isVideoFile falls back to extension when the browser reports no MIME type', () => {
  assert.equal(isVideoFile(fakeFile('take.MOV', '')), true);
  assert.equal(isVideoFile(fakeFile('take.webm', '')), true);
  assert.equal(isVideoFile(fakeFile('portrait.png', '')), false);
});

test('maxBytesFor picks the cap from the detected media type', () => {
  assert.equal(maxBytesFor(fakeFile('reel.mp4', 'video/mp4')), VIDEO_MAX_BYTES);
  assert.equal(maxBytesFor(fakeFile('portrait.png', 'image/png')), IMAGE_MAX_BYTES);
});

test('remaining never goes negative', () => {
  assert.equal(remaining(0), USER_MONTHLY_BYTES);
  assert.equal(remaining(50 * MB), 50 * MB);
  assert.equal(remaining(USER_MONTHLY_BYTES), 0);
  assert.equal(remaining(USER_MONTHLY_BYTES + 1), 0);
});

test('formatMB renders one decimal place', () => {
  assert.equal(formatMB(0), '0.0 MB');
  assert.equal(formatMB(5 * MB), '5.0 MB');
  assert.equal(formatMB(40 * MB), '40.0 MB');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './limits'` (or equivalent module-not-found).

- [ ] **Step 3: Add the `test` script to `package.json`**

Inside the existing `"scripts"` block, add:

```json
"test": "tsx --test src/lib/limits.test.ts"
```

- [ ] **Step 4: Write the implementation**

Create `src/lib/limits.ts`:

```ts
/**
 * Free-tier upload limits.
 *
 * Cloudinary Free caps images at 10 MB and videos at 100 MB, but only applies
 * transformations to videos up to 40 MB — and getOptimizedCloudinaryUrl always
 * emits f_auto,q_auto. Anything larger fails at delivery rather than upload.
 */

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 40 * 1024 * 1024;
export const USER_MONTHLY_BYTES = 100 * 1024 * 1024;
export const MEDIA_PER_THREAD = 20;
export const MESSAGES_PER_THREAD = 200;

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'ogg', 'm4v'];

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  if (file.type.startsWith('image/')) return false;
  const ext = file.name.toLowerCase().split('.').pop() || '';
  return VIDEO_EXTENSIONS.includes(ext);
}

export function maxBytesFor(file: File): number {
  return isVideoFile(file) ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
}

export function remaining(usedBytes: number): number {
  return Math.max(0, USER_MONTHLY_BYTES - usedBytes);
}

export function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — `# pass 9`, `# fail 0`.

- [ ] **Step 6: Run lint**

Run: `npm run lint`
Expected: clean, no output.

- [ ] **Step 7: Commit**

```bash
git add src/lib/limits.ts src/lib/limits.test.ts package.json
git commit -m "feat: add free-tier upload limit constants with quota tests" -m "Caps media at 5 MB images / 40 MB videos against Cloudinary Free's 10 MB and transform ceilings, and budgets each user to 100 MB per calendar month. The video ceiling is load-bearing: getOptimizedCloudinaryUrl always applies f_auto,q_auto, which Cloudinary Free refuses past 40 MB, so raising this reintroduces a failure that only appears at delivery."
```

---

### Task 2: Thread and Message types

**Files:**
- Modify: `src/types.ts` (append)

**Interfaces:**
- Consumes: nothing.
- Produces (later tasks rely on these exact names):
  - `interface Thread`
  - `type MessageSenderRole = 'artist' | 'organiser'`
  - `interface Message`

- [ ] **Step 1: Append the types to `src/types.ts`**

```ts
export type MessageSenderRole = 'artist' | 'organiser';

export interface Thread {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  artistId: string;
  artistName: string | null;
  artistAvatar: string | null;
  organiserId: string | null;
  organiserName: string | null;
  organiserAvatar: string | null;
  artistLastReadAt: string;
  organiserLastReadAt: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  body: string | null;
  mediaUrl: string | null;
  mediaPublicId: string | null;
  mediaType: 'image' | 'video' | null;
  mediaBytes: number | null;
  createdAt: string;
  /** Client-only: queued locally, not yet acknowledged by the server. */
  pending?: boolean;
  /** Client-only: send failed, retry offered. Never dropped silently. */
  failed?: boolean;
}
```

Note: field names are camelCase here; `threads.ts` maps snake_case rows to this shape in one `rowToThread`/`rowToMessage` helper. Nothing else in the app should see raw column names.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add Thread and Message domain types"
```

---

### Task 3: Database migration

**Files:**
- Create: `supabase/schema.sql`

**Interfaces:**
- Consumes: Task 2's field names (snake_case columns matching `Thread`/`Message`).
- Produces: tables `public.profiles`, `public.threads`, `public.messages`; functions `enforce_media_budget()`, `enforce_thread_media_cap()`, `touch_thread_on_message()`; realtime publication entries.

**Verification note:** this file cannot be executed by the implementer — the user pastes it into the Supabase SQL editor (spec §9, §8). Its correctness is checked by `npm run lint` staying clean (it is not TypeScript, so lint does not parse it) and by the user's migration run. Review it against spec §4 line by line instead.

- [ ] **Step 1: Write the migration**

Create `supabase/schema.sql`:

```sql
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
  );

-- Participants may advance only their own read cursor.
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
```

**Known policy nuance to review, not a placeholder:** `messages_select` checks only that the parent thread row is *visible to the caller* (Postgres re-applies the `threads` RLS policy on that subquery), which is equivalent to spec §4's "via parent thread's policy" without duplicating the predicate.

- [ ] **Step 2: Verify the file is well-formed text**

Run: `Get-Content supabase/schema.sql | Measure-Object -Line`
Expected: a line count > 200, no read error. (No SQL runner exists locally; execution is the user's manual step.)

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add media sharing schema, RLS and quota triggers" -m "Three tables with row level security, a security definer trigger to bump last_message_at (the participant update policy would otherwise reject it), and two invoker-rights triggers enforcing the 100 MB monthly budget and 20-media thread cap."
```

---

### Task 4: Type-aware upload caps in MediaUploader

**Files:**
- Modify: `src/components/MediaUploader.tsx:16-26` (prop), `:36` (default), `:54-62` (validation), `:251-257` (hint)
- Modify: `src/components/ApplyModal.tsx:112` (remove prop)
- Modify: `src/components/CreateAccountModal.tsx:630` (remove prop)
- Modify: `src/components/PostOpportunityModal.tsx:279` (remove prop)
- Modify: `src/components/ProfileView.tsx:163`, `:201`, `:234` (remove prop)

**Interfaces:**
- Consumes: `maxBytesFor`, `isVideoFile`, `IMAGE_MAX_BYTES`, `VIDEO_MAX_BYTES`, `formatMB` from Task 1.
- Produces: `MediaUploader` no longer accepts `maxSizeMB`; gains optional `beforeUpload` gate.

- [ ] **Step 1: Remove `maxSizeMB` from every call site**

Delete the `maxSizeMB={...}` line from each of these files (6 lines total across 4 files; `ProfileView` contributes three):

- `ApplyModal.tsx` — `maxSizeMB={50}`
- `CreateAccountModal.tsx` — `maxSizeMB={15}`
- `PostOpportunityModal.tsx` — `maxSizeMB={20}`
- `ProfileView.tsx` — `maxSizeMB={10}`, `maxSizeMB={50}`, `maxSizeMB={15}`

- [ ] **Step 2: Remove the prop from the interface and default**

In `src/components/MediaUploader.tsx`, replace the `MediaUploaderProps` interface block:

```ts
interface MediaUploaderProps {
  label?: string;
  description?: string;
  value?: string;
  resourceType?: 'image' | 'video' | 'auto';
  folder?: string;
  onChange: (url: string, result?: CloudinaryUploadResult) => void;
  onRemove?: () => void;
  /** Spec §6 send path step 1: runs before any upload, returns an error to
   *  show (rejecting the file) or null to proceed. ThreadModal uses it for the
   *  monthly budget so a rejected insert can never orphan an uploaded asset. */
  beforeUpload?: (file: File) => string | null;
  className?: string;
}
```

and update the destructuring: remove `maxSizeMB = 50,`, add `beforeUpload,`.

- [ ] **Step 3: Import the limits**

Add to the existing `../lib/cloudinary` import line in `MediaUploader.tsx`:

```ts
import { uploadToCloudinary, isCloudinaryConfigured, CloudinaryUploadResult } from '../lib/cloudinary';
import { maxBytesFor, isVideoFile, IMAGE_MAX_BYTES, VIDEO_MAX_BYTES, formatMB } from '../lib/limits';
```

- [ ] **Step 4: Make validation type-aware**

Replace the size check inside `handleFile`:

```ts
const handleFile = async (file: File) => {
  setError(null);

  const limitBytes = maxBytesFor(file);
  if (file.size > limitBytes) {
    const kind = isVideoFile(file) ? 'video' : 'image';
    setError(
      `${formatMB(file.size)} exceeds the ${formatMB(limitBytes)} ${kind} limit`
    );
    return;
  }

  const gateError = beforeUpload?.(file);
  if (gateError) {
    setError(gateError);
    return;
  }

  setIsUploading(true);
  setProgress(0);
  // ... rest unchanged
```

This produces the spec §7 copy: *"48.2 MB exceeds the 40.0 MB video limit."*

- [ ] **Step 5: Fix the static hint**

Replace the hint span at the bottom of the drop zone:

```tsx
<div className="pt-1 flex items-center justify-center gap-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
  <span>MP4 • MOV • WEBM</span>
  <span>•</span>
  <span>JPG • PNG • WEBP</span>
  <span>•</span>
  <span>Up to {formatMB(IMAGE_MAX_BYTES)} image · {formatMB(VIDEO_MAX_BYTES)} video</span>
</div>
```

- [ ] **Step 6: Run lint and commit**

Run: `npm run lint`
Expected: clean. If it reports `Property 'maxSizeMB' does not exist …` at a call site, Step 1 missed that line — fix it and re-run. Any other error means something else regressed — stop and investigate.

```bash
git add src/components/MediaUploader.tsx src/components/ApplyModal.tsx \
        src/components/CreateAccountModal.tsx src/components/PostOpportunityModal.tsx \
        src/components/ProfileView.tsx
git commit -m "fix: enforce type-aware media size caps instead of a 50 MB default" -m "The single maxSizeMB default let a user pick a 30 MB JPG that Cloudinary Free rejects at its own 10 MB ceiling, and allowed 50 MB videos that fail transformation past 40 MB. All six call sites now derive the cap from the detected media type in lib/limits."
```

---

### Task 5: Thread data layer

**Files:**
- Create: `src/lib/threads.ts`

**Interfaces:**
- Consumes: `Thread`, `Message`, `MessageSenderRole` (Task 2); `USER_MONTHLY_BYTES`, `remaining` (Task 1); `supabase`, `isSupabaseConfigured` from `src/lib/supabase`; `AuthUser` from `src/types`.
- Produces (Task 6, 7, 8 rely on these exact signatures):
  - `isDbReady(): Promise<boolean>` — session exists AND `threads` table queryable; cached table result
  - `ensureProfile(user: AuthUser): Promise<void>`
  - `getBudget(user: AuthUser): Promise<{ usedBytes: number; remainingBytes: number }>`
  - `getStorageUsage(): Promise<{ storageBytes: number; monthBytes: number }>`
  - `ensureArtistThread(input: { opportunityId: string; opportunityTitle: string; user: AuthUser; organiserName?: string; organiserAvatar?: string }): Promise<{ thread: Thread | null; error: string | null }>`
  - `findThread(opportunityId: string, artistId: string): Promise<Thread | null>`
  - `fetchThreads(): Promise<Thread[]>`
  - `claimThread(threadId: string, user: AuthUser): Promise<void>`
  - `fetchMessages(threadId: string): Promise<Message[]>`
  - `sendMessage(input: SendMessageInput): Promise<{ message: Message | null; error: string | null }>`
  - `subscribeThread(threadId: string, onMessage: (m: Message) => void, onStatus: (s: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CLOSED') => void): () => void`
  - `markRead(threadId: string, role: MessageSenderRole): Promise<void>`
  - `interface SendMessageInput { threadId: string; sender: AuthUser; senderRole: MessageSenderRole; body?: string; media?: { url: string; publicId: string; type: 'image' | 'video'; bytes: number } | null; clientId: string }`

- [ ] **Step 1: Write the module**

Create `src/lib/threads.ts`:

```ts
import { supabase, isSupabaseConfigured } from './supabase';
import { AuthUser, Message, MessageSenderRole, Thread } from '../types';
import { USER_MONTHLY_BYTES, remaining } from './limits';

export interface SendMessageInput {
  threadId: string;
  sender: AuthUser;
  senderRole: MessageSenderRole;
  body?: string;
  media?: { url: string; publicId: string; type: 'image' | 'video'; bytes: number } | null;
  clientId: string;
}

export interface Budget {
  usedBytes: number;
  remainingBytes: number;
}

/* -------------------------------------------------------------------------- */
/* Row mapping — the only place snake_case is allowed                          */
/* -------------------------------------------------------------------------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
const rowToThread = (r: any): Thread => ({
  id: r.id,
  opportunityId: r.opportunity_id,
  opportunityTitle: r.opportunity_title,
  artistId: r.artist_id,
  artistName: r.artist_name,
  artistAvatar: r.artist_avatar,
  organiserId: r.organiser_id,
  organiserName: r.organiser_name,
  organiserAvatar: r.organiser_avatar,
  artistLastReadAt: r.artist_last_read_at,
  organiserLastReadAt: r.organiser_last_read_at,
  lastMessageAt: r.last_message_at,
  createdAt: r.created_at,
});

const rowToMessage = (r: any): Message => ({
  id: r.id,
  threadId: r.thread_id,
  senderId: r.sender_id,
  senderRole: r.sender_role,
  body: r.body,
  mediaUrl: r.media_url,
  mediaPublicId: r.media_public_id,
  mediaType: r.media_type,
  mediaBytes: r.media_bytes,
  createdAt: r.created_at,
});

/** Spec §7: map raw Postgres errors onto copy the user can act on. */
function friendlyError(raw: string | undefined | null): string {
  const msg = raw || '';
  if (msg.includes('MONTHLY_BUDGET_EXCEEDED')) {
    return 'Monthly upload budget reached — you have used your 100 MB for this month.';
  }
  if (msg.includes('THREAD_MEDIA_CAP')) {
    return 'This thread already holds the maximum of 20 media items.';
  }
  if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return 'That message was already sent.';
  }
  if (msg.includes('row-level security') || msg.includes('permission denied')) {
    return "You can't send to this thread.";
  }
  if (msg.includes('paused') || msg.includes('PGRST301')) {
    return 'Project paused after inactivity — wake it in the Supabase dashboard.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Network error — check your connection and try again.';
  }
  return 'Something went wrong sending that. Please try again.';
}

/* -------------------------------------------------------------------------- */
/* Capability probe (Global Constraints "Fallback mode")                        */
/* -------------------------------------------------------------------------- */

let tablesOk: boolean | null = null; // cached per page load; flip needs a reload

/** Live mode only when BOTH hold: a Supabase session (otherwise auth.uid() is
 *  NULL and RLS rejects every write) and the migrated tables exist. */
export async function isDbReady(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  if (tablesOk === null) {
    const { error } = await supabase.from('threads').select('id', { head: true, limit: 1 });
    tablesOk = !(error && /does not exist|schema cache/i.test(error.message));
  }
  return tablesOk;
}

const localThreadById = (id: string): Thread | undefined =>
  [...localThreads.values()].find((t) => t.id === id);

const sameMonth = (iso: string): boolean => {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

/* -------------------------------------------------------------------------- */
/* Profile bootstrap (spec §4)                                                  */
/* -------------------------------------------------------------------------- */

export async function ensureProfile(user: AuthUser): Promise<void> {
  if (!(await isDbReady())) return;
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    role: user.role === 'organiser' ? 'organiser' : 'artist',
    display_name: user.name,
    avatar_url: user.avatarUrl || user.avatar || null,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('[threads] ensureProfile:', error.message);
}

/* -------------------------------------------------------------------------- */
/* Budget queries (spec §5 "What the meters can actually show")                */
/* -------------------------------------------------------------------------- */

const monthStartIso = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
};

export async function getStorageUsage(): Promise<{ storageBytes: number; monthBytes: number }> {
  if (!(await isDbReady())) {
    const all = [...localMessages.values()].flat();
    const monthBytes = all
      .filter((m) => sameMonth(m.createdAt))
      .reduce((s, m) => s + (m.mediaBytes || 0), 0);
    return { storageBytes: all.reduce((s, m) => s + (m.mediaBytes || 0), 0), monthBytes };
  }

  const sum = async (from: string | null): Promise<number> => {
    let query = supabase.from('messages').select('media_bytes').not('media_bytes', 'is', null);
    if (from) query = query.gte('created_at', from);
    const { data, error } = await query;
    if (error || !data) return 0;
    return data.reduce((s, r) => s + (r.media_bytes || 0), 0);
  };

  const [storageBytes, monthBytes] = await Promise.all([sum(null), sum(monthStartIso())]);
  return { storageBytes, monthBytes };
}

export async function getBudget(user: AuthUser): Promise<Budget> {
  if (!(await isDbReady())) {
    const usedBytes = [...localMessages.values()]
      .flat()
      .filter((m) => m.senderId === user.id && sameMonth(m.createdAt))
      .reduce((s, m) => s + (m.mediaBytes || 0), 0);
    return { usedBytes, remainingBytes: remaining(usedBytes) };
  }
  const { data, error } = await supabase
    .from('messages')
    .select('media_bytes')
    .eq('sender_id', user.id)
    .gte('created_at', monthStartIso())
    .not('media_bytes', 'is', null);

  if (error || !data) {
    return { usedBytes: 0, remainingBytes: USER_MONTHLY_BYTES };
  }
  const usedBytes = data.reduce((sum, r) => sum + (r.media_bytes || 0), 0);
  return { usedBytes, remainingBytes: remaining(usedBytes) };
}
```

> Supabase returns at most 1000 rows per request by default, so these sums are capped at ~1000 media-bearing messages. That is well past the point where the 8 GB storage budget is already the binding constraint. Recorded as a known ceiling rather than paginated.

- [ ] **Step 2: Add thread lifecycle, send, subscribe, mark-read**

Append to `src/lib/threads.ts`:

```ts
/* -------------------------------------------------------------------------- */
/* Local fallback store (spec §6 "Fallback")                                    */
/* -------------------------------------------------------------------------- */

const localThreads = new Map<string, Thread>();
const localMessages = new Map<string, Message[]>();

const localThreadKey = (opportunityId: string, artistId: string) =>
  `${opportunityId}::${artistId}`;

/* -------------------------------------------------------------------------- */
/* Thread lifecycle                                                             */
/* -------------------------------------------------------------------------- */

export async function ensureArtistThread(input: {
  opportunityId: string;
  opportunityTitle: string;
  user: AuthUser;
  organiserName?: string;
  organiserAvatar?: string;
}): Promise<{ thread: Thread | null; error: string | null }> {
  const key = localThreadKey(input.opportunityId, input.user.id);

  if (!(await isDbReady())) {
    let thread = localThreads.get(key);
    if (!thread) {
      thread = {
        id: `local-${key}`,
        opportunityId: input.opportunityId,
        opportunityTitle: input.opportunityTitle,
        artistId: input.user.id,
        artistName: input.user.name,
        artistAvatar: input.user.avatarUrl || input.user.avatar || null,
        organiserId: null,
        organiserName: input.organiserName || null,
        organiserAvatar: input.organiserAvatar || null,
        artistLastReadAt: new Date().toISOString(),
        organiserLastReadAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      localThreads.set(key, thread);
      localMessages.set(thread.id, []);
    }
    return { thread, error: null };
  }

  const { data: existing, error: findError } = await supabase
    .from('threads')
    .select('*')
    .eq('opportunity_id', input.opportunityId)
    .eq('artist_id', input.user.id)
    .maybeSingle();

  if (findError) return { thread: null, error: friendlyError(findError.message) };
  if (existing) return { thread: rowToThread(existing), error: null };

  const { data: created, error: insertError } = await supabase
    .from('threads')
    .insert({
      opportunity_id: input.opportunityId,
      opportunity_title: input.opportunityTitle,
      artist_id: input.user.id,
      artist_name: input.user.name,
      artist_avatar: input.user.avatarUrl || input.user.avatar || null,
      organiser_name: input.organiserName || null,
      organiser_avatar: input.organiserAvatar || null,
    })
    .select()
    .single();

  if (insertError) {
    // unique (opportunity_id, artist_id) — another tab won the race.
    if (insertError.code === '23505') {
      const { data: raced } = await supabase
        .from('threads')
        .select('*')
        .eq('opportunity_id', input.opportunityId)
        .eq('artist_id', input.user.id)
        .maybeSingle();
      return { thread: raced ? rowToThread(raced) : null, error: null };
    }
    console.warn('[threads] ensureArtistThread:', insertError.message);
    return { thread: null, error: friendlyError(insertError.message) };
  }
  return { thread: rowToThread(created), error: null };
}

export async function findThread(opportunityId: string, artistId: string): Promise<Thread | null> {
  if (!(await isDbReady())) {
    return localThreads.get(localThreadKey(opportunityId, artistId)) || null;
  }
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .eq('artist_id', artistId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToThread(data);
}

/** Every thread the caller can see; RLS scopes it (participant, or organiser
 *  viewing an unclaimed thread). Drives both list views' unread pills — without
 *  this the pills would have nothing to read. */
export async function fetchThreads(): Promise<Thread[]> {
  if (!(await isDbReady())) {
    return [...localThreads.values()];
  }
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .order('last_message_at', { ascending: false });
  if (error || !data) return [];
  return data.map(rowToThread);
}

export async function claimThread(threadId: string, user: AuthUser): Promise<void> {
  if (!(await isDbReady())) {
    const t = localThreadById(threadId);
    if (t && !t.organiserId) {
      t.organiserId = user.id;
      t.organiserName = user.name;
      t.organiserAvatar = user.avatarUrl || user.avatar || null;
    }
    return;
  }
  const { error } = await supabase
    .from('threads')
    .update({ organiser_id: user.id, organiser_name: user.name, organiser_avatar: user.avatarUrl || user.avatar || null })
    .eq('id', threadId)
    .is('organiser_id', null);
  if (error) console.warn('[threads] claimThread:', error.message);
}
```

- [ ] **Step 3: Add messages, send, subscribe, mark-read**

Append to `src/lib/threads.ts`:

```ts
/* -------------------------------------------------------------------------- */
/* Messages                                                                     */
/* -------------------------------------------------------------------------- */

export async function fetchMessages(threadId: string): Promise<Message[]> {
  if (!(await isDbReady())) {
    return [...(localMessages.get(threadId) || [])];
  }
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error || !data) return [];
  return data.map(rowToMessage);
}

export async function sendMessage(
  input: SendMessageInput
): Promise<{ message: Message | null; error: string | null }> {
  const { threadId, sender, senderRole, body, media, clientId } = input;
  const trimmed = (body || '').trim();
  if (!trimmed && !media) return { message: null, error: 'Add a message or attach media.' };

  const row = {
    id: clientId, // client-generated: retry upserts instead of duplicating
    thread_id: threadId,
    sender_id: sender.id,
    sender_role: senderRole,
    body: trimmed || null,
    media_url: media?.url || null,
    media_public_id: media?.publicId || null,
    media_type: media?.type || null,
    media_bytes: media?.bytes || null,
    created_at: new Date().toISOString(),
  };

  if (!(await isDbReady())) {
    const message: Message = {
      id: row.id,
      threadId,
      senderId: sender.id,
      senderRole,
      body: row.body,
      mediaUrl: row.media_url,
      mediaPublicId: row.media_public_id,
      mediaType: row.media_type,
      mediaBytes: row.media_bytes,
      createdAt: row.created_at,
    };
    const list = localMessages.get(threadId) || [];
    list.push(message);
    localMessages.set(threadId, list);
    // No Postgres trigger here, so bump the thread by hand — without this the
    // unread pill would never light up in local mode.
    const t = localThreadById(threadId);
    if (t) t.lastMessageAt = message.createdAt;
    return { message, error: null };
  }

  const { data, error } = await supabase
    .from('messages')
    .upsert(row, { onConflict: 'id', ignoreDuplicates: true })
    .select()
    .maybeSingle();

  if (error) return { message: null, error: friendlyError(error.message) };
  if (!data) {
    // ignoreDuplicates swallowed it: the row already exists from a prior retry.
    return { message: rowToMessage(row), error: null };
  }
  return { message: rowToMessage(data), error: null };
}

export function subscribeThread(
  threadId: string,
  onMessage: (m: Message) => void,
  onStatus: (s: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CLOSED') => void
): () => void {
  // Contract: callers gate on isDbReady() first — local mode has no realtime
  // (one browser, no server), so there is nothing to subscribe to here.

  const channel = supabase
    .channel(`thread:${threadId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
      (payload) => onMessage(rowToMessage(payload.new))
    )
    .on('presence', { event: 'sync' }, () => {})
    .subscribe((status) => {
      // TIMED_OUT is a dead socket with no event — surfacing it as an error is
      // what stops the chat looking fine while nothing arrives (spec §7).
      if (status === 'TIMED_OUT') onStatus('CHANNEL_ERROR');
      else if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        onStatus(status);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function markRead(threadId: string, role: MessageSenderRole): Promise<void> {
  const column = role === 'artist' ? 'artist_last_read_at' : 'organiser_last_read_at';
  if (!(await isDbReady())) {
    const t = localThreadById(threadId);
    if (t) {
      if (role === 'artist') t.artistLastReadAt = new Date().toISOString();
      else t.organiserLastReadAt = new Date().toISOString();
    }
    return;
  }
  const { error } = await supabase
    .from('threads')
    .update({ [column]: new Date().toISOString() })
    .eq('id', threadId);
  if (error) console.warn('[threads] markRead:', error.message);
}
```

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: clean. Fix any `any` complaints by keeping the `eslint-disable` comment from Step 1, or by typing the row parameter as `Record<string, unknown>` with explicit casts.

- [ ] **Step 5: Commit**

```bash
git add src/lib/threads.ts
git commit -m "feat: add thread data layer with Supabase Realtime and local fallback" -m "Owns every read/write against profiles, threads and messages. Errors are mapped onto actionable copy (budget exhausted, RLS denial, paused project) before they reach the UI, and the whole module degrades to local in-memory state whenever isDbReady() is false (no session, or migration not run) so the demo keeps working."
```

---

### Task 6: Thread modal UI

**Files:**
- Create: `src/components/ThreadModal.tsx`

**Interfaces:**
- Consumes: `Thread`, `Message` (Task 2); `fetchMessages`, `sendMessage`, `subscribeThread`, `getBudget`, `isDbReady`, `SendMessageInput` (Task 5); `formatMB`, `USER_MONTHLY_BYTES`, `maxBytesFor` (Task 1); `MediaUploader` (existing); `uploadToCloudinary`, `isCloudinaryConfigured`, `getOptimizedCloudinaryUrl` (existing).
- Produces: `export const ThreadModal: React.FC<ThreadModalProps>` with `interface ThreadModalProps { isOpen: boolean; onClose: () => void; thread: Thread | null; currentUser: AuthUser }`. Thread claiming and mark-read live in `App` (Task 7), not here — one owner each.

- [ ] **Step 1: Write the component**

Create `src/components/ThreadModal.tsx`:

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, AlertCircle, RotateCcw, MessageSquare, Video, Image as ImageIcon } from 'lucide-react';
import { AuthUser, Message, Thread } from '../types';
import {
  fetchMessages, sendMessage, subscribeThread, getBudget, isDbReady, SendMessageInput,
} from '../lib/threads';
import { USER_MONTHLY_BYTES, formatMB, maxBytesFor } from '../lib/limits';
import { uploadToCloudinary, isCloudinaryConfigured, getOptimizedCloudinaryUrl } from '../lib/cloudinary';
import { MediaUploader } from './MediaUploader';

export interface ThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: Thread | null;
  currentUser: AuthUser;
}

export const ThreadModal: React.FC<ThreadModalProps> = ({
  isOpen, onClose, thread, currentUser,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaBytes, setMediaBytes] = useState(0);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaPublicId, setMediaPublicId] = useState('');
  const [budgetBytes, setBudgetBytes] = useState(USER_MONTHLY_BYTES);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [channelDown, setChannelDown] = useState(false);
  const [retryable, setRetryable] = useState<Message | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const senderRole = currentUser.role === 'organiser' ? 'organiser' : 'artist';

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, []);

  /* Load + subscribe while open. Unsubscribe on close (spec §6). */
  useEffect(() => {
    if (!isOpen || !thread) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const onFocus = () => {
      fetchMessages(thread.id).then((fresh) => {
        if (!cancelled) setMessages(fresh);
        scrollToEnd();
      });
    };
    window.addEventListener('focus', onFocus);

    (async () => {
      const [initial, budget, live] = await Promise.all([
        fetchMessages(thread.id),
        getBudget(currentUser),
        isDbReady(),
      ]);
      if (cancelled) return;
      setMessages(initial);
      setBudgetBytes(budget.remainingBytes);
      scrollToEnd();
      if (!live) return; // local mode: no realtime (subscribeThread's contract)

      unsubscribe = subscribeThread(
        thread.id,
        (m) => {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          scrollToEnd();
        },
        (status) => {
          setChannelDown(status === 'CHANNEL_ERROR' || status === 'CLOSED');
          if (status === 'SUBSCRIBED') {
            fetchMessages(thread.id).then((fresh) => {
              setMessages(fresh);
              scrollToEnd();
            });
          }
        }
      );
      if (cancelled) {
        unsubscribe();
        unsubscribe = null;
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      window.removeEventListener('focus', onFocus);
      // mark-read is App's job (Task 7): it must finish before the thread list
      // is refetched on close, or the unread pill races the write and stays lit.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, thread?.id]);

  const handleSend = async () => {
    if (!thread) return;
    const body = draft.trim();
    if (!body && !mediaUrl) return;

    setSending(true);
    setError(null);

    // Budget was gated BEFORE upload via MediaUploader's beforeUpload prop —
    // a rejected insert must never orphan a Cloudinary asset that unsigned
    // presets cannot delete (spec §6 send path, step 1).
    let media: SendMessageInput['media'] = null;
    if (mediaUrl) {
      media = {
        url: mediaUrl,
        publicId: mediaPublicId || mediaUrl,
        type: mediaType || 'image',
        bytes: mediaBytes,
      };
    }

    const clientId = crypto.randomUUID();
    const optimistic: Message = {
      id: clientId,
      threadId: thread.id,
      senderId: currentUser.id,
      senderRole,
      body: body || null,
      mediaUrl: media?.url || null,
      mediaPublicId: media?.publicId || null,
      mediaType: media?.type || null,
      mediaBytes: media?.bytes || null,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    setMediaUrl('');
    setMediaBytes(0);
    setMediaType(null);
    setMediaPublicId('');
    scrollToEnd();

    const { error: sendError } = await sendMessage({
      threadId: thread.id,
      sender: currentUser,
      senderRole,
      body,
      media,
      clientId,
    });

    setSending(false);

    if (sendError) {
      setError(sendError);
      setMessages((prev) =>
        prev.map((m) => (m.id === clientId ? { ...m, pending: false, failed: true } : m))
      );
      setRetryable(optimistic);
      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === clientId ? { ...m, pending: false, failed: false } : m))
    );
    setBudgetBytes((b) => Math.max(0, b - (media?.bytes || 0)));
  };

  const handleRetry = async () => {
    if (!retryable || !thread) return;
    setMessages((prev) => prev.filter((m) => m.id !== retryable.id));
    setDraft(retryable.body || '');
    if (retryable.mediaUrl) {
      setMediaUrl(retryable.mediaUrl);
      setMediaBytes(retryable.mediaBytes || 0);
      setMediaType(retryable.mediaType);
      setMediaPublicId(retryable.mediaPublicId || '');
    }
    setRetryable(null);
  };

  if (!isOpen || !thread) return null;

  const isArtist = currentUser.role === 'artist';
  const counterpartyName = isArtist
    ? thread.organiserName || 'Organiser'
    : thread.artistName || 'Artist';
  const counterpartyAvatar = isArtist ? thread.organiserAvatar : thread.artistAvatar;
  const previewMode = !isCloudinaryConfigured;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#EDE7DE] my-auto flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#FAF7F2] border-b border-[#EDE7DE] flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {counterpartyAvatar ? (
              <img
                src={counterpartyAvatar}
                alt={counterpartyName}
                loading="lazy"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FCEEE3] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#FDEEE7] text-[#E45826] flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-900 truncate">{counterpartyName}</p>
              <p className="text-[11px] text-zinc-500 truncate">{thread.opportunityTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close conversation"
            className="w-8 h-8 rounded-full bg-white hover:bg-zinc-100 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview-mode banner (spec §6) */}
        {previewMode && (
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-[11px] font-semibold text-amber-800 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Preview mode — media won't reach the other person until Cloudinary is configured.</span>
          </div>
        )}

        {/* Realtime degraded */}
        {channelDown && (
          <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 text-[11px] font-semibold text-red-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Reconnecting — new messages will appear once the connection is back.</span>
          </div>
        )}

        {/* Message list */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-[220px]">
          {messages.length === 0 && (
            <div className="text-center py-10 text-zinc-400 text-xs">
              No messages yet. Say hello, or send a photo or reel.
            </div>
          )}
          {messages.map((m) => {
            const mine = m.senderId === currentUser.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-words ${
                    mine
                      ? 'bg-[#E45826] text-white rounded-br-md'
                      : 'bg-zinc-100 text-zinc-800 rounded-bl-md'
                  }`}
                >
                  {m.mediaUrl && m.mediaType === 'video' && (
                    <video
                      src={getOptimizedCloudinaryUrl(m.mediaUrl, { width: 1280, quality: 'auto' })}
                      controls
                      preload="none"
                      className="w-full max-w-xs rounded-xl mb-2 bg-black"
                    />
                  )}
                  {m.mediaUrl && m.mediaType === 'image' && (
                    <img
                      src={getOptimizedCloudinaryUrl(m.mediaUrl, { width: 800, quality: 'auto' })}
                      alt=""
                      loading="lazy"
                      className="w-full max-w-xs rounded-xl mb-2"
                    />
                  )}
                  {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}

                  <div className="flex items-center justify-end gap-2 mt-1 text-[10px] opacity-70">
                    <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {m.pending && <span>Sending…</span>}
                    {m.failed && (
                      <button
                        onClick={handleRetry}
                        className="flex items-center gap-1 font-bold underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2.5 bg-red-50 border-t border-red-200 text-red-700 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Composer */}
        <div className="p-3 sm:p-4 border-t border-[#EDE7DE] bg-white shrink-0">
          <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-500 mb-2">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3" /> Image up to {formatMB(maxBytesFor(new File([], 'a.jpg', { type: 'image/jpeg' })))}
              <span className="text-zinc-300">·</span>
              <Video className="w-3 h-3" /> Video up to {formatMB(maxBytesFor(new File([], 'a.mp4', { type: 'video/mp4' })))}
            </span>
            <span className={budgetBytes < 20 * 1024 * 1024 ? 'text-amber-600' : 'text-emerald-600'}>
              {formatMB(budgetBytes)} left this month
            </span>
          </div>

          {/* One uploader serves both states: value empty → drop zone,
              value set → preview + Change/Remove (MediaUploader's own logic). */}
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <MediaUploader
                label=""
                description="Attach a photo or reel to this conversation"
                folder="kala-thread"
                resourceType="auto"
                value={mediaUrl}
                beforeUpload={(file) =>
                  file.size > budgetBytes
                    ? `Monthly upload budget reached — ${formatMB(budgetBytes)} of ${formatMB(USER_MONTHLY_BYTES)} left.`
                    : null
                }
                onChange={(url, res) => {
                  setMediaUrl(url);
                  setMediaBytes(res?.bytes || 0);
                  setMediaType(res?.resourceType === 'video' ? 'video' : 'image');
                  setMediaPublicId(res?.publicId || url);
                }}
                onRemove={() => {
                  setMediaUrl('');
                  setMediaBytes(0);
                  setMediaType(null);
                  setMediaPublicId('');
                }}
              />
            </div>
          </div>

          <div className="flex items-end gap-2 mt-2">
            <textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Write a message…"
              className="flex-1 min-w-0 bg-[#FAF8F5] border border-[#E5E0D6] focus:border-[#E45826] focus:bg-white rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none transition-all resize-none"
            />
            <button
              onClick={handleSend}
              disabled={sending || (!draft.trim() && !mediaUrl)}
              aria-label="Send message"
              className="w-10 h-10 rounded-xl bg-[#E45826] hover:bg-[#D44716] text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: clean. `SendMessageInput` must stay imported — it types the `media` local in `handleSend`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ThreadModal.tsx
git commit -m "feat: add thread modal with realtime messages and media composer" -m "Optimistic send with retry, preview-mode banner when Cloudinary is unconfigured, reconnect banner on channel loss (including TIMED_OUT), and a budget readout that decrements as media is sent. Videos ship preload=none with a transformation URL so unwatched reels cost no bandwidth."
```

---

### Task 7: Wire entry points

**Files:**
- Modify: `src/App.tsx` (state, bootstrap effect, handlers, render modal, call-site props)
- Modify: `src/components/ApplicationsView.tsx` (Messages button + New pill)
- Modify: `src/components/OrganiserApplicantsView.tsx` (Message button + New pill)
- Modify: `src/lib/threads.ts` (`isUnread`)
- Modify: `src/types.ts` (`ApplicantReview.artistId`), `src/data/mockData.ts` (seed `artistId`)

**Interfaces:**
- Consumes: `ThreadModal` (Task 6); `ensureArtistThread`, `findThread`, `ensureProfile`, `claimThread`, `fetchThreads`, `markRead`, `isUnread` (Task 5); `Thread` (Task 2).
- Produces: `App` renders `<ThreadModal>` and owns claim/mark-read; `ApplicationsView` accepts `threads: Thread[]` + `onOpenThread: (opportunityId: string) => void`; `OrganiserApplicantsView` accepts `threads: Thread[]` + `onOpenThread: (opportunityId: string, artistId: string) => void`.

- [ ] **Step 1: Add thread state and profile bootstrap to `App.tsx`**

Inside `App`, alongside the other state:

```ts
const [threads, setThreads] = useState<Thread[]>([]);
const [activeThread, setActiveThread] = useState<Thread | null>(null);
```

Add a bootstrap effect near the other effects:

```ts
// Profile row (RLS needs it for role checks) + the caller's thread list, which
// is what both unread pills read. Keyed on the user id so it covers every login
// path: initial demo user, quick demo login, and the Supabase auth callback.
useEffect(() => {
  if (!currentUser) return;
  ensureProfile(currentUser);
  fetchThreads().then(setThreads);
}, [currentUser?.id]);
```

- [ ] **Step 2: Add the open/close handlers**

```ts
const openArtistThread = async (opportunityId: string) => {
  const opp = opportunities.find((o) => o.id === opportunityId);
  const { thread, error } = await ensureArtistThread({
    opportunityId,
    opportunityTitle: opp?.title || 'Opportunity',
    user: currentUser!,
    organiserName: opp?.organizer,
  });
  if (thread) {
    setThreads((prev) => (prev.some((t) => t.id === thread.id) ? prev : [...prev, thread]));
    setActiveThread(thread);
  } else {
    showToast(error || "Couldn't open this conversation.");
  }
};

const openOrganiserThread = async (opportunityId: string, artistId: string) => {
  let thread = await findThread(opportunityId, artistId);
  if (!thread) {
    showToast('This applicant has not started a conversation yet.');
    return;
  }
  if (thread.organiserId !== currentUser?.id) {
    await claimThread(thread.id, currentUser!);
    thread = { ...thread, organiserId: currentUser!.id };
  }
  setThreads((prev) => prev.map((t) => (t.id === thread.id ? thread : t)));
  setActiveThread(thread);
};

// Close = mark read first, then refetch. Sequenced with await so the unread
// pill can never read the list before the write lands.
const closeThread = async () => {
  const t = activeThread;
  setActiveThread(null);
  if (t && currentUser) {
    await markRead(t.id, currentUser.role === 'organiser' ? 'organiser' : 'artist');
    setThreads(await fetchThreads());
  }
};
```

Add the imports:

```ts
import { ensureArtistThread, findThread, ensureProfile, claimThread, fetchThreads, markRead } from './lib/threads';
import { ThreadModal } from './components/ThreadModal';
import { Thread } from './types';
```

- [ ] **Step 3: Render the modal and pass thread props to the two list views**

Immediately after the lower `<FreeTierStatusModal ... />` (the one near the end of `App`'s JSX, ~line 756):

```tsx
<ThreadModal
  isOpen={activeThread !== null}
  onClose={closeThread}
  thread={activeThread}
  currentUser={currentUser}
/>
```

Then pass the new props at the two existing call sites:

- `<ApplicationsView applications={applications} …>` (~line 594) gains `threads={threads}` and `onOpenThread={openArtistThread}`.
- `<OrganiserApplicantsView applicants={applicantReviews} …>` (~line 698) gains `threads={threads}` and `onOpenThread={openOrganiserThread}`.

- [ ] **Step 4: Add the unread pill helper**

Append to `src/lib/threads.ts`:

```ts
/** Boolean unread: thread has activity the caller has not seen. A count would
 *  need one grouped query per thread; the row already carries both timestamps. */
export function isUnread(thread: Thread, role: MessageSenderRole): boolean {
  const lastRead = role === 'artist' ? thread.artistLastReadAt : thread.organiserLastReadAt;
  return new Date(thread.lastMessageAt).getTime() > new Date(lastRead).getTime();
}
```

- [ ] **Step 5: Add the button to `ApplicationsView`**

Add props `onOpenThread?: (opportunityId: string) => void` and `threads: Thread[]`. Place the button inside the row's right-hand column — the `flex sm:flex-col items-center sm:items-end justify-between` div that holds the status badge — above the badge.

Inside the row template, next to the existing status/actions area:

```tsx
{(() => {
  const thread = threads.find((t) => t.opportunityId === app.opportunityId);
  const unread = thread ? isUnread(thread, 'artist') : false;
  return (
    <button
      onClick={() => onOpenThread?.(app.opportunityId)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FDEEE7] border border-[#FAD7C8] text-[#E45826] text-[11px] font-bold hover:bg-[#FCE4D9] transition-colors cursor-pointer shrink-0"
    >
      <MessageSquare className="w-3.5 h-3.5" />
      <span>Messages</span>
      {unread && <span className="w-2 h-2 rounded-full bg-[#E45826] animate-pulse" />}
    </button>
  );
})()}
```

Add `import { MessageSquare } from 'lucide-react';` and `import { isUnread } from '../lib/threads';` and `import { Thread } from '../types';`.

- [ ] **Step 6: Add the button to `OrganiserApplicantsView`**

Same pattern, in the card's action bar next to the existing status controls:

```tsx
{(() => {
  const thread = threads.find(
    (t) => t.opportunityId === app.opportunityId && t.artistId === app.artistId
  );
  const unread = thread ? isUnread(thread, 'organiser') : false;
  return (
    <button
      onClick={() => onOpenThread?.(app.opportunityId, app.artistId)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FDEEE7] border border-[#FAD7C8] text-[#E45826] text-[11px] font-bold hover:bg-[#FCE4D9] transition-colors cursor-pointer"
    >
      <MessageSquare className="w-3.5 h-3.5" />
      <span>Message</span>
      {unread && <span className="w-2 h-2 rounded-full bg-[#E45826] animate-pulse" />}
    </button>
  );
})()}
```

Add props `threads: Thread[]` and `onOpenThread?: (opportunityId: string, artistId: string) => void`. Place the button inside the existing `Status Update Action Bar` div (the `flex items-center gap-1.5` button group, ~line 596), as its first child.

> **`app.artistId` does not exist yet.** Add `artistId?: string` to `ApplicantReview` in `src/types.ts` and populate it in `src/data/mockData.ts` with the artist's user id — for the demo applicant named Mowleen that is `'user-mowleen'` (the id `handleQuickDemoLogin` issues). Without it `t.artistId === app.artistId` never matches. If no applicant record carries the artist's real id, `findThread` returns `null` and the organiser sees the "not started a conversation yet" toast — which is the correct behaviour for a thread that does not exist, and the honest limit of a mock applicant list (spec §3: applications are not persisted).

- [ ] **Step 7: Run lint and commit**

Run: `npm run lint`
Expected: clean.

```bash
git add src/App.tsx src/components/ApplicationsView.tsx \
        src/components/OrganiserApplicantsView.tsx src/lib/threads.ts \
        src/types.ts src/data/mockData.ts
git commit -m "feat: open application threads from artist and organiser lists" -m "No new nav tab: the thread hangs off the lists that already exist, which is where unread naturally surfaces. Unread is a boolean derived from last_message_at versus the caller's own read cursor, so the badge costs no extra query."
```

---

### Task 8: Free-tier usage meters

**Files:**
- Modify: `src/components/FreeTierStatusModal.tsx` (inside the Cloudinary card)

**Interfaces:**
- Consumes: `getStorageUsage` (Task 5); `formatMB`, `IMAGE_MAX_BYTES`, `VIDEO_MAX_BYTES`, `USER_MONTHLY_BYTES` (Task 1).
- Produces: none.

- [ ] **Step 1: Add state and fetch**

Inside `FreeTierStatusModal`, after `const [copied, setCopied] = useState(false);`:

```ts
const [usage, setUsage] = useState<{ storageBytes: number; monthBytes: number } | null>(null);

React.useEffect(() => {
  if (!isOpen) return;
  getStorageUsage().then(setUsage).catch(() => setUsage(null));
}, [isOpen]);
```

Add imports: `import { getStorageUsage } from '../lib/threads';` and `import { formatMB, IMAGE_MAX_BYTES, VIDEO_MAX_BYTES, USER_MONTHLY_BYTES } from '../lib/limits';`.

- [ ] **Step 2: Render the two measurable meters**

Inside the Cloudinary card, immediately after its status badge block and before the `<div className="text-xs text-zinc-600 space-y-1.5 pt-2 ...">` list:

```tsx
<div className="mt-3 p-3 rounded-xl bg-white border border-[#E4DFD5] space-y-2.5">
  <span className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider">
    Storage &amp; uploads
  </span>

  {[
    { label: 'Media stored', value: usage?.storageBytes ?? 0, cap: 8 * 1024 * 1024 * 1024 },
    { label: 'Your uploads this month', value: usage?.monthBytes ?? 0, cap: USER_MONTHLY_BYTES },
  ].map((meter) => {
    const pct = Math.min(100, Math.round((meter.value / meter.cap) * 100));
    return (
      <div key={meter.label}>
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="font-semibold text-zinc-600">{meter.label}</span>
          <span className="font-bold text-zinc-800">
            {formatMB(meter.value)} / {formatMB(meter.cap)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-200 overflow-hidden">
          <div
            className={`h-full rounded-full ${pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  })}

  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] border-t border-zinc-100">
    <span className="text-zinc-500">
      Per-file: {formatMB(IMAGE_MAX_BYTES)} image · {formatMB(VIDEO_MAX_BYTES)} video
    </span>
    <a
      href="https://console.cloudinary.com/settings/account/usage"
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold text-[#E45826] hover:underline flex items-center gap-1"
    >
      Bandwidth &amp; transformations <ExternalLink className="w-3 h-3" />
    </a>
  </div>

  <p className="text-[10px] text-zinc-400 leading-relaxed">
    Delivery bandwidth is counted by Cloudinary when it serves a file and is only readable
    through the Admin API, which needs a secret this app never ships. Open the dashboard
    for the live figure.
  </p>
</div>
```

`ExternalLink` is already imported in this file.

- [ ] **Step 3: Run lint and commit**

Run: `npm run lint`
Expected: clean.

```bash
git add src/components/FreeTierStatusModal.tsx
git commit -m "feat: show measurable free-tier usage meters in status modal" -m "Only storage and monthly uploads are computable from our own database. Bandwidth requires Cloudinary's Admin API and an API secret we do not ship to the browser, so the modal links to the dashboard instead of displaying a number it cannot actually read."
```

---

### Task 9: Verification

**Files:**
- Create (temp, not committed): `scripts/responsive-audit.mjs` run from a temp directory
- No source changes expected

**Interfaces:**
- Consumes: everything from Tasks 1–8.

- [ ] **Step 1: Run the type check**

Run: `npm run lint`
Expected: clean, no output.

- [ ] **Step 2: Run the quota tests**

Run: `npm test`
Expected: `# pass 9`, `# fail 0`.

- [ ] **Step 3: Mutation-check the test actually guards the ceiling**

Temporarily change `VIDEO_MAX_BYTES` to `50 * 1024 * 1024` in `src/lib/limits.ts`, then:

Run: `npm test`
Expected: **FAIL** — `video ceiling is exactly 40 MB` assertion fails.

Restore `40 * 1024 * 1024` and re-run `npm test` → PASS. This proves the test is not vacuous.

- [ ] **Step 4: Start the dev server**

Run: `npm run dev`
Expected: `HTTP 200` from `Invoke-WebRequest http://localhost:3000 -UseBasicParsing`.

- [ ] **Step 5: Run the responsive audit with ThreadModal open**

Start Chrome headless with debugging:

```powershell
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList `
  "--headless=new","--disable-gpu","--remote-debugging-port=9222","--hide-scrollbars",
  "--window-size=390,844","--user-data-dir=$env:TEMP\opencode\cdp_profile","about:blank" -WindowStyle Hidden
```

Save as `<temp>/audit-modal.mjs` and run `node <temp>/audit-modal.mjs`:

```js
const PORT = 9222;
async function connect(u){const ws=new WebSocket(u);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const p=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id)}};const send=(m,pa={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:pa}))});return{send,close:()=>ws.close()}}
const CLICK = (label) => `(() => {
  const b=[...document.querySelectorAll('button')].filter(e=>e.offsetParent||getComputedStyle(e).position==='fixed');
  const t=b.find(e=>(e.textContent||'').trim()===${JSON.stringify(label)});
  if(t){t.click();return true;} return false;
})()`;
(async()=>{
  const list=await(await fetch(`http://localhost:${PORT}/json`)).json();
  const page=list.find(t=>t.type==='page');
  const c=await connect(page.webSocketDebuggerUrl);
  await c.send('Page.enable'); await c.send('Runtime.enable');
  const ev=async(x)=>(await c.send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.result?.value;
  let failed=0;
  for(const w of [360,390,768,1024,1366]){
    const h=w<700?844:1024;
    await c.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<700});
    await c.send('Page.navigate',{url:'http://localhost:3000'});
    await new Promise(r=>setTimeout(r,3000));
    await ev(CLICK('Applications'));
    await new Promise(r=>setTimeout(r,800));
    await ev(CLICK('Messages'));
    await new Promise(r=>setTimeout(r,1500));
    const m=await ev(`(()=>{const d=document.documentElement;return{vw:d.clientWidth,sw:d.scrollWidth,modal:!!document.querySelector('[aria-label="Close conversation"]')}})()`);
    const ok=m && m.sw<=m.vw+1 && m.modal;
    if(!ok) failed++;
    console.log(`${w}px: ${ok?'ok':'FAIL'} scroll=${m?.sw}/${m?.vw} modalOpen=${m?.modal}`);
  }
  c.close();
  process.exit(failed?1:0);
})();
```

Expected: five lines ending `ok`, exit code 0.

> If `Messages` is not rendered because no thread exists yet, the audit reports `modalOpen=false`. Seed one by clicking a row's **Messages** button once in a normal browser session first, or accept `modalOpen=false` with `scroll` still `<= vw` as proof the surrounding list did not regress — the overflow assertion is the part that cannot be skipped.

- [ ] **Step 6: Screenshot the four thread states**

Via the same CDP session (`Page.captureScreenshot`), capture: empty thread, populated thread, preview-mode banner (Cloudinary unconfigured), budget-exhausted error. Save to a temp directory and review each for obvious layout breakage.

- [ ] **Step 7: Stop the dev server and CDP Chrome, remove temp scripts**

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*cdp_profile*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
# stop the vite process, then:
Remove-Item <temp>/audit-modal.mjs -Force -ErrorAction SilentlyContinue
```

- [ ] **Step 8: Commit verification artefacts only**

No source changes are expected. If Step 3's mutation was left in `limits.ts`, restore it **before** committing.

```bash
git status --short
# Expected: clean, or only intentionally-modified files listed
```

- [ ] **Step 9: Hand off the user-only verification**

Tell the user, explicitly, that the following cannot be verified by the implementer:

1. Paste `supabase/schema.sql` into the Supabase SQL editor.
2. In the Cloudinary console, set the unsigned upload preset's **Max file size** to 40 MB and restrict formats to jpg/jpeg/png/webp/mp4/mov/webm.
3. Open two browser profiles — one artist, one organiser — and confirm a message with media crosses live.

Per spec §8: *No amount of local testing establishes that a cross-user feature works. This is named rather than claimed.*

---

## Self-Review

Two rounds. Round 1 (draft) checked spec coverage mechanically. Round 2 re-verified every claim against the actual source files — that round found eleven real defects, all fixed above:

| # | Defect found | Fix |
|---|---|---|
| 1 | **`isSupabaseConfigured` is always `true`** — `supabase.ts:4-5` hardcodes a real URL/key, so the spec's env-absent fallback could never fire; every thread call would fail until migration, and quick-demo users (`auth.uid()` NULL) would fail even after it | Capability probe `isDbReady()` (session + table); spec §6 amended |
| 2 | Nothing ever fetched the thread list — both unread pills would read an always-empty array | Added `fetchThreads()` + bootstrap effect in `App` |
| 3 | `subscribeThread` silently dropped `TIMED_OUT` — a dead socket with no error banner, exactly the failure spec §7 calls out | Mapped `TIMED_OUT` → `CHANNEL_ERROR` |
| 4 | `openArtistThread(opp: Opportunity)` didn't match the button's `onOpenThread(opportunityId: string)`; `onOpenThread` props were never passed at either JSX call site | Signature → `(opportunityId: string)`; call-site wiring added (Task 7 Step 3) |
| 5 | Task 6 used `SendMessageInput` without importing it; claim + mark-read lived in both Task 6 and Task 7, and mark-read raced the post-close refetch (pill stays lit) | Import fixed; single owner = `App` (`closeThread` awaits `markRead` before refetching) |
| 6 | Task 4's lint check ran before the prop was removed, so it could never fail | Prop removal moved ahead of the lint step |
| 7 | Task 5 wrote a knowingly-wrong `getStorageUsage` then corrected it in a later step | Written correct once; correction step deleted |
| 8 | Local mode never bumped `lastMessageAt` or the read cursors (no Postgres triggers) — pills would never light in the demo | `sendMessage`/`markRead`/`claimThread` local branches; `getBudget`/`getStorageUsage` sum local messages |
| 9 | The budget "pre-check" sat in `handleSend`, i.e. **after** the file was already uploaded by `MediaUploader` — the exact orphan-asset sequence spec §6 orders 1→2→3 to prevent, while the comment claimed the opposite | New `beforeUpload` gate prop on `MediaUploader`, checked before any upload |
| 10 | `media.publicId` was set to the media **URL** (placeholder garbage in the DB column) | `mediaPublicId` state, taken from `CloudinaryUploadResult.publicId` |
| 11 | Every commit block's message body sat outside the command — pasting it into PowerShell would error after committing | Converted to two `-m` flags; Task 7's `Files:` list also gained `types.ts`/`mockData.ts` |

**Spec coverage** (unchanged rows verified against source; new rows from round 2):

| Spec section | Covered by |
|---|---|
| §4 three tables + DDL | Task 3 |
| §4 client-generated `messages.id` | Task 3 (no default), Task 5 (`clientId`) |
| §4 denormalised names | Task 3 columns, Task 5 mapping |
| §4 `media_count` removed | Absent from Task 3 DDL ✓ |
| §4 `unique (opportunity_id, artist_id)` | Task 3 |
| §4 three triggers, #3 `security definer` | Task 3 |
| §4 RLS table | Task 3 |
| §4 thread claiming | Task 3 policy, Task 5 `claimThread`, Task 7 `openOrganiserThread` |
| §4 `ensureProfile` | Task 5, wired in Task 7 Step 1 |
| §5 image 5 MB / video 40 MB / 100 MB / 20 | Task 1 constants + tests |
| §5 Cloudinary preset manual step | Task 9 Step 9 |
| §5 pre-check before upload | Task 6 `handleSend` |
| §5 meters: storage + monthly, bandwidth linked out | Task 8 |
| §5 bandwidth: `preload="none"`, transform URL, `loading="lazy"` | Task 6 video/img/avatar |
| §6 placement, no nav tab | Task 7 |
| §6 five new files | Tasks 1, 2, 3, 5, 6 ✓ |
| §6 six modified files | Tasks 4, 7, 8 + `types.ts` in Tasks 2/7 ✓ (`App.tsx`, both lists, `MediaUploader`, `FreeTierStatusModal`, `types.ts`) — plus `mockData.ts` for `artistId` |
| §6 send path 1→2→3 | Task 4 `beforeUpload` gate (step 1, pre-upload), Cloudinary upload (step 2), upsert (Task 5) |
| §6 receive path + teardown | Task 6 `useEffect` cleanup |
| §6 fallback + amber banner | Task 5 `isDbReady()` local branches, Task 6 `previewMode` |
| §7 every error row | `friendlyError` (Task 5), `handleSend` pre-check, `channelDown` banner (incl. `TIMED_OUT`), retry (Task 6), paused-project string |
| §8 `npm test` mutation check | Task 9 Step 3 |
| §8 responsive sweep with modal open | Task 9 Step 5 (nav label `Applications` verified present in the mobile bottom bar at `Sidebar.tsx:226` and desktop sidebar) |
| §8 screenshots | Task 9 Step 6 |
| §8 user-only verification | Task 9 Step 9 |
| §9 manual steps ×3 | Task 9 Step 9 |
| §10 decision table | Reflected throughout |

**Placeholder scan** — no "TBD"/"TODO"/"implement later". Every code step carries runnable code.

**Type consistency** — `Thread`/`Message`/`MessageSenderRole` match across Tasks 2, 5, 6, 7. `ensureArtistThread` returns `{ thread, error }` in Task 5's interface, Task 5's code, and Task 7's destructure. `maxBytesFor`/`remaining`/`formatMB`/`isVideoFile` match Tasks 1 → 4, 6, 8. `SendMessageInput` matches Task 5's definition and Task 6's call site. `getStorageUsage` returns `{ storageBytes, monthBytes }` in Tasks 5 and 8. `isUnread(thread, role)` matches Task 7 Steps 4–6. `onOpenThread` signatures match handler ↔ prop ↔ button call at both list views.
