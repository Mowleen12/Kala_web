# UI Fixes Applied — Kala Web

Two things were changed in this pass:

1. **Organiser "Pipeline" section (Active Production Calls & Casting) is now fully responsive.**
2. **Uploaded profile pictures now persist across logout → login in both portals.**

---

## 1. Responsive layout

### `src/components/OrganiserFeaturedCalls.tsx` — the Pipeline section
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`
  → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`
  - **1 column** on phones, **2 columns from 640 px** (tablets in portrait, small laptops), **3 columns from 1024 px**, larger gutters so cards breathe.
- Category badge + "N Submissions" badge are now one wrapping row (`flex-wrap`, `ml-auto`), so on narrow cards the submission pill drops to a second line instead of overflowing the image.
- Card footer wraps (`flex-wrap`, `gap-x-3 gap-y-2`): a long commission string and the "Review (N)" button no longer collide on narrow columns. Button is `shrink-0 whitespace-nowrap`; commission text is `break-words`. Padding is `px-4 sm:px-5` so mobile cards keep usable inner width.

### `src/components/FeaturedOpportunities.tsx` (Artist portal cards)
- Same footer treatment (`flex-wrap`, `break-words` price, `shrink-0` button) so "₹50,000+" plus "Apply Now" never overflows a narrow card.

### `src/components/DiscoverView.tsx`
- Card grid `md:grid-cols-2` → `sm:grid-cols-2`, matching the Pipeline grid: two columns appear at 640 px instead of 768 px.

### `src/components/CategoryBadge.tsx` (new)
- Single source of truth for category pill colours (Music & Dance, Film, Visual Arts, Theatre, Writing, Design, College Societies). Used by the Pipeline cards; `whitespace-nowrap` prevents mid-word wrapping.

Reviewed and left unchanged (already responsive): `OrganiserApplicantsView` (filters `sm:grid-cols-2 lg:grid-cols-4`, roster `md:grid-cols-2`), `OrganiserListingsView`, `ApplicationsView`, `ProfileView`, `Sidebar`, `Header`, `PortalGateway`.

> Note on the dashboard 8/4 split in `App.tsx`: it intentionally switches at `xl`, not `lg`. Tailwind breakpoints are viewport-based, and the nested hero grid would collapse into two ~250 px halves on a laptop if the outer split moved to `lg`.

---

## 2. Profile picture persistence (both portals)

### Root cause
The avatar was written to `user_metadata.avatar_url`. OAuth providers (Google) **rewrite `avatar_url` and `picture` in `user_metadata` on every sign-in**, so the uploaded picture was replaced by the Google photo — or by nothing at all when the Google account has no picture — on the next login. Additionally, device-only refs (`blob:` / `kala-idb:`) could be written to the account, which no other session or browser can resolve.

### Fixes

**`src/lib/supabase.ts`** — `mapSupabaseUserToAuthUser`
- Reads a provider-safe key first: `metadata.kala_avatar_url` → `avatar_url` → `picture`.

**`src/lib/profile.ts`**
- `persistAvatarToAccount` now writes `kala_avatar_url` (never touched by a provider) *and* keeps `avatar_url` in sync, and updates the `profiles` row as before.
- It **refuses to write device-only refs** (`blob:` / `kala-idb:`) to the account — those cannot resolve outside the browser that created them.
- New `fetchAccountAvatar(userId)`: reads the avatar bound to the account (`profiles.avatar_url`), i.e. the copy that survives a cleared localStorage or a different browser. Returns null when the table/column is unavailable.

**`src/App.tsx`**
- On sign-in, avatar resolution now considers *three* sources — local draft, account (`fetchAccountAvatar`), session metadata — and **prefers any hosted URL over a device-only one**. Device-only refs are still upgraded to shared storage when possible, then re-saved locally and to the account.
- `handleProfileMediaChange`: when the picked avatar is device-local, it is uploaded to shared storage first and the resulting hosted URL is what gets saved locally and on the account. Hosted picks go straight to the account.

**`src/lib/drafts.ts`** — restored to its original implementation (an intermediate edit had broken the module's exports).

### Result
Upload once → the URL is stored per user in localStorage (`kala_profile_media_<userId>`), in the account metadata under `kala_avatar_url`, and in the `profiles` row. Logging out and back in (password or Google), refreshing, or opening the app in another browser all resolve the same hosted picture. Header avatar, artist profile, and organiser logo all read from that one value.

---

## Verification status
- Changes were reviewed file-by-file.
- `npx tsc --noEmit` and `git` could **not** be run: the sandbox fails to start shell processes in this workspace (`SetNamedSecurityInfoW failed (Win32 5): grantWrite(C:\dev\kala_web)`). Please run `npm run lint` and a quick manual pass (mobile viewport + logout/login) on your machine.
