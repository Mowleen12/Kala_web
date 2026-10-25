# College Society Organisers + Mandatory Event Fields + Live Publishing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let college societies/clubs register as an organiser sub-type (surfaced in the artist portal), make the event form's core fields mandatory end-to-end (client + DB), and make newly published calls appear in open artist tabs without a reload.

**Architecture:** Sub-type, not a new role — `role` stays `('artist','organiser')`; an `org_type` (`venue`|`society`) rides in Supabase `user_metadata` exactly like `org_name`, and an `organiser_type` snapshot rides on `opportunities`/`threads` exactly like `organiser_name`. Mandatory fields are enforced by a pure validator (unit-tested) plus `NOT NULL` columns after an idempotent backfill. The refresh bug is missing both halves of the realtime pattern already used for `applications`.

**Tech Stack:** React 19 + TS, Vite, Tailwind 4, Supabase (auth/postgres/realtime), node:test via `tsx`, Playwright Python E2E.

**Spec:** `docs/superpowers/specs/2026-10-25-college-society-organisers-design.md`

## Global Constraints
- No new dependencies; `npm run lint` (`tsc --noEmit`) and `npm test` (`tsx --test src/lib/*.test.ts`) must pass after every task.
- `supabase/schema.sql` stays idempotent: pasting the whole file twice must not error.
- Never break these E2E selectors/copy: `#signup-org-name`, `#signup-submit-btn`, `#signup-discipline`, `input[placeholder*="Monsoon Classical"]`, button names `Publish Call` / `Post Production Call` / `+ Register Cultural Venue` / `+ Sign up as new Artist`, text `Select Your Workspace to Log In`, `Sign In to Organiser Portal`.
- Portal copy rule: organiser-facing text says "Organiser"/"Host" unless it specifically distinguishes venue vs society; society wording is "College Society".
- Manual deploy step at the end: re-paste `supabase/schema.sql` into the Supabase SQL editor (Tasks 3 and 12 both depend on it landing).

---

### Task 1: `validatePostForm` — pure validator (TDD)

**Files:**
- Create: `src/lib/postForm.ts`
- Test: `src/lib/postForm.test.ts`

**Interfaces:**
- Produces: `export interface PostFormFields`, `export type PostFormErrors`, `export function validatePostForm(f: PostFormFields): PostFormErrors` — consumed by Task 7.

- [ ] **Step 1: Write the failing test**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePostForm, PostFormFields } from './postForm';

const VALID: PostFormFields = {
  title: 'Monsoon Fusion Showcase 2026',
  category: 'Music & Dance',
  venue: 'NCPA Tata Theatre',
  city: 'Mumbai, Maharashtra',
  startDate: '2026-12-05',
  endDate: '2026-12-06',
  description: 'Looking for fusion ensembles for a two-evening showcase.',
  imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
  priceChoice: 'custom',
  customMin: '15000',
  customMax: '30000',
};

test('valid form returns no errors', () => {
  assert.deepEqual(validatePostForm(VALID), {});
});

test('every required field is reported when empty', () => {
  const errors = validatePostForm({ ...VALID, title: '', venue: '', city: '', startDate: '', description: '', imageUrl: '' });
  for (const key of ['title', 'venue', 'city', 'startDate', 'description', 'imageUrl']) {
    assert.ok(errors[key as keyof typeof errors], `expected an error for ${key}`);
  }
  assert.equal(errors.endDate, undefined, 'empty end date is allowed');
});

test('title must be at least 3 characters to match the DB check', () => {
  assert.ok(validatePostForm({ ...VALID, title: 'ab' }).title);
  assert.ok(validatePostForm({ ...VALID, title: '   ' }).title);
});

test('end date cannot precede start date', () => {
  assert.ok(validatePostForm({ ...VALID, startDate: '2026-12-10', endDate: '2026-12-01' }).endDate);
});

test('custom honorarium requires both bounds, max >= min', () => {
  assert.ok(validatePostForm({ ...VALID, customMin: '' }).customMin);
  assert.ok(validatePostForm({ ...VALID, customMax: '' }).customMax);
  assert.ok(validatePostForm({ ...VALID, customMin: '50000', customMax: '10000' }).customMax);
});

