# Admin Usage Dashboard

## Feature Name
Admin Usage Dashboard

## Goal
Give the site owner a private admin view of how many people use Story Teller, recent growth, and AI activity—without leaving the app or querying Supabase manually.

## User Story
As the Story Teller owner/admin, I want to see total users, recent sign-ups, active users, and AI generation volume so I can understand adoption and usage trends.

## Functional Requirements
1. Add admin-only route at `/admin/usage`.
2. Use `isUsageAdminUser()` for access control (owner email only — not `BLOG_ADMIN_USER_IDS`).
3. Display aggregate metrics: total registered users, new users (7d / 30d), active users (7d / 30d), total stories, total AI generations, AI generations (7d).
4. Show a table of the 15 most recent sign-ups (email + date).
5. Page is server-rendered; no public API exposure of metrics.
6. Add nav link **Usage Admin** visible only to the site owner.

## Data Requirements
- Read from `auth.users` (registration counts and recent sign-ups).
- Read from `public.stories` (total stories, active users by `updated_at`).
- Read from `public.credit_transactions` (AI debit counts, active users by debit activity).
- No new tables for v1.

## User Flow
1. Admin signs in and clicks **Usage Admin** in the nav.
2. Page loads aggregate stats and recent sign-ups.
3. Non-owners are redirected to dashboard with denied message.

## Acceptance Criteria
- `/admin/usage` is accessible only to `nicolas@hartmanns.net`.
- Metrics reflect live database counts.
- Owner/test accounts listed in `lib/admin/usage-excluded-accounts.ts` are excluded from all user counts and the recent sign-ups list (content and AI totals are unaffected).
- Recent sign-ups list shows email and created date.
- Nav shows **Usage Admin** for the owner only.

## Edge Cases
- Empty database shows zeros, not errors.
- Users in `auth.users` without `public.users` profile still count toward registration totals.
- DB query failure shows a friendly error on the page.

## Non-Functional Requirements
- Page should load in under 2s for typical dataset sizes.
- Do not expose other users’ story content—emails only in recent sign-ups list.
