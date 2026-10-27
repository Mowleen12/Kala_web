# Society Post-Form Fields, Artist College Tags, Discover College Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let society organisers record college/fest/students-only context on a call, tag college-student artists everywhere organisers see them, and make Discover's "College Societies & Clubs" pill list every society-hosted call.

**Architecture:** Thin data layers (types → schema → insert/mapper plumbing) feed three UI surfaces: a society-only block in the post form, `StudentTag`/`CollegeOnlyTag` chips exported from the existing `HostTypeTag.tsx`, and one OR-rule change in Discover's category match. Artist college rides `AuthUser.collegeName` into `applications.applicant_college` as a snapshot at apply time.

**Tech Stack:** React + TypeScript + Vite, Tailwind classes, Supabase (Postgres), `tsx --test` unit tests, `tsc --noEmit` lint.

**Spec:** `docs/superpowers/specs/2026-10-27-college-events-tags-design.md`

## Global Constraints

- Run `npm run lint` (tsc --noEmit) and `npm test` (`tsx --test src/lib/*.test.ts`, currently 38 passing) after every task; both green before commit.
- Schema changes are idempotent (`add column if not exists`) and live in `supabase/schema.sql` — user pastes the whole file once after Task 1; no migration runner exists.
- No grant/RLS changes (both tables already have table-wide `select, insert` for `authenticated`).
- No server-side enforcement of "college students only" — display/filter data only.
- E2E-protected copy must not change: `Publish Call`, `Post Production Call`, `+ Register Cultural Venue`, `+ Sign up as new Artist`, `Sign In to Organiser Portal`, `Select Your Workspace to Log In`.
- New element ids (browser tests): `#post-college`, `#post-fest`, `#post-college-only`. Existing ids (`#post-title`, `#signup-college-student`, `#signup-artist-college`, …) must not change.
- Follow existing file style; no new dependencies; no abstractions beyond the two chip components in Task 5.

---

### Task 1: Types + schema columns

**Files:**
- Modify: `src/types.ts` (Opportunity ~line 34, Application ~line 63)
- Modify: `supabase/schema.sql:391` (after `organiser_type` ALTER), `supabase/schema.sql:448` (after applications indexes)

**Interfaces:**
- Produces: `Opportunity.collegeName?: string`, `Opportunity.festName?: string`, `Opportunity.collegeOnly?: boolean`; `Application.artistCollege?: string | null`; DB columns `opportunities.college_name`, `opportunities.fest_name`, `opportunities.college_only`, `applications.applicant_college`.

- [ ] **Step 1: Add the three optional fields to `Opportunity`**

In `src/types.ts`, inside `interface Opportunity`, after `organiserAvatar?: string | null;`:

```ts
  collegeName?: string;
  festName?: string;
  collegeOnly?: boolean;
```

- [ ] **Step 2: Add the snapshot field to `Application`**

In `src/types.ts`, inside `interface Application`, after `artistLocation?: string | null;`:

```ts
  artistCollege?: string | null;
```

- [ ] **Step 3: Add idempotent ALTERs to schema.sql**

In `supabase/schema.sql`, directly after `alter table public.opportunities add column if not exists organiser_type text;` (line 391):

```sql
-- College society context (spec 2026-10-27) — idempotent.
alter table public.opportunities add column if not exists college_name text;
alter table public.opportunities add column if not exists fest_name text;
alter table public.opportunities add column if not exists college_only boolean not null default false;
```

Directly after the applications index block (line 448, `create index if not exists applications_status_idx ...`):