test('preset honorarium needs no numbers', () => {
  const errors = validatePostForm({ ...VALID, priceChoice: 'Under ₹10k', customMin: '', customMax: '' });
  assert.equal(errors.customMin, undefined);
  assert.equal(errors.customMax, undefined);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './postForm'` (or equivalent module-resolution error).

- [ ] **Step 3: Write the implementation**

```ts
export interface PostFormFields {
  title: string;
  category: string;
  venue: string;
  city: string;
  startDate: string;
  endDate: string;
  description: string;
  imageUrl: string;
  priceChoice: string;
  customMin: string;
  customMax: string;
}

export type PostFormErrors = Partial<Record<keyof PostFormFields, string>>;

/** Core-7 required fields; honorarium bounds only when "Your own price" is picked. */
export function validatePostForm(f: PostFormFields): PostFormErrors {
  const errors: PostFormErrors = {};
  const title = f.title.trim();
  if (title.length < 3) errors.title = 'Title must be at least 3 characters';
  else if (title.length > 300) errors.title = 'Title must be 300 characters or fewer';
  if (!f.category.trim()) errors.category = 'Pick a category discipline';
  if (!f.venue.trim()) errors.venue = 'Venue is required';
  if (!f.city.trim()) errors.city = 'City & state is required';
  if (!f.startDate) errors.startDate = 'Event start date is required';
  else if (f.endDate && f.endDate < f.startDate) errors.endDate = 'End date cannot be before the start date';
  if (!f.description.trim()) errors.description = 'Add a short synopsis of the call';
  if (!f.imageUrl) errors.imageUrl = 'Choose or upload a banner';
  if (f.priceChoice === 'custom') {
    const min = Number(f.customMin);
    const max = Number(f.customMax);
    if (!f.customMin || Number.isNaN(min) || min < 0) errors.customMin = 'Enter a minimum honorarium';
    else if (!f.customMax || Number.isNaN(max) || max < 0) errors.customMax = 'Enter a maximum honorarium';
    else if (max < min) errors.customMax = 'Maximum must be greater than or equal to the minimum';
  }
  return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green, including the six new cases.

- [ ] **Step 5: Commit**

```bash
git add src/lib/postForm.ts src/lib/postForm.test.ts
git commit -m "feat: validatePostForm validator for required event fields"
```

---

### Task 2: Types + Supabase auth plumbing for `org_type` / `college_name`

**Files:**
- Modify: `src/types.ts` (line 1, `Opportunity`, `Thread`, `AuthUser`, `OrganiserProfile`)
- Modify: `src/lib/supabase.ts` (`mapSupabaseUserToAuthUser` ~:38-55, `supabaseSignInWithGoogle` ~:92-107, `supabaseSignUp` ~:242-268, `supabaseSignOut` ~:334, `takePendingAuthRole`/`clearPendingAuthRole`/`withPendingPortal` ~:354-389, `supabaseGetCurrentUser` flush ~:410-437)

**Interfaces:**
- Produces: `export type OrganiserType = 'venue' | 'society'`; `AuthUser.orgType?: OrganiserType`; `AuthUser.collegeName?: string`; `OrganiserProfile.orgType?: OrganiserType`; `OrganiserProfile.collegeName: string`; `Opportunity.organiserType?: OrganiserType`; `Thread.organiserType?: OrganiserType | null`. Consumed by Tasks 4–9.

- [ ] **Step 1: Add the types**

`src/types.ts`, immediately after `export type PortalMode = ...`:

```ts
export type OrganiserType = 'venue' | 'society';
```

In `interface Opportunity`, after `organizer?: string;`:

```ts
  organiserType?: OrganiserType;
```

In `interface Thread`, after `organiserAvatar: string | null;`:

```ts
  organiserType?: OrganiserType | null;
```

In `interface AuthUser`, after `orgName?: string;`:

```ts
  orgType?: OrganiserType;
  collegeName?: string;
```

In `interface OrganiserProfile`, after `about: string;`:

```ts
  orgType?: OrganiserType;
  collegeName: string;
```

- [ ] **Step 2: Read the metadata in `mapSupabaseUserToAuthUser`**

After the existing `orgName: metadata.org_name || undefined,` line:

```ts
    orgType: metadata.org_type === 'venue' || metadata.org_type === 'society' ? metadata.org_type : undefined,
    collegeName: metadata.college_name || undefined,
```

- [ ] **Step 3: Write it at sign-up**

In `supabaseSignUp(params: {...})` add `orgType?: OrganiserType;` and `collegeName?: string;` to the parameter type; inside `options.data` after `org_name`:

```ts
          org_type: params.orgType,
          college_name: params.collegeName,
```

- [ ] **Step 4: Carry it through Google OAuth (mirror `org_name` in all five places)**

1. `supabaseSignInWithGoogle` options type: add `customOrgType?: OrganiserType;` and `customCollegeName?: string;`. In the localStorage block after the `customDiscipline` line:

```ts
    if (options?.customOrgType) localStorage.setItem('kala_pending_auth_org_type', options.customOrgType);
    if (options?.customCollegeName) localStorage.setItem('kala_pending_auth_college', options.customCollegeName);
```

2. `takePendingAuthRole()` — return type gains `orgType?: OrganiserType; collegeName?: string;`; body reads:

```ts
    const ot = localStorage.getItem('kala_pending_auth_org_type');
    orgType = ot === 'venue' || ot === 'society' ? ot : undefined;
    collegeName = localStorage.getItem('kala_pending_auth_college') || undefined;
```

3. `clearPendingAuthRole()` **and** the `supabaseSignOut()` cleanup block: `localStorage.removeItem('kala_pending_auth_org_type'); localStorage.removeItem('kala_pending_auth_college');`

4. `withPendingPortal()` — inside the returned object add:

```ts
    orgType: pending.role === 'organiser' ? pending.orgType || user.orgType : user.orgType,
    collegeName: pending.role === 'organiser' ? pending.collegeName || user.collegeName : user.collegeName,
```

5. `supabaseGetCurrentUser` flush — `needsFlush` gains `|| Boolean(pending.orgType) || Boolean(pending.collegeName)`; inside the `updateUser` payload's `roleToFlush === 'organiser'` branch add:

```ts
            org_type: pending.orgType || user.user_metadata?.org_type || undefined,
            college_name: pending.collegeName || user.user_metadata?.college_name || undefined,
```

- [ ] **Step 5: Verify**

Run: `npm run lint` → Expected: 0 errors (pure wiring, no unit test — YAGNI).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/lib/supabase.ts
git commit -m "feat: org_type/college_name auth plumbing"
```

---

### Task 3: `schema.sql` — snapshot columns, mandatory `NOT NULL`, realtime publication

**Files:**
- Modify: `supabase/schema.sql` (section 1 after `threads_organiser_idx`, section 5.1 after `opportunities_created_idx`)

**Interfaces:**
- Produces: `public.opportunities.organiser_type`, `public.threads.organiser_type`, `NOT NULL` on `venue`/`city`/`date_range`/`description`/`image_url`, `opportunities` in the `supabase_realtime` publication. Consumed by Tasks 6, 8, 10; requires the manual re-paste (Task 13).

- [ ] **Step 1: thread snapshot column** — right after `create index if not exists threads_organiser_idx on public.threads (organiser_id);`:

```sql
-- Organiser sub-type snapshot (venue vs college society) — mirrors organiser_name.
alter table public.threads add column if not exists organiser_type text;
```

- [ ] **Step 2: opportunity snapshot column** — right after `create index if not exists opportunities_created_idx on public.opportunities (created_at desc);`:

```sql
alter table public.opportunities add column if not exists organiser_type text;
```

- [ ] **Step 3: mandatory event fields (backfill first, then constrain)** — immediately after Step 2:

```sql
-- Core-7 mandatory event fields: backfill legacy rows, then hold new writes.
update public.opportunities set venue       = '' where venue is null;
update public.opportunities set city        = '' where city is null;
update public.opportunities set date_range  = '' where date_range is null;
update public.opportunities set description = '' where description is null;
update public.opportunities set image_url   = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=700&q=80'
  where image_url is null or btrim(image_url) = '';

alter table public.opportunities alter column venue       set not null;
alter table public.opportunities alter column city        set not null;
alter table public.opportunities alter column date_range  set not null;
alter table public.opportunities alter column description set not null;
alter table public.opportunities alter column image_url   set not null;
```

- [ ] **Step 4: realtime publication — AFTER the table exists** (section 4 runs before `create table opportunities` and would error on a fresh install):

```sql
-- A published call must reach every open artist tab without a reload.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'opportunities'
  ) then
    alter publication supabase_realtime add table public.opportunities;
  end if;
end $$;
```

- [ ] **Step 5: Idempotency check**

Paste the whole file into the Supabase SQL editor **twice**; the second run must produce no errors. (There is no local Postgres harness — this double-paste is the runnable check for the DDL.)

- [ ] **Step 6: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: organiser_type snapshots, required event columns, opportunities realtime"
```

---

### Task 4: Sign-up sub-type picker + college field

**Files:**
- Modify: `src/components/CreateAccountModal.tsx` (state ~:53, validation ~:84, sign-up ~:136, Google ~:184, org-name block ~:492-507)

**Interfaces:**
- Consumes: `OrganiserType` and the `supabaseSignUp({ orgType, collegeName })` / `supabaseSignInWithGoogle(..., { customOrgType, customCollegeName })` signatures from Task 2.
- Produces: selectors `#signup-org-type-venue`, `#signup-org-type-society`, `#signup-college-name` — used by Task 12.

- [ ] **Step 1: state** — after `const [orgName, setOrgName] = useState('');`:

```ts
  const [orgType, setOrgType] = useState<OrganiserType>('venue');
  const [collegeName, setCollegeName] = useState('');
```

Import `OrganiserType` alongside the existing `PortalMode` import from `../types`.

- [ ] **Step 2: validation** — after the existing `if (role === 'organiser' && !orgName.trim())` block:

```ts
      if (role === 'organiser' && orgType === 'society' && !collegeName.trim()) {
        setError('Please enter your college / institution name');
        return;
      }
```

- [ ] **Step 3: pass it on both auth paths**

In the `supabaseSignUp({...})` call, next to `orgName:`:

```ts
          orgType: role === 'organiser' ? orgType : undefined,
          collegeName: role === 'organiser' && orgType === 'society' ? collegeName.trim() : undefined,
```

In the `supabaseSignInWithGoogle(role, {...})` call, next to `customOrgName:`:

```ts
        customOrgType: role === 'organiser' ? orgType : undefined,
        customCollegeName: role === 'organiser' && orgType === 'society' ? collegeName.trim() : undefined,
```

- [ ] **Step 4: sub-type picker above the org-name field**

Inside the existing `{!isLoginMode && role === 'organiser' && (` block, **before** the org-name input, insert:

```tsx
                    <div className="mb-3">
                      <span className="text-xs font-semibold text-zinc-700 block mb-1.5">Organiser type</span>
                      <div className="grid grid-cols-2 p-1 bg-[#FAF8F5] border border-[#E8E2D8] rounded-2xl">
                        <button
                          id="signup-org-type-venue"
                          type="button"
                          onClick={() => setOrgType('venue')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${orgType === 'venue' ? 'bg-[#E45826] text-white shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'}`}
                        >
                          Cultural Venue / Festival
                        </button>
                        <button
                          id="signup-org-type-society"
                          type="button"
                          onClick={() => setOrgType('society')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${orgType === 'society' ? 'bg-[#E45826] text-white shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'}`}
                        >
                          College Society / Club
                        </button>
                      </div>
                    </div>
```

Change the org-name label span to `{orgType === 'society' ? 'Society / Club Name' : 'Cultural Institution / Venue Name'}` and its placeholder to `{orgType === 'society' ? 'e.g. Rangoli Music Society, IIT Delhi' : 'e.g. NCPA Mumbai, Prithvi Theatre, Ranga Shankara'}`. **Keep the input's `id="signup-org-name"`.** After that input add:

```tsx
                    {orgType === 'society' && (
                      <div className="mt-3">
                        <label htmlFor="signup-college-name" className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mb-1">
                          <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
                          <span>College / Institution Name</span>
                        </label>
                        <input
                          id="signup-college-name"
                          type="text"
                          value={collegeName}
                          onChange={(e) => setCollegeName(e.target.value)}
                          placeholder="e.g. Indian Institute of Technology Delhi"
                          className="w-full bg-[#FAF8F5] border border-[#E5E0D6] focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 shadow-2xs"
                        />
                      </div>
                    )}
```

Add `GraduationCap` to the existing `lucide-react` import list.

- [ ] **Step 5: Verify**

Run: `npm run lint` → Expected: 0 errors; `npm test` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/CreateAccountModal.tsx
git commit -m "feat: college society sub-type in organiser signup"
```

---

### Task 5: Organiser profile badge + editing, seeded in App

**Files:**
- Modify: `src/App.tsx` (`EMPTY_ORGANISER_PROFILE` ~:87-98, `organiserProfile` useMemo ~:200-213)
- Modify: `src/components/OrganiserProfileView.tsx` (state ~:30-58, location line ~:126-153, save)

**Interfaces:**
- Consumes: `OrganiserProfile.orgType` / `.collegeName` (Task 2).
- Produces: profile draft fields `orgType`, `collegeName` under the existing `kala_org_profile_<uid>` key — asserted by Task 12.

- [ ] **Step 1: seed from auth metadata** — in `EMPTY_ORGANISER_PROFILE` add `orgType: undefined, collegeName: '',`. In the `organiserProfile` useMemo, place these **before** `...draft` so a local edit wins:

```ts
      orgType: currentUser.orgType,
      collegeName: currentUser.collegeName || '',
```

- [ ] **Step 2: display state + save in `OrganiserProfileView`** — add component state:

```ts
  const [editOrgType, setEditOrgType] = useState<OrganiserType>('venue');
  const [editCollege, setEditCollege] = useState('');
```

(`OrganiserType` imported from `../types`.) `startEditing()` sets them from `profile`; `saveProfile()` spreads:

```ts
      orgType: editOrgType,
      collegeName: editOrgType === 'society' ? editCollege.trim() : profile.collegeName || '',
```

- [ ] **Step 3: badge under the location line** (immediately after the `</p>` that closes the location row):

```tsx
                {profile.orgType === 'society' && (
                  <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[11px] font-bold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
                    <GraduationCap className="w-3.5 h-3.5" />
                    College Society{profile.collegeName ? ` • ${profile.collegeName}` : ''}
                  </span>
                )}
```

(`GraduationCap` added to the existing lucide-react import.)

- [ ] **Step 4: edit controls** — in edit mode, above the name input row, the same two-button segmented control as Task 4 but bound to `editOrgType` / `setEditOrgType` with ids `profile-org-type-venue` and `profile-org-type-society`; when `editOrgType === 'society'`, also render an input bound to `editCollege` with `aria-label="College name"` and placeholder `e.g. Indian Institute of Technology Delhi`.

- [ ] **Step 5: Verify**

Run: `npm run lint` → 0 errors. Manual: sign up as a society → profile shows the badge; toggle to venue → badge gone after save/reload.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/OrganiserProfileView.tsx
git commit -m "feat: college society badge on organiser profile"
```

---

### Task 6: `listings.ts` — required `OpportunityInput`, `organiser_type`, `subscribeOpportunities`

**Files:**
- Modify: `src/lib/listings.ts` (`rowToOpportunity` ~:48, `OpportunityInput` + `createOpportunity` ~:186-214, after `subscribeApplications` ~:280)

**Interfaces:**
- Consumes: `OrganiserType` (Task 2), `public.opportunities.organiser_type` (Task 3).
- Produces: `OpportunityInput` with required `description`/`venue`/`city`/`dateRange`/`imageUrl` plus `organiserType?: OrganiserType`; `export function subscribeOpportunities(onChange: () => void): () => void`. Consumed by Tasks 7, 8, 10.

- [ ] **Step 1: map the snapshot** — in `rowToOpportunity`, after the `organizer:` line:

```ts
  organiserType: r.organiser_type === 'society' ? 'society' : 'venue',
```

- [ ] **Step 2: tighten the input type** — replace `OpportunityInput` with:

```ts
export interface OpportunityInput {
  title: string;
  category: string;
  description: string;
  venue: string;
  city: string;
  dateRange: string;
  imageUrl: string;
  organiserType?: OrganiserType;
  requirements?: string[];
  location?: string;
  deadline?: string | null;
  compensation?: string;
}
```

In `createOpportunity`'s `.insert({...})`, replace the nullable fallbacks:

```ts
      description: input.description,
      venue: input.venue,
      city: input.city,
      date_range: input.dateRange,
      image_url: input.imageUrl,
      organiser_type: input.organiserType || null,
      location: input.location || null,
      deadline: input.deadline || null,
      compensation: input.compensation || null,
```

Import `OrganiserType` from `../types`.

- [ ] **Step 3: realtime subscription** — immediately after `subscribeApplications`, mirroring it exactly:

```ts
/** A call published by any organiser has to land in every open artist tab
 *  without a reload. Same contract as subscribeApplications: callers gate on
 *  isDbReady() first, local mode has nothing to subscribe to. */
export function subscribeOpportunities(onChange: () => void): () => void {
  if (!supabaseClient) return () => {};

  const channel = supabase
    .channel('opportunities-list')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, () => onChange())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
```

- [ ] **Step 4: Verify**

Run: `npm run lint` → Expected: **FAIL on `App.tsx`** (Task 7's publish handler still passes the old optional-only shape). Do **not** commit red — proceed directly to Task 7, then commit both together.

- [ ] **Step 5: Commit (after Task 7's lint passes)**

```bash
git add src/lib/listings.ts
git commit -m "feat: required opportunity input, organiser_type, opportunities subscription"
```

---

### Task 7: `PostOpportunityModal` mandatory-field UI + App publish handler

**Files:**
- Modify: `src/components/PostOpportunityModal.tsx` (draft interface, state ~:70, `handleSubmit` ~:111-155, form fields ~:254-457)
- Modify: `src/App.tsx` (`createOpportunity` call ~:695-717)

**Interfaces:**
- Consumes: `validatePostForm` / `PostFormErrors` (Task 1), `OpportunityInput.organiserType` (Task 6).
- Produces: selectors `id="post-venue"`, `id="post-city"`, `id="post-start-date"`, `id="post-description"`, `id="post-title"`, `id="post-end-date"`; exact error copy `Some required fields are missing — check the highlighted inputs.` — asserted by Task 12.

- [ ] **Step 1: state + helpers**

```ts
  const [fieldErrors, setFieldErrors] = useState<PostFormErrors>({});
```

after `if (!isOpen) return null;`:

```ts
  const fieldError = (k: keyof PostFormErrors) =>
    fieldErrors[k] ? <p className="text-[11px] text-rose-600 mt-1">{fieldErrors[k]}</p> : null;
  const inputCls = (k: keyof PostFormErrors) =>
    `w-full bg-[#FAF8F5] border rounded-xl px-3.5 py-2 text-xs font-medium text-zinc-900 outline-none ${
      fieldErrors[k] ? 'border-rose-400' : 'border-[#E0D9CD] focus:border-[#E45826]'
    }`;
  const clearErr = (k: keyof PostFormErrors) =>
    setFieldErrors((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
```

Import `validatePostForm, PostFormErrors` from `../lib/postForm`.

- [ ] **Step 2: validate on submit** — replace the title-only guard in `handleSubmit` with:

```ts
    const errors = validatePostForm({
      title, category, venue, city, startDate, endDate, description,
      imageUrl: selectedImage, priceChoice, customMin, customMax,
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Some required fields are missing — check the highlighted inputs.');
      return;
    }
    if (submitting) return;
    setError('');
```

- [ ] **Step 3: wire the fields** — for each of **title, venue, city, startDate, endDate, description**:
  - add `id="post-title"`, `id="post-venue"`, `id="post-city"`, `id="post-start-date"`, `id="post-end-date"`, `id="post-description"`
  - add `clearErr('<key>')` as the first line of its `onChange`
  - swap the class for `inputCls('<key>')`
  - render `{fieldError('<key>')}` directly under the input

  Labels gain a red asterisk for **Opportunity Title, Venue / Auditorium, City & State, Event Dates & Time, Curatorial Synopsis**:
  `... <span className="text-[#E45826]">*</span>`

  Under the custom min/max inputs render `{fieldError('customMin')}` and `{fieldError('customMax')}`; under the `MediaUploader` banner block render `{fieldError('imageUrl')}`.

- [ ] **Step 4: App publish handler** — in the `createOpportunity({...}, {...})` call in `App.tsx`, add:

```ts
        organiserType: currentUser.orgType,
```

(the other required fields already flow through from `newOpp`, now guaranteed non-empty by Step 2).

- [ ] **Step 5: Verify**

Run: `npm run lint` → 0 errors (this also clears Task 6's expected failure); `npm test` → PASS. Manual: Post Production Call → Publish with only a title → error box + red fields; fill the seven → publishes.

- [ ] **Step 6: Commit**

```bash
git add src/components/PostOpportunityModal.tsx src/App.tsx
git commit -m "feat: mandatory event fields in the post call form"
```

---

### Task 8: Thread plumbing carries `organiser_type`

**Files:**
- Modify: `src/lib/threads.ts` (`rowToThread` ~:29-43, `ensureArtistThread` ~:198-251)
- Modify: `src/App.tsx` (`openArtistThread` ~:593-600, selected-status thread ~:755-767)

**Interfaces:**
- Consumes: `Thread.organiserType` (Task 2), `Opportunity.organiserType` (Task 6), `public.threads.organiser_type` (Task 3).
- Produces: `ensureArtistThread({ ..., organiserType?: OrganiserType })` — consumed by Task 9's thread chip.

- [ ] **Step 1: map + accept**

`rowToThread` gains:

```ts
  organiserType: r.organiser_type === 'society' ? 'society' : r.organiser_type ? 'venue' : null,
```

`ensureArtistThread`'s parameter type gains `organiserType?: OrganiserType;`. The local-mode thread literal gains `organiserType: input.organiserType || null,`. The `.insert({...})` payload gains `organiser_type: input.organiserType || null,`.

- [ ] **Step 2: both call sites** — in `App.tsx`, `ensureArtistThread({opportunityId, opportunityTitle, user, organiserName})` (artist path) gains `organiserType: opp?.organiserType,`; the organiser-selection path gains `organiserType: currentUser.orgType,`.

- [ ] **Step 3: Verify**

Run: `npm run lint` → 0 errors; `npm test` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/threads.ts src/App.tsx
git commit -m "feat: organiser_type snapshot on threads"
```

---

### Task 9: Artist portal surface — chips, filter, home section, thread label

**Files:**
- Modify: `src/components/DiscoverView.tsx` (`venueTypeOptions` ~:83-88, venue branch ~:153-162, card badges ~:474-478)
- Modify: `src/components/FeaturedOpportunities.tsx` (props ~:7-21, header ~:37-62, card badges ~:98-103)
- Modify: `src/App.tsx` (memo near ~:395, home section ~:997-1003)
- Modify: `src/components/OpportunityDetailModal.tsx` (~:110-120)
- Modify: `src/components/ApplyModal.tsx` (~:154-156)
- Modify: `src/components/ThreadModal.tsx` (~:206-237)

**Interfaces:**
- Consumes: `Opportunity.organiserType`, `Thread.organiserType`.
- Produces: visible `College Society` chips, the `Calls from College Societies & Clubs` home section, Discover filter value `society` — asserted by Task 12.

- [ ] **Step 1: Discover filter** — add to `venueTypeOptions`:

```ts
    { label: 'College Societies & Clubs', value: 'society' },
```

In the venue-type branch prepend:

```ts
      if (selectedVenueType === 'society') {
        matchesVenue = opp.organiserType === 'society';
      } else if (selectedVenueType === 'theatre') {
```

- [ ] **Step 2: Discover card chip** — make the badge wrapper `<div className="absolute top-3 left-3 flex items-center gap-2">` and after the category span add:

```tsx
                  {opp.organiserType === 'society' && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white text-[#E45826] shadow-xs">College Society</span>
                  )}
```

- [ ] **Step 3: `FeaturedOpportunities` — optional title + chip** — props gain `title?: string; subtitle?: string;`. Use `title ?? 'Featured Opportunities'` and `subtitle ?? 'Live events, auditions, and programs tailored for you.'`. Inside the badge row add the same chip as Step 2 (conditional on `opp.organiserType === 'society'`).

- [ ] **Step 4: home section** — near the other memos in `App.tsx`:

```ts
  const societyCalls = useMemo(
    () => opportunities.filter((o) => o.organiserType === 'society'),
    [opportunities]
  );
```

After the existing `<FeaturedOpportunities ... />` in the artist home tab:

```tsx
                      {societyCalls.length > 0 && (
                        <FeaturedOpportunities
                          title="Calls from College Societies & Clubs"
                          subtitle="Campus festivals, club showcases and society productions."
                          opportunities={societyCalls}
                          appliedIds={appliedOppIds}
                          onApply={handleApplyClick}
                          onViewDetails={handleViewDetails}
                          onViewAll={() => setCurrentArtistTab('discover')}
                        />
                      )}
```

(Renders only when at least one exists — no empty box on the home tab.)

- [ ] **Step 5: detail modal** — in `OpportunityDetailModal`, beside the organiser name in the "Presented by" block:

```tsx
                {opportunity.organiserType === 'society' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">College Society</span>
                )}
```

- [ ] **Step 6: apply modal** — in `ApplyModal`, after the category chip in the header preview, the same society chip conditional on `opportunity.organiserType === 'society'`.

- [ ] **Step 7: thread label** — in `ThreadModal`, after the counterparty name paragraph:

```tsx
              {isArtist && thread.organiserType === 'society' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">College Society</span>
              )}
```

- [ ] **Step 8: Verify**

Run: `npm run lint` → 0 errors; `npm test` → PASS. Manual: filter Discover by "College Societies & Clubs"; open a society call → chip in detail + apply.

- [ ] **Step 9: Commit**

```bash
git add src/components/DiscoverView.tsx src/components/FeaturedOpportunities.tsx src/App.tsx src/components/OpportunityDetailModal.tsx src/components/ApplyModal.tsx src/components/ThreadModal.tsx
git commit -m "feat: surface college societies across the artist portal"
```

---

### Task 10: Wire the realtime subscription (the refresh bug)

**Files:**
- Modify: `src/App.tsx` (import ~:54-61, effect ~:450-490)

**Interfaces:**
- Consumes: `subscribeOpportunities` (Task 6), the publication row from Task 3 (requires the SQL re-paste before it can work at runtime).

- [ ] **Step 1: import** — add `subscribeOpportunities` to the existing `./lib/listings` import list.

- [ ] **Step 2: subscribe + refetch** — inside the effect at ~:450-490, after the `subscribeApplications` line:

```ts
      // A call published by another session only exists in the DB — refetch on every event.
      const refetchOpportunities = () => {
        fetchOpportunities().then((r) => {
          if (active) setOpportunities(r.data);
        });
      };
      const unsubscribeOpps = subscribeOpportunities(refetchOpportunities);
```

Change `onWake` to:

```ts
      const onWake = () => {
        if (document.visibilityState !== 'visible') return;
        refetchApplications();
        refetchOpportunities();
      };
```

Add `unsubscribeOpps()` to the effect cleanup alongside `unsubscribe?.()`.

- [ ] **Step 3: Verify**

Run: `npm run lint` → 0 errors; `npm test` → PASS. Runtime (after the Task 13 SQL re-paste): publish from a second browser profile → appears in the first within ~2s with no reload.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "fix: publish new opportunities live to open artist tabs"
```

---

### Task 11: Copy tweaks

**Files:**
- Modify: `src/components/PortalGateway.tsx` (~:159, ~:165)
- Modify: `src/components/Sidebar.tsx` (~:56)
- Modify: `src/components/Header.tsx` (~:319)

- [ ] **Step 1: edits**
  - Gateway card title `Host & Venue` → `Hosts, Venues & Clubs`
  - Gateway subtitle `Organiser & Venue Portal` → `Organiser Portal`
  - Sidebar nav label `Venue Profile` → `Organiser Profile`
  - Header menu item `Venue Profile` → `Organiser Profile`

- [ ] **Step 2: guard the E2E contract** — do **not** change `+ Register Cultural Venue` (`PortalGateway.tsx`), `+ Sign up as new Artist`, or `Sign In to Organiser Portal`.

- [ ] **Step 3: Verify** — Run: `npm run lint` → 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/PortalGateway.tsx src/components/Sidebar.tsx src/components/Header.tsx
git commit -m "copy: include college clubs in host portal wording"
```

---

### Task 12: E2E updates (mandatory fields, society signup, realtime)

**Files:**
- Modify: `.e2e/acceptance.py`

- [ ] **Step 1: extract publish helpers** — after the `sign_in` function:

```python
def open_post_modal(page):
    page.get_by_role("button", name="Post Production Call").click()
    page.wait_for_selector('input[placeholder*="Monsoon Classical"]', timeout=10000)


def publish_call(page, title):
    open_post_modal(page)
    page.fill('input[placeholder*="Monsoon Classical"]', title)
    # negative: title alone must NOT publish now
    page.get_by_role("button", name="Publish Call").click()
    page.wait_for_selector("text=Some required fields are missing", timeout=10000)
    check(True, "publish blocked while required fields are empty")
    page.fill("#post-venue", "E2E Auditorium")
    page.fill("#post-city", "Pune, Maharashtra")
    page.fill("#post-start-date", "2026-12-05")
    page.fill("#post-description", "E2E call description for the acceptance run.")
    page.locator('img[alt="Auditorium Stage"]').click()
    shot(page, "post_modal_required")
    page.get_by_role("button", name="Publish Call").click()
    page.wait_for_selector("text=Publish Call", state="detached", timeout=30000)
    page.wait_for_selector(f"text={title}", timeout=20000)
    check(True, f"published call appears in Manage Calls: {title}")
```

- [ ] **Step 2: phase B — society signup + badge, then publish** — in `phase_b`, after `open_signup(page, "+ Register Cultural Venue")` and before `fill_signup`:

```python
    page.click("#signup-org-type-society")
    page.fill("#signup-college-name", "E2E University of Testing")
```

after `wait_for_portal(page, "Post Production Call")`:

```python
    page.get_by_text("Organiser Profile").first.click()
    page.wait_for_timeout(1500)
    body = page.inner_text("body")
    check("College Society" in body and "E2E University of Testing" in body,
          "society badge shows on organiser profile")
    page.get_by_text("Overview").first.click()
    page.wait_for_timeout(1000)
```

Then replace the inline publish block (the old lines that fill the title and click `Publish Call` once) with `publish_call(page, CALL_TITLE)`.

- [ ] **Step 3: phase F — realtime, two contexts** — add this function and call it from `main()` after `phase_e(page)`, before `browser.close()` (phase E leaves the artist signed in on `page`):

```python
def phase_f(browser, artist_page):
    print("PHASE F: publish reaches an open artist tab without a reload", flush=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page2 = ctx.new_page()
    page2.set_default_timeout(20000)
    page2.goto(BASE)
    page2.wait_for_load_state("networkidle")
    wait_app_loaded(page2)
    sign_in(page2, "organiser")
    wait_for_portal(page2, "Post Production Call")
    live_title = f"E2E Live Call {TS}"
    open_post_modal(page2)
    page2.fill('input[placeholder*="Monsoon Classical"]', live_title)
    page2.fill("#post-venue", "Live Auditorium")
    page2.fill("#post-city", "Delhi, India")
    page2.fill("#post-start-date", "2026-12-20")
    page2.fill("#post-description", "Realtime acceptance call.")
    page2.locator('img[alt="Auditorium Stage"]').click()
    page2.get_by_role("button", name="Publish Call").click()
    page2.wait_for_selector("text=Publish Call", state="detached", timeout=30000)
    # artist tab: NO reload — realtime must deliver it
    artist_page.get_by_role("button", name="Home").first.click()
    appeared = True
    try:
        artist_page.wait_for_selector(f"text={live_title}", timeout=15000)
    except Exception:
        appeared = False
    check(appeared, "new call appears in the artist tab without a reload")
    shot(artist_page, "realtime_live_call")
    ctx.close()
```

- [ ] **Step 4: Run the suite**

Run: `python .e2e/acceptance.py` (dev server on :3000 + schema re-pasted)
Expected: `ALL PHASES PASSED`.

- [ ] **Step 5: Commit**

```bash
git add .e2e/acceptance.py
git commit -m "test: e2e cover required fields, society signup and live publishing"
```

---

### Task 13: Verification & deploy

- [ ] **Step 1:** `npm run lint` → 0 errors.
- [ ] **Step 2:** `npm test` → all suites pass (incl. `postForm.test.ts`).
- [ ] **Step 3:** Re-paste `supabase/schema.sql` into the Supabase SQL editor **twice** — second run must be error-free (idempotency proof; adds columns, `NOT NULL`s, realtime publication).
- [ ] **Step 4:** `python .e2e/acceptance.py` → `ALL PHASES PASSED`.
- [ ] **Step 5:** Manual smoke: society signup → badge → publish → artist tab shows it live; artist sees chip, home section, Discover filter.
- [ ] **Step 6:** Final commit if anything drifted.

## Self-review result
- **Spec coverage:** A→Tasks 2,4,5; B→Tasks 1,3,6,7; C→Task 13; D→Tasks 6,8,9; E→Tasks 3,6,10; copy→Task 11; checks→Tasks 12,13. No gaps.
- **Placeholders:** none — every code step carries concrete code.
- **Type consistency:** `OrganiserType`, `PostFormFields`/`PostFormErrors`, `subscribeOpportunities(onChange: () => void): () => void`, `OpportunityInput`, `ensureArtistThread({..., organiserType?})`, and every E2E selector/id string match across tasks.
