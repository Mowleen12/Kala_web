# Society Post-Form Fields, Artist College Tags, Discover College Page — Design

Date: 2026-10-27
Status: approved

## Problem

1. Society organisers have no way to record which college/club hosts a call
   or whether it is open only to college students — the post form is
   venue-shaped (venue, city, honorarium) and society-specific context is
   lost.
2. Artists who signed up as college students carry no visible tag anywhere
   downstream: organisers cannot spot student applicants, students cannot
   see their own tag, and the apply flow does not surface it.
3. Discover's "College Societies & Clubs" category pill matches strictly on
   `opp.category`, so a society's Music category call never appears there,
   even though the home "Calls from College Societies & Clubs" section
   already uses the wider `organiserType === 'society' || category` rule.

## Decisions (user-approved)

| # | Decision | Alternative rejected |
|---|----------|----------------------|
| 1 | College Details block (College, Fest/Club, students-only toggle) renders only for `orgType === 'society'`; College is prefilled from the account and required. | Showing it to all organisers would burden venue hosts with fields they cannot fill. |
| 2 | College source for artists is `AuthUser.collegeName` (sign-up metadata), snapshotted into `applications.applicant_college` at apply time. | Reading `user_metadata` live at review time would break for Google sign-ups flushed later and couples review to auth state. |
| 3 | `collegeOnly` (event) and `artistCollege` (application) are display + filter data only — no enforcement, no RLS. | Enforcing "college students only" server-side needs an artist `college` column and eligibility checks — deferred. |
| 4 | Discover college pill uses the same OR rule as the home section: `organiserType === 'society' \|\| category === 'College Societies & Clubs'`. | Strict category match (current) hides most society calls; venue-type filter already proved the OR rule. |
| 5 | Schema change is 4 idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements, pasted once by the user. | A migration file needs a migration runner the project does not have. |

## A. Organiser post form — society-only fields

- New `PostOpportunityModal` props: `society: boolean`,
  `collegeName: string` (App passes `currentUser.orgType === 'society'` and
  `organiserProfile.collegeName || currentUser.collegeName`).
- Block rendered after the Category/Deadline row when `society`:
  - `#post-college` College / Institution — prefilled, editable, required.
  - `#post-fest` Fest / Club name — optional.
  - `#post-college-only` checkbox "Open to college students only".
- `validatePostForm` gains optional `society` + `college` inputs; when
  `society` is true an empty college yields the inline error. Unit-tested in
  `src/lib/postForm.test.ts` alongside the existing cases.
- Draft (`kala_draft_post`) stores all three; cleared on publish with the
  rest.
- Data: `Opportunity.collegeName?`, `festName?`, `collegeOnly?` →
  `OpportunityInput` → columns `college_name`, `fest_name`, `college_only`
  → `rowToOpportunity` reads them back.

### Surfaces for the new event fields

- `collegeOnly === true` → `College Students Only` chip (same styling
  family as `HostTypeTag`) on: Discover card badge row, home Featured card
  badge row, detail modal "Presented by", apply modal header.
- Detail modal "Presented by" gains, when present:
  `Fest / Club: <festName>` and `College: <collegeName>` small lines under
  the host tag.

## B. Artist college tags

- **Plumbing fix:** `CreateAccountModal` `onSuccess` payload and
  `App.handleSignUpSuccess` add `collegeName` (currently dropped; sign-in
  and Google paths already carry it).
- **Profile:** `ProfileView` gains optional `collegeName` prop; badge
  `College Student • <college>` under the name/email row when set.
- **Application snapshot:** `ApplyInput.artistCollege` →
  `applications.applicant_college`; `handleApplyClick` passes
  `currentUser.collegeName`; `Application.artistCollege?: string | null`
  read by `rowToApplication`.
- **Chips** `College Student • <college>`:
  - artist's own Applications card (next to the category chip),
  - organiser's applicant card (next to the role line,
    `OrganiserApplicantsView.tsx` ~line 568).
- **Apply modal:** badge in the "Applying as" box from a new
  `collegeName` prop.
- **Organiser filter:** `collegeOnly` toggle in the Filters drawer ("College
  students only"), same pattern as `hasReelFilter` — counted in
  `activeFilterCount`, cleared by `resetAllFilters`, matches
  `Boolean(app.artistCollege)`.

## C. Discover college page

`DiscoverView.tsx` `matchesCat` becomes:

```
selectedCategory === 'All'
  || (selectedCategory === 'College Societies & Clubs'
        ? opp.organiserType === 'society' || opp.category === selectedCategory
        : opp.category === selectedCategory)
```

No other filter changes — the venue-type `society` option already exists.

## D. Schema (user pastes once, idempotent)

```sql
alter table public.opportunities add column if not exists college_name text;
alter table public.opportunities add column if not exists fest_name text;
alter table public.opportunities add column if not exists college_only boolean not null default false;
alter table public.applications  add column if not exists applicant_college text;
```

No grant changes: both tables already have table-wide
`select, insert` for `authenticated`; column-level grants exist only for
`status`/`rating` updates.

## Verification

- `npm run lint` (tsc) and `npm test` (new postForm society cases) after
  every task.
- Throwaway browser harness for: society post-form block + chip on
  published card/detail, profile badge, apply-modal badge, applicant chip,
  college-students-only filter, Discover college pill OR rule.
- After schema paste: publish a society call with all three fields and
  confirm they survive reload; apply as a college student and confirm the
  organiser sees the chip.

## Out of scope (deferred)

- Server-side enforcement of "college students only" (eligibility checks,
  RLS).
- Fest/college chips on the organiser's own listings view.
- Stats or counting of college calls.
- Making `collegeName` editable after sign-up (profile edit surface).