```sql
-- College snapshot of the applicant at submission time (spec 2026-10-27).
alter table public.applications add column if not exists applicant_college text;
```

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts supabase/schema.sql
git commit -m "feat: college/fest/student fields on opportunities and applications"
```

**Note for the user after this task:** paste the full `supabase/schema.sql` into the Supabase SQL editor once (idempotent; a second paste must also run clean).

---

### Task 2: Society validation in postForm (TDD)

**Files:**
- Modify: `src/lib/postForm.ts`
- Test: `src/lib/postForm.test.ts`

**Interfaces:**
- Produces: `PostFormFields.college: string`; `validatePostForm(f: PostFormFields, society?: boolean): PostFormErrors` — when `society` is true and `college` is blank, sets `errors.college`.

- [ ] **Step 1: Write the failing test**

In `src/lib/postForm.test.ts`, add `college: '',` to the `VALID` fixture after `city: 'Mumbai, Maharashtra',`, and append:

```ts
test('society requires a college; venue posts do not', () => {
  assert.ok(validatePostForm({ ...VALID, college: '' }, true).college);
  assert.equal(validatePostForm({ ...VALID, college: '' }).college, undefined);
  assert.equal(validatePostForm({ ...VALID, college: 'IIT Delhi' }, true).college, undefined);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `college` not in `PostFormFields` / wrong argument count (TS error under tsx).

- [ ] **Step 3: Implement**

In `src/lib/postForm.ts`: add `college: string;` to `PostFormFields` (after `city`), change the signature to `validatePostForm(f: PostFormFields, society = false)`, and add one line after the city check:

```ts
  if (society && !f.college.trim()) errors.college = 'College / institution is required';
```

Update the existing doc comment to: `/** Core-7 required fields; honorarium bounds only when "Your own price" is picked. Society posts additionally require the college (spec 2026-10-27). */`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — all 39 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/postForm.ts src/lib/postForm.test.ts
git commit -m "feat: require college on society post forms"
```

---

### Task 3: Opportunity data path (input → insert → mapper)

**Files:**
- Modify: `src/lib/listings.ts` — `OpportunityInput` (~line 187), `createOpportunity` insert (~line 211), `rowToOpportunity` (~line 63)

**Interfaces:**
- Produces: `OpportunityInput.collegeName?`, `.festName?`, `.collegeOnly?`; inserts `college_name`/`fest_name`/`college_only`; `rowToOpportunity` maps them back. Consumed by Task 4.

- [ ] **Step 1: Extend `OpportunityInput`**

Inside `interface OpportunityInput`, after `compensation?: string;`:

```ts
  collegeName?: string;
  festName?: string;
  collegeOnly?: boolean;
```

- [ ] **Step 2: Insert the columns**

In `createOpportunity`'s `.insert({...})`, after `compensation: input.compensation || null,`:

```ts
      college_name: input.collegeName || null,
      fest_name: input.festName || null,
      college_only: input.collegeOnly ?? false,
```

- [ ] **Step 3: Map the columns back**

In `rowToOpportunity`, after `organiserAvatar: r.organiser_avatar || null,`:

```ts
  collegeName: r.college_name || undefined,
  festName: r.fest_name || undefined,
  collegeOnly: Boolean(r.college_only),
```

- [ ] **Step 4: Lint + tests**

Run: `npm run lint; if ($?) { npm test }`
Expected: PASS both.

- [ ] **Step 5: Commit**

```bash
git add src/lib/listings.ts
git commit -m "feat: persist college/fest/college-only on opportunities"
```

---

### Task 4: Society block in PostOpportunityModal + App wiring

**Files:**
- Modify: `src/components/PostOpportunityModal.tsx` (props ~36-41, draft type ~16-30, state ~57-73, draft effect ~76-94, validate call ~130, newOpp ~146, form body after line 323)
- Modify: `src/App.tsx` — `handlePublishOpportunity` (~721-741), `<PostOpportunityModal>` usage (~1296)

**Interfaces:**
- Consumes: `validatePostForm(fields, society)` (Task 2), `OpportunityInput.collegeName/festName/collegeOnly` (Task 3).
- Produces: `PostOpportunityModal` props `society?: boolean`, `collegeName?: string`; ids `#post-college`, `#post-fest`, `#post-college-only`; draft fields `college`/`fest`/`collegeOnly`.

- [ ] **Step 1: Extend props and draft type**

Props interface — after `organizerName?: string;`:

```ts
  society?: boolean;
  collegeName?: string;
```

Destructure — after `organizerName = '',`:

```ts
  society = false,
  collegeName = '',
```

`PostOpportunityDraft` — after `description?: string;`:

```ts
  college?: string;
  fest?: string;
  collegeOnly?: boolean;
```

- [ ] **Step 2: Add state**

After the `description` state:

```ts
  const [college, setCollege] = useState(savedDraft?.college ?? collegeName);
  const [fest, setFest] = useState(savedDraft?.fest ?? '');
  const [collegeOnly, setCollegeOnly] = useState(savedDraft?.collegeOnly ?? false);
```

- [ ] **Step 3: Persist in the draft effect**

Add `college`, `fest`, `collegeOnly` to the `setDraft(DRAFT_KEY, {...})` object (after `description,`) and to the effect dependency array (after `description`).

- [ ] **Step 4: Validate + build the opportunity**

Change the `validatePostForm` call to:

```ts
    const errors = validatePostForm({
      title, category, venue, city, startDate, endDate, description,
      imageUrl: selectedImage, priceChoice, customMin, customMax, college,
    }, society);
```

In `const newOpp: Opportunity = {`, after `requirements: [],`:

```ts
      collegeName: society ? college.trim() || undefined : undefined,
      festName: society ? fest.trim() || undefined : undefined,
      collegeOnly: society && collegeOnly,
```

- [ ] **Step 5: Render the society block**

Immediately after the Category & Deadline `</div>` block (ending ~line 323), before `{/* Venue & City */}`:

```jsx
              {/* College Details — society organisers only */}
              {society && (
                <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EFEBE4] space-y-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">College / Institution <span className="text-[#E45826]">*</span></label>
                    <input
                      id="post-college"
                      type="text"
                      value={college}
                      onChange={(e) => { clearErr('college'); setCollege(e.target.value); }}
                      placeholder="e.g. IIT Delhi"
                      {...inputAria('college')}
                      className={inputCls('college')}
                    />
                    {fieldError('college')}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Fest / Club Name</label>
                    <input
                      id="post-fest"
                      type="text"
                      value={fest}
                      onChange={(e) => setFest(e.target.value)}
                      placeholder="e.g. Rhapsody 2026 / Music Club"
                      className="w-full bg-[#FAF8F5] border border-[#E0D9CD] rounded-xl px-3.5 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-[#E45826]"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700">
                    <input
                      id="post-college-only"
                      type="checkbox"
                      checked={collegeOnly}
                      onChange={(e) => setCollegeOnly(e.target.checked)}
                      className="w-4 h-4 rounded text-[#E45826] focus:ring-[#E45826] border-zinc-300"
                    />
                    Open to college students only
                  </label>
                </div>
              )}
```

- [ ] **Step 6: Wire App**

`handlePublishOpportunity` — inside `createOpportunity({...})`, after `organiserType: currentUser.orgType,`:

```ts
        collegeName: newOpp.collegeName,
        festName: newOpp.festName,
        collegeOnly: newOpp.collegeOnly,
```

`<PostOpportunityModal>` usage — add after `organizerName={organiserProfile.name}`:

```jsx
            society={currentUser.orgType === 'society'}
            collegeName={organiserProfile.collegeName || currentUser.collegeName}
```

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/PostOpportunityModal.tsx src/App.tsx
git commit -m "feat: college details block for society post forms"
```

---

### Task 5: Chip components + event surfaces

**Files:**
- Modify: `src/components/HostTypeTag.tsx` (append two exports)
- Modify: `src/components/DiscoverView.tsx:479-484` (card badge row)
- Modify: `src/components/FeaturedOpportunities.tsx:104-109` (card badge row)
- Modify: `src/components/OpportunityDetailModal.tsx:110-123` (Presented by block)
- Modify: `src/components/ApplyModal.tsx:163-169` (header)

**Interfaces:**
- Produces: `CollegeOnlyTag({ show?: boolean; variant?: 'card' | 'inline' })` — renders `College Students Only` chip or nothing; `StudentTag({ college: string | null | undefined; className?: string })` — renders `College Student • <college>` or nothing. Both exported from `./HostTypeTag`. Consumed by Tasks 7-9.

- [ ] **Step 1: Append the two components to HostTypeTag.tsx**

```tsx
interface CollegeOnlyTagProps {
  show?: boolean;
  variant?: 'card' | 'inline';
}

export const CollegeOnlyTag: React.FC<CollegeOnlyTagProps> = ({ show, variant = 'card' }) => {
  if (!show) return null;
  const cls =
    variant === 'card'
      ? 'px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-xs whitespace-nowrap bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]'
      : 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]';
  return <span className={cls}>College Students Only</span>;
};

interface StudentTagProps {
  college: string | null | undefined;
  className?: string;
}

export const StudentTag: React.FC<StudentTagProps> = ({ college, className = '' }) => {
  if (!college) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] ${className}`}>
      College Student • {college}
    </span>
  );
};
```

- [ ] **Step 2: Discover card badge row**

In `DiscoverView.tsx`, after `<HostTypeTag organiserType={opp.organiserType} />` (line 483):

```jsx
                    <CollegeOnlyTag show={opp.collegeOnly} />
```

Add `CollegeOnlyTag` to the `./HostTypeTag` import.

- [ ] **Step 3: Featured card badge row**

In `FeaturedOpportunities.tsx`, after `<HostTypeTag organiserType={opp.organiserType} />` (line 108):

```jsx
                      <CollegeOnlyTag show={opp.collegeOnly} />
```

Add it to the import.

- [ ] **Step 4: Detail modal Presented by block**

In `OpportunityDetailModal.tsx`, after `<HostTypeTag organiserType={opportunity.organiserType} variant="inline" />` (line 118):

```jsx
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <CollegeOnlyTag variant="inline" show={opportunity.collegeOnly} />
                    </div>
                    {opportunity.festName && (
                      <p className="text-[11px] text-zinc-500 mt-1">Fest / Club: {opportunity.festName}</p>
                    )}
                    {opportunity.collegeName && (
                      <p className="text-[11px] text-zinc-500">College: {opportunity.collegeName}</p>
                    )}
```

Only render the wrapping `<div>` when `opportunity.collegeOnly` is true — simplest correct form:

```jsx
                    {opportunity.collegeOnly && (
                      <div className="mt-1">
                        <CollegeOnlyTag variant="inline" show />
                      </div>
                    )}
```

Use that instead of the always-rendered div. Add `CollegeOnlyTag` to the import.

- [ ] **Step 5: Apply modal header**

In `ApplyModal.tsx`, after the `HostTypeTag` span (line 167-169):

```jsx
          <span className="ml-2 inline-block align-middle">
            <CollegeOnlyTag variant="inline" show={opportunity.collegeOnly} />
          </span>
```

Add `CollegeOnlyTag` to the `./HostTypeTag` import (it already imports `HostTypeTag`).

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/HostTypeTag.tsx src/components/DiscoverView.tsx src/components/FeaturedOpportunities.tsx src/components/OpportunityDetailModal.tsx src/components/ApplyModal.tsx
git commit -m "feat: college-only chip and fest/college detail lines"
```

---

### Task 6: collegeName auth plumbing (sign-up drops it today)

**Files:**
- Modify: `src/components/CreateAccountModal.tsx` — three `onSuccess({...})` payloads (~lines 133, 181, 229)
- Modify: `src/App.tsx` — `handleSignUpSuccess` param type (~547) and `newUser` build (~560)

**Interfaces:**
- Produces: `handleSignUpSuccess` accepts `collegeName?: string`; `AuthUser.collegeName` populated after sign-up (sign-in/Google paths already carry it).

- [ ] **Step 1: Add `collegeName` to all three onSuccess payloads**

In each of the three `onSuccess({ ... })` calls in `CreateAccountModal.tsx`, after `avatar: user.avatar,` (third call: after `avatar: user.avatarUrl || user.avatar,`):

```ts
          collegeName: user.collegeName,
```

- [ ] **Step 2: Accept it in App**

`handleSignUpSuccess` param type — after `avatarUrl?: string;`:

```ts
    collegeName?: string;
```

In the `applyStoredProfileName({...})` call, after `avatarUrl: effectiveAvatar,`:

```ts
      collegeName: userData.collegeName,
```

- [ ] **Step 3: Lint + tests**

Run: `npm run lint; if ($?) { npm test }`
Expected: PASS both.

- [ ] **Step 4: Commit**

```bash
git add src/components/CreateAccountModal.tsx src/App.tsx
git commit -m "fix: carry college name from sign-up into the session user"
```

---

### Task 7: Application snapshot + Apply modal badge

**Files:**
- Modify: `src/lib/listings.ts` — `ApplyInput` (~301), `applyToOpportunity` insert (~325), `rowToApplication` (~88)
- Modify: `src/App.tsx` — `handleApplyClick` → `applyToOpportunity({...})` (~684)
- Modify: `src/components/ApplyModal.tsx` — props (~34), Applying-as box (~194), App usage (~1276)

**Interfaces:**
- Consumes: `StudentTag` (Task 5).
- Produces: `ApplyInput.artistCollege?: string | null`; `Application.artistCollege` populated on fetch; `ApplyModal` prop `collegeName?: string`.

- [ ] **Step 1: Extend ApplyInput and insert**

In `interface ApplyInput`, after `fileName?: string | null;`:

```ts
  artistCollege?: string | null;
```

In the `.insert({...})` of `applyToOpportunity`, after `applicant_city: input.artistLocation || null,`:

```ts
      applicant_college: input.artistCollege || null,
```

- [ ] **Step 2: Map it back**

In `rowToApplication`, after `artistLocation: r.applicant_city || null,`:

```ts
    artistCollege: r.applicant_college || null,
```

- [ ] **Step 3: Pass it at apply time**

In `App.tsx` `handleApplyClick`, inside the `applyToOpportunity({...})` call, after `artistLocation: appData.city || null,`:

```ts
      artistCollege: currentUser.collegeName || null,
```

- [ ] **Step 4: ApplyModal prop + badge**

Props interface — after `userEmail: string;`:

```ts
  collegeName?: string;
```

Destructure — after `userEmail,`:

```ts
  collegeName,
```

Import `StudentTag` alongside `HostTypeTag`. In the Applying-as box, wrap the name/email block and add the tag:

```jsx
              <div>
                <p className="text-xs font-bold text-zinc-900">{userName}</p>
                <p className="text-[11px] text-zinc-500">{userEmail}</p>
                <div className="mt-1.5">
                  <StudentTag college={collegeName} />
                </div>
              </div>
```

In `App.tsx`, `<ApplyModal>` usage — after `userEmail={currentUser.email}`:

```jsx
            collegeName={currentUser.collegeName}
```

- [ ] **Step 5: Lint + tests**

Run: `npm run lint; if ($?) { npm test }`
Expected: PASS both.

- [ ] **Step 6: Commit**

```bash
git add src/lib/listings.ts src/App.tsx src/components/ApplyModal.tsx
git commit -m "feat: snapshot artist college on applications, badge in apply modal"
```

---

### Task 8: Artist surfaces (profile badge + applications chip)

**Files:**
- Modify: `src/components/ProfileView.tsx` — props (~40), destructure (~52), header (~232), App usage (~1088)
- Modify: `src/components/ApplicationsView.tsx` — category chip row (~95)

**Interfaces:**
- Consumes: `StudentTag` (Task 5).
- Produces: `ProfileView` prop `collegeName?: string`.

- [ ] **Step 1: ProfileView prop + badge**

Props interface — after `userEmail?: string;`:

```ts
  collegeName?: string;
```

Destructure — after `userEmail = '',`:

```ts
  collegeName = '',
```

Import `StudentTag` from `./HostTypeTag`. After the email `<p>` (the `flex flex-wrap ... gap-3` block ending ~line 232), still inside the `min-w-0` div:

```jsx
              {collegeName && (
                <div className="mt-2">
                  <StudentTag college={collegeName} />
                </div>
              )}
```

In `App.tsx`, `<ProfileView>` usage — after `userEmail={currentUser.email}`:

```tsx
                  collegeName={currentUser.collegeName}
```

- [ ] **Step 2: ApplicationsView chip**

In `ApplicationsView.tsx`, import `StudentTag` from `./HostTypeTag`. In the card's chip row (the `flex flex-wrap items-center gap-2` div starting line 95), after the "Applied on" span:

```jsx
                <StudentTag college={app.artistCollege} />
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProfileView.tsx src/components/ApplicationsView.tsx src/App.tsx
git commit -m "feat: college student tag on profile and application cards"
```

---

### Task 9: Organiser applicant chip + college filter

**Files:**
- Modify: `src/components/OrganiserApplicantsView.tsx` — state (~58), activeFilterCount (~67), reset (~77), filter match (~129), deps (~142), drawer toggle (~388), active tag (~446), card (~567)

**Interfaces:**
- Consumes: `StudentTag` (Task 5).
- Produces: filter state `collegeOnlyFilter` ("College students only").

- [ ] **Step 1: State, count, reset**

After `const [hasReelFilter, ...]` (line 58):

```ts
  const [collegeOnlyFilter, setCollegeOnlyFilter] = useState<boolean>(false);
```

In `activeFilterCount` array, after `hasReelFilter,`:

```ts
  collegeOnlyFilter,
```

In `resetAllFilters`, after `setHasReelFilter(false);`:

```ts
  setCollegeOnlyFilter(false);
```

- [ ] **Step 2: Match + deps**

Before `return matchesOpp && ...` in the `filteredApplicants` memo:

```ts
      const matchesCollege = !collegeOnlyFilter || Boolean(app.artistCollege);
```

Change the return to include it:

```ts
      return matchesOpp && matchesStatus && matchesSearch && matchesExp && matchesCity && matchesRating && matchesReel && matchesCollege;
```

Add `collegeOnlyFilter` to the memo's dependency array (after `hasReelFilter`).

- [ ] **Step 3: Drawer toggle**

Add `GraduationCap` to the `lucide-react` import. Inside the "Quick Toggle Checkbox" div (line 389-402), after the existing label:

```jsx
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700">
              <input
                type="checkbox"
                checked={collegeOnlyFilter}
                onChange={(e) => setCollegeOnlyFilter(e.target.checked)}
                className="w-4 h-4 rounded text-[#E45826] focus:ring-[#E45826] border-zinc-300"
              />
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#E45826]" />
                Show only college students
              </span>
            </label>
```

- [ ] **Step 4: Active filter tag**

After the `hasReelFilter` active tag (line 446-451):

```jsx
          {collegeOnlyFilter && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]">
              <span>College students only</span>
              <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setCollegeOnlyFilter(false)} />
            </span>
          )}
