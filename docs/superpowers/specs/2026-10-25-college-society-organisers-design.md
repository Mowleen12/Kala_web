# College Society Organisers, Mandatory Event Fields, Live Publishing — Design

Date: 2026-10-25
Status: approved

## Problem

1. College societies and clubs have no way to register as an organiser; the
   platform only offers "Cultural Venue / Festival".
2. The event (call) form only validates the title — venue, city, dates,
   description and cover can all be published empty.
3. A published call does not reach an artist's open tab until they reload.

## Decisions (user-approved)

| # | Decision | Alternative rejected |
|---|----------|----------------------|
| 1 | College society is a **sub-type of `organiser`**, not a third role | A third `role` value would touch the role CHECK constraint, `is_organiser()`, `threads.sender_role`, the stats RPC and every role ternary. |
| 2 | Core-7 mandatory fields: title, category, venue, city, start date, description, cover image. End date, time and honorarium stay optional. | "All fields" would reject online/unpaid calls. |
| 3 | Enforcement is **client + DB** (validator + `NOT NULL`) | Client-only is bypassable by direct Supabase inserts. |
| 4 | Sub-type is editable at sign-up **and** in the organiser profile, stored in `user_metadata` (`org_type`, `college_name`) plus the existing profile draft | A `profiles.org_type` column would only be needed for server-side counting/filtering — deferred. |
| 5 | Artist portal shows societies: badge on listings + detail, Discover filter option, thread/apply labels, and a dedicated home section | Organiser-side-only (earlier position, superseded by this request). |
| 6 | Newly published calls must reach open artist tabs live | Current behaviour: reload required. |

## A. Organiser sub-type

- `type OrganiserType = 'venue' | 'society'`. `role` remains
  `('artist' | 'organiser')` everywhere: DB checks, RLS, threads, stats are
  untouched.
- Sign-up: a segmented control picks the sub-type; the org-name label becomes
  "Society / Club Name" for societies; a required "College / Institution Name"
  field appears (id `#signup-college-name`). Existing id `#signup-org-name`
  must not change (E2E depends on it).
- Storage mirrors `org_name` exactly: `user_metadata.org_type` /
  `user_metadata.college_name`, written by `supabaseSignUp` and by the Google
  pending-auth flush path (`kala_pending_auth_org_type`,
  `kala_pending_auth_college`).
- Organiser profile shows a `College Society • <college>` badge and both
  fields are editable in the existing edit mode.

## B. Mandatory event fields (core 7)

- Pure validator `validatePostForm` in `src/lib/postForm.ts`, unit-tested with
  `node:test` (`npm test`). Title length 3–300 matches the DB check.
- `PostOpportunityModal`: red asterisks, per-field inline errors,
  `aria-invalid`, error summary box; exact summary copy
  `Some required fields are missing — check the highlighted inputs.`
- `OpportunityInput` promotes `description`, `venue`, `city`, `dateRange`,
  `imageUrl` to required; `createOpportunity` stops passing `|| null` for them.
- `supabase/schema.sql` (idempotent): backfill legacy NULLs (`''`, cover →
  the Auditorium Stage preset URL) then `set not null` on `venue`, `city`,
  `date_range`, `description`, `image_url`.

## C. Artist portal surface for societies

- `organiser_type` snapshot column on `opportunities` and `threads`,
  mirroring the existing `organiser_name` snapshot. Legacy NULL reads as
  venue. No CHECK constraint — a bogus value renders as venue.
- `College Society` chip on: Discover card, home Featured card,
  detail modal "Presented by", apply modal header, thread header.
- Discover venue-type filter gains `College Societies & Clubs` (value
  `society`) — matched on `organiserType`, not venue keywords.
- Artist home gains a `Calls from College Societies & Clubs` section reusing
  `FeaturedOpportunities` with optional `title`/`subtitle` props; it renders
  only when at least one society call exists.

## D. Live publishing (bug fix)

Root cause: `public.opportunities` is not in the `supabase_realtime`
publication and there is no client subscription; opportunities are fetched
once per session (`App.tsx` effect keyed on `currentUser?.id`).

Fix (both halves required):
1. Idempotent DO block adding `opportunities` to `supabase_realtime`,
   placed **after** `create table ... opportunities` so a fresh install works.
2. `subscribeOpportunities(onChange)` in `src/lib/listings.ts`, wired into
   the existing App effect beside `subscribeApplications`, including the
   visibilitychange "wake" refetch.

## E. Copy

- Gateway card: `Host & Venue` → `Hosts, Venues & Clubs`; subtitle
  `Organiser & Venue Portal` → `Organiser Portal`.
- Sidebar/Header menu item `Venue Profile` → `Organiser Profile`.
- E2E-protected copy that must NOT change: `+ Register Cultural Venue`,
  `+ Sign up as new Artist`, `Sign In to Organiser Portal`,
  `Select Your Workspace to Log In`, `Publish Call`, `Post Production Call`.

## Verification

- `npm run lint` (tsc --noEmit) and `npm test` after every task.
- `supabase/schema.sql` re-pasted twice with no errors on the second run.
- `.e2e/acceptance.py`: negative publish check, society signup + badge check,
  and a two-context realtime phase (publish in context B, assert the artist
  tab in context A sees it without reloading).

## Out of scope (deferred)

- Server-side society statistics or filtering (needs a `profiles` column).
- A separate portal, theme or navigation for societies.
- Requiring honorarium, end date or time.
