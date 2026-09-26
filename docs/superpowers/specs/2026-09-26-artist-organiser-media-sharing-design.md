# Artist ↔ Organiser Media Sharing — Design

**Date:** 2026-09-26
**Status:** Approved, pending implementation plan
**Sub-project:** B of 3 (A — responsive alignment — shipped; C — upload caps — folded into B)

---

## 1. Problem

Kalā has no path for media to travel from one person to another.

Today the flow is one-directional and one-shot: an artist uploads a reel in `ApplyModal`, the URL is stored on the application, and the organiser's "play reel" control is a stub — it toggles a label to *"Now Playing Demo Sample…"* and the mock data points at a hardcoded Google sound URL (`App.tsx:353`). The organiser can send nothing back. There is no thread.

Three structural facts shape the solution:

1. **There is no database.** Supabase is used for auth only. Every list in the app is React state seeded from `src/data/mockData.ts`. Nothing survives a refresh, and nothing crosses between two browser sessions.
2. **Opportunities and applications are mock state.** A thread cannot be keyed to a row that only exists in one browser's memory.
3. **Uploads go browser → Cloudinary directly** via an unsigned preset. No server sits in the upload path, so client-side validation is advisory by construction.

## 2. Goals

- A durable, two-way conversation scoped to one application, usable by two real people on different devices.
- Photos and videos flow in both directions.
- Both parties stay on free tiers: explicit, enforced limits on file size and monthly volume.
- Graceful degradation to a local demo when env vars are absent, matching the existing pattern in `supabaseSignIn` / `supabaseSignUp`.

## 3. Non-goals

- Persisting opportunities, applications, or applicant lists. That is a separate sub-project (Approach 3, explicitly rejected for B).
- A free-form inbox between arbitrary artists and organiser. Threads are created from an existing application only.
- Group threads, reactions, typing indicators, read receipts beyond last-read timestamps.
- Message edit/delete. Messages are immutable.

---

## 4. Data model

Three tables, not the two originally proposed. Supabase JWTs carry `role: 'authenticated'` and `sub`; the app's `role: 'artist' | 'organiser'` lives in `user_metadata` and is **not** in the JWT. RLS therefore needs a table to join against to answer "is this caller an organiser?".

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('artist','organiser')),
  display_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