```

- [ ] **Step 5: Card chip**

Import `StudentTag` from `./HostTypeTag`. In the applicant card, after the role/experience `<p>` (line 567-570):

```jsx
                      {app.artistCollege && (
                        <div className="mt-1">
                          <StudentTag college={app.artistCollege} />
                        </div>
                      )}
```

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/OrganiserApplicantsView.tsx
git commit -m "feat: college student chip and filter on applicant cards"
```

---

### Task 10: Discover college page OR rule

**Files:**
- Modify: `src/components/DiscoverView.tsx:117`

**Interfaces:**
- Consumes: `Opportunity.organiserType`, `Opportunity.category` (existing).

- [ ] **Step 1: Replace matchesCat**

```ts
    const matchesCat =
      selectedCategory === 'All' ||
      (selectedCategory === 'College Societies & Clubs'
        ? opp.organiserType === 'society' || opp.category === selectedCategory
        : opp.category === selectedCategory);
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/DiscoverView.tsx
git commit -m "feat: college category pill lists every society-hosted call"
```

---

### Task 11: Full verification (browser harness)

**Files:**
- Create: `verify.html`, `src/verify.tsx` (throwaway — deleted before the final commit)
- Screenshots: temp dir outside the repo or deleted after review

**Interfaces:**
- Consumes: everything from Tasks 1-10.

