# Stories vs Style Guide Usage

## Feature Name
Stories vs Style Guide Usage

## Goal
The usage admin page already shows how many stories and AI generations exist, but not whether customers actually use **stories**, **style guides**, or **both**. This feature adds owner-only metrics that split adoption between those two products so you can see which customers use which, and how many sit in each group.

## User Story
As the Story Teller owner, I want to see how many customers create stories vs style guides (and how many do both), so that I know which product people are actually using.

## Functional Requirements
1. Keep the existing owner-only `/admin/usage` page; do not add a new public or customer-facing analytics surface.
2. Add a **Stories vs style guides** section with these counts (excluding owner/test accounts from **user** counts, same as today):
   - **Users who created a story** — distinct `user_id` on `public.stories`
   - **Users who created a style guide** — distinct `user_id` on `public.style_guides`
   - **Users who created both** — intersection of the two sets
   - **Users who created stories only** — story users minus style-guide users
   - **Users who created style guides only** — style-guide users minus story users
   - **Users who created neither** — counted registered users minus anyone in either set
3. Add volume cards next to the existing “Total stories created”:
   - **Total style guides created** — `COUNT(*)` on `public.style_guides`
   - **Stories that used a style guide** — `COUNT(*)` on `public.stories` where `style_guide_id IS NOT NULL`
4. Add 7-day activity cards so recent use is visible, not only lifetime totals:
   - **Users who created/updated a story (7 days)** — distinct `stories.user_id` with `created_at` or `updated_at` in the last 7 days
   - **Users who created/updated a style guide (7 days)** — distinct `style_guides.user_id` with `created_at` or `updated_at` in the last 7 days
5. Split existing AI generation totals so story AI vs style-guide AI is visible:
   - **Story AI generations** — credit debits whose `reason` is story-related (`story_generate`, `hook_preview`, `scene_generate`, and other non-`style_analyze_*` reasons)
   - **Style guide AI generations** — credit debits whose `reason` starts with `style_analyze_`
   - Keep the existing blended **Total AI generations** / **AI generations (7 days)** cards unchanged
6. Access control stays `isUsageAdminUser()` (owner email only). No new tables, public APIs, or customer-visible stats.
7. Postgres, Supabase fallback, and the `get_usage_admin_stats` RPC must all return the new fields so the page still loads when pooling is down.

## Data Requirements
Reuse existing tables; no new tables or columns.

| Source | Used for |
|--------|----------|
| `public.stories` (`user_id`, `created_at`, `updated_at`, `style_guide_id`) | Story users, story volume, stories that applied a guide, 7-day story activity |
| `public.style_guides` (`user_id`, `created_at`, `updated_at`) | Style-guide users, style-guide volume, 7-day style-guide activity |
| `public.credit_transactions` (`type`, `reason`, `created_at`) | Split AI generations (story vs `style_analyze_*`) |
| `auth.users` + `USAGE_METRICS_EXCLUDED_EMAILS` | User-set denominators (neither / only / both) |

Draft, active, and archived style guides all count as “created.” Deleted rows do not.

## User Flow
1. Owner signs in and opens **Usage Admin** (`/admin/usage`).
2. Existing Users and Content & AI sections still load.
3. A new **Stories vs style guides** section shows:
   - How many customers created stories, style guides, both, only one, or neither
   - How many stories and style guides exist, and how many stories applied a guide
   - How many customers were active on each product in the last 7 days
   - How AI credits split between story generation and style-guide analysis
4. Non-owners are still redirected to the dashboard with the denied message.

## Acceptance Criteria
- `/admin/usage` remains accessible only to `nicolas@hartmanns.net`.
- The page shows distinct user counts for: stories, style guides, both, stories only, style guides only, and neither.
- `users who created both + stories only + style guides only + neither` equals **Total registered users** (after excluded accounts).
- Total style guides and stories-that-used-a-style-guide are visible and match live DB counts.
- 7-day story-user and style-guide-user cards match distinct users with create/update activity in that window.
- Story AI vs style-guide AI counts sum to (or are clearly labeled as a subset of) total AI debit generations.
- Owner/test emails in `lib/admin/usage-excluded-accounts.ts` are excluded from user-set metrics; content volume (story/guide row counts) follows the same rule as today’s total stories (not filtered by owner).
- Empty database shows zeros, not errors.
- Query failure still shows the existing friendly error and zeroed stats, including the new fields.

## Edge Cases
- A user who created a style guide but never a story counts as **style guides only**.
- A user who created a story without attaching `style_guide_id` still counts as a **story user**.
- A story with `style_guide_id` set counts toward **Stories that used a style guide** even if the guide was later deleted (orphaned FK / null depending on DB behavior — count current non-null `style_guide_id` only).
- Users with only credit activity and no story/guide rows still count as **neither** for this section (they remain in existing active-user metrics).
- Duplicate style guides (copied) still count as created rows and as that user using style guides.
- Public share views (`/g/[token]`) are **out of scope** for v1 — this feature measures create/use in-app, not anonymous viewers.

## Non-Functional Requirements
- Page should still load in under 2s for typical dataset sizes (single aggregated query / RPC, not N+1).
- Do not expose other users’ story or style-guide content; counts only.
- Do not add third-party analytics; keep metrics on the existing admin page.