create table public.threads (
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

create table public.messages (
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
```

### Design notes

**`messages.id` has no default.** The client generates the UUID so a retry after a network failure is `upsert on conflict (id) do nothing` instead of a duplicate row. A server-side `gen_random_uuid()` would make every retry a new message.

**Names are denormalised onto `threads`.** Both `profiles` and `threads` need each other's rows — `profiles` to render the counterpart, `threads` to check the caller's role. Mutual RLS policies that cross-query are the classic Supabase infinite-recursion failure. Denormalising names onto `threads` breaks the cycle: `profiles` then only ever answers *"is this caller an organiser?"* and its own policy never touches `threads`.

Consequence: sender display info in a message is derived from the parent thread row plus `sender_role` — there are exactly two participants, so no join to `profiles` is needed to render a message. Stale names after a profile rename are accepted.

**`media_count` was removed.** A `count(*)` against an indexed `thread_id` is free. A denormalised counter needs a trigger to stay honest and a second write on every insert.

**`unique (opportunity_id, artist_id)`** *is* the "one thread per application" rule, enforced by the database rather than by client logic.

### Triggers

Three, all declared in `supabase/schema.sql`:

| # | Fires on | Does |
|---|---|---|
| 1 | `messages` BEFORE INSERT or UPDATE of `media_bytes` | Raises if `sender_id`'s `sum(media_bytes)` for the current calendar month would exceed 100 MB |
| 2 | `messages` BEFORE INSERT | Raises if the thread already holds 20 messages with non-null `media_url` |
| 3 | `messages` AFTER INSERT | Sets `threads.last_message_at = now()` on the parent thread |

Triggers 1 and 2 run as the inserting user, so they sit inside RLS and enforce the caps for whoever is writing. Trigger 3 must be `security definer`: it writes to `threads`, and the `threads` update policy (below) permits *only* `*_last_read_at` from a participant. Without `security definer` the row bump would be rejected by RLS and inbox ordering would silently stop updating.

**`last_message_at`** earns its place over a `group by` across every message: inbox ordering and unread computation both need it on every inbox load.

### Access control

RLS enabled on all three tables.

| Table | select | insert | update |
|---|---|---|---|
| `profiles` | `id = auth.uid()` | `id = auth.uid()` | `id = auth.uid()` |
| `threads` | `artist_id = auth.uid()` OR `organiser_id = auth.uid()` OR (`organiser_id IS NULL` AND caller's `profiles.role = 'organiser'`) | `artist_id = auth.uid()` | participant — same predicate as select — restricted to that participant's own `*_last_read_at` column only |
| `messages` | via parent thread's policy | `sender_id = auth.uid()` AND parent thread passes the select policy | never |

**Thread claiming.** The artist creates the thread with `organiser_id = NULL`. The first organiser to open it claims it by setting `organiser_id = auth.uid()`. The unclaimed-read policy is gated on `profiles.role = 'organiser'`, so an artist cannot read or claim someone else's thread. After claiming, access narrows to exactly those two people.

**Known limitation:** if two organiser accounts hold the app open simultaneously, both see unclaimed threads and the first to claim wins. Root fix is persisting opportunities with an owner — out of scope for B, recorded in §9.

### Profile bootstrap

`ensureProfile(user)` upserts into `profiles` from the existing auth-state effect in `App.tsx` (`onSupabaseAuthStateChange`), taking `role` from `user_metadata.role`. Called on every auth event; idempotent.

---

## 5. Free-tier limits

### The budget

Cloudinary Free grants **one shared pool of 25 credits per month** — storage, bandwidth and transformations draw from the same pot, on a rolling 30-day window for the latter two and a point-in-time snapshot for storage.

| Bucket | Allocation | Basis |
|---|---|---|
| Storage (current total) | 8 GB | Ceiling on media that can exist at once |
| Delivery bandwidth | 12 GB / rolling 30-day | The real constraint; video plays dominate |
| Transformations | 5,000 / rolling 30-day | First delivery of each asset; cached re-deliveries free |
| Headroom | 5 credits | Absorbs spikes before Cloudinary issues a soft-limit notice |

Reference limits from Cloudinary's published free-plan table: max image **10 MB**, max video **100 MB**, max video transformation size **40 MB**. Supabase Free: 50,000 MAU, 500 MB database, 5 GB egress, Realtime 200 concurrent connections / 2M messages per month / **256 KB max message size**.

### Enforced caps

| Limit | Value | Enforced by |
|---|---|---|
| Max image file | 5 MB | Cloudinary upload preset + client pre-check |
| Max video file | 40 MB | Cloudinary upload preset + client pre-check |
| Per-user uploads | 100 MB / calendar month | Postgres trigger (authoritative) + client pre-check |
| Media per thread | 20 items | Postgres trigger |
| Messages per thread | 200 | UI only — soft |
| Realtime connections | threads currently open | subscribe on open, unsubscribe on close |

**Why video is 40 MB and not 50 MB.** Cloudinary Free only applies transformations to videos ≤ 40 MB, and `getOptimizedCloudinaryUrl` unconditionally emits `f_auto,q_auto`. A larger file fails at *delivery*, not upload — the worst possible moment. This is a hard product constraint, not a preference.

**Why image is 5 MB and not 50 MB.** `MediaUploader` currently defaults `maxSizeMB = 50` for both types, so a user can pick a 30 MB JPG that Cloudinary rejects at its own 10 MB ceiling. 5 MB is well inside that and bounds storage.

### Enforcement model

Uploads travel browser → Cloudinary directly. Two mechanisms are actually server-side, both free:

1. **Cloudinary upload presets enforce max file size.** A console setting, configured once per preset; documented in §9 as a manual step. This is the only real per-file gate.
2. **A Postgres trigger on `messages`** sums `media_bytes` for `sender_id` within the current calendar month and raises if over 100 MB; a second check caps media items per thread at 20. Authoritative for volume.

Client pre-checks run *before* upload so the user sees *"you have 40 MB left"* rather than a raw database error, and so the trigger stays a race-condition backstop rather than the primary gate. Pre-checking first also matters because a rejected insert after a successful upload would leave an orphaned Cloudinary asset that unsigned presets cannot delete (deletion requires a secret key we deliberately do not ship). That orphan edge is accepted and rare.

Global (all-users) volume is **not** trigger-enforced — blocking every user when the pool empties is a product decision, not a technical one.

**What the meters can actually show.** Only two figures are computable from our own database: **storage in use** (`sum(media_bytes)` across all messages) and **uploads this month** (`sum(media_bytes)` where `created_at` is in the current calendar month, broken down per user). Both come from one aggregate query against `messages`.

**Bandwidth is not observable from the client.** Delivery bandwidth is counted by Cloudinary when it serves an asset, and the only API that reports it is the Admin API, which requires an API secret we deliberately do not ship to the browser. `FreeTierStatusModal` therefore shows the two measurable meters plus a direct link to the Cloudinary dashboard's usage page for bandwidth and transformations. Presenting a bandwidth number we cannot actually read would be worse than admitting it lives elsewhere.

### Bandwidth measures

- `preload="none"` and a `poster` on every `<video>` — most plays never happen, so most bandwidth never leaves.
- `w_1280,c_limit` on video delivery; `q_auto` on images, using the existing `getOptimizedCloudinaryUrl`.
- `loading="lazy"` on thread thumbnails.

### Supabase-side headroom

Trivial. Messages are < 2 KB against a 256 KB Realtime cap; 500 MB of database holds roughly 250,000 messages; 2M Realtime messages/month is unreachable at this scale; scoping subscriptions to open threads keeps concurrent connections far below 200.

The one genuine Supabase constraint is operational: **free projects pause after one week of inactivity.** Threads go silent until the project is woken. Handled explicitly in §7.

---

## 6. UI and data flow

### Placement

No new navigation tab. The thread hangs off the lists that already exist, which is where unread naturally surfaces:

- **Artist:** `ApplicationsView` rows gain a *Messages* button and an unread pill.
- **Organiser:** `OrganiserApplicantsView` cards gain a *Message* button and an unread pill.

The thread opens in the modal shell every other overlay in this codebase already uses (`fixed inset-0 z-50 overflow-y-auto … flex items-center justify-center p-3 sm:p-6`), so no new layout system is introduced — which also means no new responsive surface to re-audit.

### Files

**New (5):**

| File | Role |
|---|---|
| `supabase/schema.sql` | tables, RLS, triggers — one file pasted into the SQL editor |
| `src/lib/limits.ts` | limit constants + pure `maxBytesFor(file)` / `remaining(used)` |
| `src/lib/limits.test.ts` | `node:test` asserts over the quota arithmetic |
| `src/lib/threads.ts` | all data access: fetch, send, subscribe, mark-read, budget queries |
| `src/components/ThreadModal.tsx` | message list, composer, media attach |

**Modified (6):** `App.tsx` (thread state, profile bootstrap), `ApplicationsView`, `OrganiserApplicantsView` (entry point + unread badge), `MediaUploader` (type-aware caps), `FreeTierStatusModal` (the two measurable meters plus a Cloudinary dashboard link, §5), `types.ts` (`Thread`, `Message`).

**`package.json`:** one added script, `"test": "tsx --test src/lib/limits.test.ts"` — `tsx` is already a devDependency. No new dependencies.

### Send path

```
1. client pre-check   remaining budget (SELECT sum)   → "you have 40 MB left"
2. upload             browser → Cloudinary direct      → secureUrl, bytes, publicId
3. insert             upsert on client-generated id    → trigger re-checks budget
```

Step 1 must precede step 2 for the orphan-asset reason in §5.

### Receive path

```
open ThreadModal → SELECT messages where thread_id = ?
                 → subscribe postgres_changes INSERT on messages (thread_id=eq.<id>)
                 → subscribe UPDATE on threads (last_read from the other side)
close            → unsubscribe
```

Subscriptions are scoped to the single open thread and torn down on close.

### Fallback

Where `isSupabaseConfigured === false`, `threads.ts` returns local state instead of querying, matching the existing fallback pattern. Because a blob URL from `simulateLocalUpload` only exists in the sending browser, the thread shows a persistent amber banner in this mode: *Preview mode — media won't reach the other person until Cloudinary is configured.* Sending a dead link silently would be worse than saying so.

---

## 7. Error handling

| Failure | Behaviour |
|---|---|
| Cloudinary unconfigured | Persistent amber banner (above); demo still demonstrable locally. |
| File over type-aware cap | Blocked at step 1 with actual numbers: *"48.2 MB exceeds the 40 MB video limit."* |
| Budget exhausted (trigger) | *"Monthly upload budget reached — you've used 96 of 100 MB."* |
| RLS rejects insert | Generic *"You can't send to this thread."* — never discloses whether the thread exists. |
| Realtime drops | `CHANNEL_ERROR` / `CLOSED` → refetch and reconnect with backoff; refetch on window focus. A silently dead socket is what makes a chat feel broken while showing no error. |
| Send fails | Message retained, marked failed, retry control shown. Never dropped silently. |
| Double-click / retry | Client-generated UUID + upsert → cannot duplicate. |
| Project idle-paused | Detect the pause error string → *"Project paused after inactivity — wake it in the Supabase dashboard."* Beats an infinite spinner. |
| Browser offline | Upload fails at step 2 with a network error; Realtime reconnects on the `online` event. |

---

## 8. Verification

There is no test framework in this repository (`lint` is `tsc --noEmit`) and none is added.

**Runnable check.** Quota arithmetic is a money path, so `src/lib/limits.test.ts` covers `maxBytesFor()` and `remaining()` with plain `node:test` asserts. It must fail if someone edits the video ceiling 40 → 50 and reintroduces the transformation-ceiling bug. Run via `npm test`.

**Before the migration is applied — runnable by the implementer:**

1. `npm run lint`
2. `npm test`
3. Re-run the CDP responsive sweep with `ThreadModal` **open** at 360 / 390 / 768 / 1024 / 1366 — assert `scrollWidth <= clientWidth`. A message list plus composer at 360 px is exactly the pattern that reintroduces the overflow fixed in sub-project A.
4. Screenshots of the thread: empty, populated, budget-exhausted, preview-mode banner.

**Only the user can do — and the only thing that proves the feature:**

1. Paste `supabase/schema.sql` into the Supabase SQL editor.
2. Configure the upload preset's max file size (§9).
3. Open two browser profiles, one signed in as artist and one as organiser, and watch a message with media cross live.

No amount of local testing establishes that a cross-user feature works. This is named rather than claimed.

---

## 9. Known constraints and manual steps

**Manual steps (user):**

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. In the Cloudinary console, set the unsigned upload preset's **Max file size** to 40 MB and restrict allowed formats to jpg/jpeg/png/webp/mp4/mov/webm. This is the only server-side per-file gate and it is free.
3. Enable Realtime (publication) for `messages` and `threads` in Supabase — the migration includes the `alter publication` statement.

**Known constraints:**

- **Supabase free projects pause after one week of inactivity.** Threads are unreachable until the project is woken in the dashboard. Not fixable on the free tier.
- **Cloudinary limits are soft.** Exceeding them produces an email, not a hard block — hence our own caps sit below Cloudinary's ceilings rather than at them.
- **Simultaneous-organiser claim race** (§4). Two organiser accounts open at once: first claim wins. Root fix is persisting opportunities with an owner.
- **Orphaned assets on trigger rejection** (§5). Rare, bounded by the pre-check, accepted because unsigned presets cannot delete.
- **Stale denormalised names** on `threads` after a profile rename.

**Out of scope, recorded for later:** persisting opportunities and applications so listings and applicant lists survive a refresh (Approach 3).

---

## 10. Summary of decisions

| Decision | Choice | Rejected alternative |
|---|---|---|
| Shape | Thread per application | Free-form inbox; media request board |
| Persistence | Real Supabase Postgres | Local-only demo; polling |
| Liveness | Supabase Realtime | 5s poll; manual refresh |
| Tables | `profiles` + `threads` + `messages` | Two tables (RLS cannot see role in JWT) |
| Video cap | 40 MB | 50 MB current default — breaks transformation ceiling |
| Image cap | 5 MB | 50 MB current default — exceeds Cloudinary's 10 MB |
| Thread identity | `unique (opportunity_id, artist_id)` | Client-side duplicate guard |
| Idempotency | Client-generated message UUID | Server `gen_random_uuid()` |
| UI entry | Existing lists + modal shell | New nav tab; drawer |