- [ ] **Step 1: Static checks**

Run: `npm run lint; if ($?) { npm test }`
Expected: PASS — tsc clean, all 39 tests green.

- [ ] **Step 2: Build the harness**

`verify.html` (copy the pattern from a prior session: standard Vite entry that mounts `#root` and imports `/src/verify.tsx` — check `index.html` for the exact script tag and copy it).

`src/verify.tsx` renders three sections on one page:

1. `<PostOpportunityModal isOpen onClose={() => {}} onPublish={async () => ({ ok: true })} organizerName="Music Society" society collegeName="IIT Delhi" />` — assert `#post-college` value is `IIT Delhi`, `#post-fest` and `#post-college-only` exist. Also render a second instance with `society={false}` — assert `#post-college` does NOT exist.
2. `<DiscoverView opportunities={fixtures} appliedIds={new Set()} initialCategory="College Societies & Clubs" onApply={() => {}} onViewDetails={() => {}} />` with three fixtures: `{id:'a', society Music call (organiserType:'society', category:'Music & Dance')}`, `{id:'b', venue Music call (organiserType:'venue', category:'Music & Dance')}`, `{id:'c', venue call category:'College Societies & Clubs'}` — expect cards `a` and `c` visible, `b` hidden. Give each fixture the required `Opportunity` fields (title, categorySlug, statusBadge, location, venue, city, dateRange, compensation, imageUrl, deadline).
3. A static row rendering `<CollegeOnlyTag show />`, `<StudentTag college="IIT Delhi" />`, `<CollegeOnlyTag show={false} />`.

- [ ] **Step 3: Serve and assert**

Run: `python .opencode/skills/webapp-testing/scripts/with_server.py --server "npm run dev" --port 3000 -- python <verify-script>` where the Playwright script (temp file) navigates to `http://localhost:3000/verify.html`, asserts the conditions in Step 2 (count visible Discover cards == 2, input values, chip texts `College Students Only` / `College Student • IIT Delhi`), and screenshots each section.

Expected: all assertions PASS.

- [ ] **Step 4: Delete the harness**

```bash
git status  # confirm verify.html and src/verify.tsx are untracked
Remove-Item verify.html, src\verify.tsx
```

- [ ] **Step 5: Final commit (if any stray changes) + report**

```bash
git status
```

Nothing should be pending beyond what earlier tasks committed. Report to the user: schema paste reminder (Task 1 note) and a manual end-to-end pass (society sign-up → post with all three fields → chip on card/detail; college artist applies → organiser sees chip + filter; Discover college pill).

---

## Self-review (done)

1. **Spec coverage:** A (post-form fields) → Tasks 2-4; B (college tags) → Tasks 5-9; C (Discover) → Task 10; D (schema) → Task 1; verification → Task 11. Out-of-scope items untouched.
2. **Placeholders:** none — every step carries exact code.
3. **Type consistency:** `collegeName`/`festName`/`collegeOnly` (Opportunity + input) and `artistCollege` (Application + input) used consistently across Tasks 1, 3, 4, 5, 7, 8, 9. `validatePostForm(f, society)` matches Task 2 definition and Task 4 call. `StudentTag`/`CollegeOnlyTag` props match every usage site.

