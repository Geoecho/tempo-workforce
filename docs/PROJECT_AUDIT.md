+# Tempo Workforce: project scope, completeness, and Supabase capacity

**Audit date:** 2026-10-02  
**Repository reviewed:** Tempo Workforce, Expo SDK 57  
**Purpose:** Make the current product and its limits visible so you can decide what to keep, revise, add, defer, or remove.

> **2026-10-07 update:** This audit is a dated baseline. Later code added shared tasks, proof photos, work requests, correction audits, and more SQL scripts. See the current [optimization plan](OPTIMIZATION_PROPOSAL.md) and the [migration order](SECURITY.md#applying-the-database-migration) before using its inventory or local test results for a launch decision.

> **Decision summary:** Tempo is a useful event and shift-workforce MVP: it covers schedules, QR attendance, worker profiles, estimated time/pay, messaging, and exports across mobile and web. The web export, lint, and type checks pass locally. I would treat the current Supabase Free setup as a pilot/demo backend, not yet as a dependable long-term system for paid customers: shared data and old punches sit inside one JSON workspace record, and every active client asks for three full snapshots every 12 seconds. The UI’s “archive” is a hide/restore flag; it does not free database or bandwidth quota. Before a wider rollout, address snapshot transfer, photo placement, backup/retention, account deletion/privacy, and real-project role tests.

The companion [data-loading and sync optimization proposal](OPTIMIZATION_PROPOSAL.md) turns the snapshot and storage findings into a code-focused, staged improvement plan.

## Reading the status labels

- **Implemented:** code and/or SQL for the feature exists.
- **Partial:** the main path exists, but an important delivery, platform, or operational piece is missing.
- **Unverified:** the code exists, but this workspace cannot prove it works on a real device or connected Supabase project.
- **Idea only:** documentation or release notes mention the idea, but there is no complete user-facing implementation.

## Project at a glance

| Area | Current state |
|---|---|
| Product | Scheduling and attendance for crews working at venues, events, and other sites |
| Clients | Expo/React Native for iOS and Android; React Native Web export and Vercel configuration |
| Native reach | Camera/QR scanning, calendar, location, notifications, image selection, audio/haptics; native iOS Watch companion source |
| Backend | Supabase Auth, Postgres, RPC functions, Realtime for messages; client uses the public publishable key |
| Shared data shape | One `tempo_workspaces.state` JSONB document per workspace holds most profiles, teams, shifts, and punches |
| Local/demo data | AsyncStorage-backed device demo; it is not a shared workspace and should not be confused with online mode |
| Repository size of scope | 79 files under `src`, 20 route/layout files, five SQL scripts, one test file |
| Monetization | No subscription, payment, invoicing, or customer billing flow found |
| Current readiness | Useful MVP foundation; not a verified payroll/compliance product or tested production service |

## Technology map

| Layer | What the repository uses | Practical consequence |
|---|---|---|
| App shell | Expo SDK `~57.0.26`, React Native `0.86.3`, React `19.2.3`, TypeScript `~6.0.3`, Expo Router | Shared route tree with platform-specific screen implementations. Expo’s SDK 57 reference pairs SDK 57 with React Native 0.86 and React 19.2.3. |
| UI | React Native/Web, Lucide icons, SVG, Reanimated/Worklets, Motion on web | Consistent mobile-first UI, but the exported web JavaScript bundle is substantial; native binary size was not measured. |
| Device features | Expo Camera, Calendar, Location, Notifications, Image Picker/Manipulator, Audio, Haptics; community DateTimePicker | These need device permission handling and real-device checks. Expo Go is not a full substitute for native builds, especially for Watch connectivity. |
| Auth and data | `@supabase/supabase-js`; Google OAuth and PKCE in the current client; Postgres RPCs and row-level security | The app sends the publishable client key. Authorization is primarily implemented inside database functions rather than direct client table writes. Older deployed clients may still offer email/password. |
| Watch | SwiftUI source under `targets/watch/`, `@bacons/apple-targets`, `@plevo/expo-watch-connectivity` | Apple Watch work is iOS-only and currently unverified on a signed build and paired physical devices. |
| Web deploy | Expo web export, `vercel.json`, static output in `dist` | Export succeeds locally; a successful export does not prove the live Vercel deployment or native apps are healthy. |
| Dependency install | npm with committed `package-lock.json` | `npm ci` is the repeatable install path. The install emitted deprecation notices; see the existing ship-readiness document for its earlier dependency-advisory note. |

## Complete feature inventory

The table includes shipped screens and the important behavior they expose. “Useful?” is a product judgment based on the app’s stated audience, not usage analytics.

| Screen/module | Current behavior | Status and usefulness | Review |
|---|---|---|---|
| Welcome and marketing | Product landing page, role-specific onboarding, English/Macedonian/Albanian UI language choices | Implemented; useful for acquisition and first-use explanation | Keep; validate translations with users and verify the published website content. |
| Sign up and sign in | Google OAuth; existing members enter their workspace; users without membership choose Employee or Admin after authentication; web callbacks handled during auth startup | Web deployed and Google login verified; new account chooser has component tests; native verification remains | Verify existing-account linking and invited workers, then disable the server Email provider after older clients are retired. Add in-app account deletion. |
| Workspace and invitation | Admin creates one workspace; saves a worker invitation by email; worker confirms email and joins; instructions are manually shared | Partial; essential | Keep; the app does not send the invite email itself. Add resend/revoke/expiry and a clearer acceptance path if needed. |
| Home | Admin overview of upcoming work; worker’s next shift and estimated daily pay | Implemented; useful daily landing screen | Keep. |
| Schedule and history | Upcoming list, monthly grouping, seven-day expansion, finished shifts, history CSV | Implemented; core | Keep; add filters and a true calendar only if target users need them. |
| Create/edit shifts | One-off, daily, or weekday recurrence through at most 31 calendar days; assignment by worker; edit one dated shift at a time | Implemented with series limitations | Keep; improve series-level edit/pause/end actions. Repetition creates separate shift records. |
| Site and meeting point | Free-text event/site and meeting point; optional coordinates or coordinate-bearing Maps link; one-time current-position pin; directions link | Partial; useful | Keep; saved reusable Sites and address search are absent. |
| Worker roster and teams | Search, team grouping, add/edit profiles, phone, role, hourly rate, photo, archive/restore | Implemented; core | Keep; confirm who may see pay/contact details in the live database with role tests. |
| Profile photos | Cropped/compressed JPEG, 160×160; maximum base64 length 60,000 characters; saved inline in the workspace JSON | Implemented, inefficient storage location | Move photo bytes out of the JSON row and load only when needed. |
| Shift detail and attendance board | Assigned team, check-in/out and break status, event/punch history; admin can edit or remove shifts when allowed | Implemented; core | Keep; add an explicit correction/dispute flow for mistaken punches. |
| QR display and scan | Admin issues a server-side UUID token that expires after 35 seconds; worker scans the changing code; server checks workspace, worker assignment, shift date and archive state; server applies a 45-second punch cooldown | Implemented; key differentiator | Keep. QR display still needs an admin session and has no restricted display-only role. |
| Paid breaks | Worker records start/end during an active assigned shift; break events stored in a separate table; counted as paid time | Implemented | Keep if paid-break handling fits the customer’s actual policies. |
| Time and estimated pay | Monthly review; actual/payable time; hourly rate captured at check-in; estimated pay; 10-hour payable cap per worker/day; excess remains visible | Implemented as an estimate | Keep with explicit limits. It does not calculate tax, statutory overtime, leave, payroll or payments. |
| Time approval | Admin approves or undoes daily worker approval; new punches clear approval for that day | Implemented | Keep; add an audit/correction path and test concurrent admin changes. |
| Messages | Admin/worker direct or broadcast messages; message search/read state; Supabase Realtime wakes clients to reload the message list | Implemented | Useful for a single workspace; add pagination and retention. Message history currently has no cap. |
| Notifications | Shift assignment/change/removal records; admin clock-in notices derived from punches; local inbox read/dismiss state; device-local reminders | Partial | Keep, but do not describe it as guaranteed push delivery. Device-local notifications depend on app data/permissions and have no server push provider. |
| Calendar export | Native calendar editor on iOS/Android; web `.ics` fallback where available | Implemented, platform behavior varies | Keep; verify physical-device permissions. |
| CSV exports | Shift history and month-level estimated pay export | Implemented; useful operational handoff | Keep; exports are not a direct payroll integration. |
| Appearance and language | System/light/dark; device-local preference; English (US), Macedonian, Albanian; 22 currency labels for workspace pay display | Implemented | Keep; test contrast and localized dates/currency on devices. Currency selection relabels rates; it does not convert them. |
| Local demo mode | Seed workspace, role switching, QR simulation, local persistence | Implemented for exploration | Keep for demos. Do not treat it as shared/cloud data or secure attendance. |
| Apple Watch | Interactive preview plus SwiftUI companion source that mirrors a paired iPhone’s latest worker state and requests scanning on iPhone | Partial/unverified | Keep as experimental; defer marketing or relying on it until signed native build and paired-device tests pass. The Watch does not scan or record time independently. |
| Settings | Workspace name, currency, local theme/language, invitation, account/sign-out, local demo controls, restore archived worker/shift records | Implemented with gaps | Add privacy, deletion, retention/export, and customer-admin controls before commercial rollout. |
| Web shell/PWA metadata | Web-specific welcome page, HTML shell, favicon and manifest; Vercel rewrite/export configuration | Implemented | Keep; browser QA and production deployment checks still needed. |

### Route-by-route index

| Route/file | Purpose |
|---|---|
| `src/app/_layout.tsx` | Theme, language, feedback, store, navigation, reminder and Watch-sync providers |
| `src/app/+html.tsx` | Web document shell |
| `src/app/index.tsx` | Role-aware home dashboard |
| `src/app/welcome.tsx` / `welcome.web.tsx` | Mobile onboarding and web landing experience |
| `src/app/start.tsx` | Auth entry routing |
| `src/app/schedule.tsx` | Upcoming shifts and history |
| `src/app/new-shift.tsx` / `edit-shift/[id].tsx` / `shift/[id].tsx` | Create, edit and inspect shifts |
| `src/app/team.tsx` / `new-worker.tsx` / `worker/[id].tsx` | Roster, add worker and worker profile |
| `src/app/pass.tsx` / `scan.tsx` | Admin QR display and worker scanner |
| `src/app/time.tsx` | Monthly hours, estimated pay, approvals and CSV |
| `src/app/notifications.tsx` / `messages.tsx` | Inbox and team chat |
| `src/app/settings.tsx` | Workspace, invite, account, language, theme, currency and demo controls |
| `src/app/watch-preview.tsx` | Interactive Watch concept preview |

### Ideas that are not implemented product features

The repository documents or suggests a display-only QR role, reusable sites, series management, calendar filters, a full calendar, geofence reminders, address search/draggable maps, secure NFC clocking, and a native Watch test. These are **ideas or known gaps**, not working features. A printed/static QR or plain NFC URL would not prove the worker is physically present.

## What the code stores and how it syncs

### Supabase structure

The SQL scripts create these tables:

- `tempo_workspaces`: workspace owner/time zone/version and the large `state` JSONB document.
- `tempo_members`: account-to-workspace role and worker association.
- `tempo_invites`: invited worker email and profile association.
- `tempo_qr_tokens`: short-lived QR tokens.
- `tempo_notifications`: shift-change notifications.
- `tempo_time_approvals`: daily approvals.
- `tempo_break_events`: break start/end events.
- `tempo_messages`: message body, sender, target and one read timestamp.

Workers, teams, shifts, site details, archived flags, profile photo strings, and punches are **not** separate relational tables today. They are arrays/objects inside `tempo_workspaces.state`. Breaks, messages, approvals, notifications, tokens, memberships, and invites are separate tables.

The online store calls `tempo_snapshot`, `tempo_break_snapshot`, and `tempo_messages_snapshot` together on initial load and again every 12 seconds while the app is mounted. The admin receives the whole workspace snapshot. A worker receives their own profile, assigned shifts, and punches, but still receives all matching history. Break and message snapshots also return full histories. A message Realtime event reloads the full message list.

Admin changes replace the workspace JSON document with optimistic version checking. Punches append to that same document, and punch functions lock the workspace row while inspecting punch history. This is simple for a prototype and convenient for atomic whole-workspace state, but cost per refresh and work per write increase with the amount of history. A busy organization also funnels punch writes through one workspace row lock.

There is no Supabase Storage upload path in the app. Profile photos are base64 data URLs embedded in the JSON state, so they count toward Postgres database size and get resent in full snapshots. Messages and break events live in tables, but both snapshot RPCs return all available rows with no pagination/retention cutoff.

### Static security observations

Good signs in the checked SQL: RLS is enabled on the listed tables; direct access is revoked for sensitive tables; functions use an empty `search_path`; and most privileged operations are exposed through authenticated RPCs with server-side membership/assignment checks. QR validation and clock timestamps are server-side.

This is a **code review**, not a security test. No connected project was available to verify that all SQL was applied in the expected order, policies behave as intended, cross-workspace reads/writes are blocked, or RPCs resist abuse. The existing [ship-readiness review](SHIP_READINESS.md) correctly lists disposable-project role tests, security review, account deletion, privacy notice, backups, and display-only QR access as outstanding work.

### Deployment and maintenance gaps

The app README asks an operator to paste the five timestamped SQL scripts into Supabase in order. They are not under the normal `supabase/migrations/` path, and this checkout has no Supabase local project/config. That makes applied schema state easy to drift between development and production. Convert them into a tracked migration sequence and test applying it to a clean disposable project before relying on it.

No `EXPO_PUBLIC_SUPABASE_URL`/publishable key is configured locally; only `.env.example` exists. I did not connect to or change a live Supabase project.

## Supabase Free plan: limits, failure mode, and runway

These are the published Supabase plan values checked on **2026-10-02**. Plan details change; confirm them in the organization’s dashboard before making a launch or pricing decision.

| Free-plan item | Current published allowance | Relevance to Tempo |
|---|---:|---|
| Postgres database size | 500 MB per project; projects go read-only above the database quota | Most likely storage hard stop: shifts, punches, messages, and inline photos occupy database space. The included 1 GB disk does not raise the 500 MB database quota. |
| Postgres compute | Shared CPU and 500 MB RAM | JSON array scans, full snapshots, and serialized workspace-row writes compete for a small shared database resource; no benchmark was available. |
| Storage | 1 GB | Currently unused by this app. Could hold profile images, but storing archives here still counts as Supabase cloud storage. |
| Bandwidth/egress | 5 GB uncached + 5 GB cached (separate quotas; 10 GB combined) | Treat dynamic RPC JSON as uncached and budget against its 5 GB quota until the live usage page confirms actual cache classification. |
| API request count | Unlimited API requests | This is not a compute or bandwidth guarantee; the database still has shared CPU/RAM, egress and size limits. |
| Monthly active users | 50,000 | Not the first likely limit for a small workforce tool. |
| Realtime | 2 million messages/month; 200 peak connections | Current Realtime use is messages only. The 12-second RPC polling is not Realtime traffic; many open client sessions may reach the connection ceiling first. |
| Edge Functions | 500,000 invocations | No Edge Function is used by the current app. |
| Projects | Two active Free projects per organization | Relevant if you want separate production/test projects; both still share org-level quota where applicable. |
| Backups | Free projects do not get the Pro daily-backup retention benefit | Supabase recommends Free users make regular off-site database exports. Storage objects are not included in a database backup. |

Supabase documents low-activity pausing based on insufficient database activity over a 7-day period. It is not a fixed “dies after exactly seven days” timer. A paused project can be restored through Studio for up to one year; after that, recovery requires downloading available backup/database and Storage material before project deletion. Exceeding Free quotas triggers notice/grace handling; continued overuse can bring service restrictions such as read-only database, paused projects, or API `402` responses. These are availability risks for a live timekeeping product, even when there is no overage bill on Free.

Sources: [Supabase plan quotas and billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [Free project pausing and restore window](https://supabase.com/docs/guides/platform/free-project-pausing), [database size/read-only behavior](https://supabase.com/docs/guides/platform/database-size), [bandwidth and egress](https://supabase.com/docs/guides/storage/serving/bandwidth), [uncached/cached egress quotas](https://supabase.com/docs/guides/platform/manage-your-usage/egress), [backup recommendations](https://supabase.com/docs/guides/platform/backups), [quota restrictions](https://supabase.com/docs/guides/platform/billing-faq).

### A practical bandwidth estimate for the current poller

One poll cycle calls three RPCs every 12 seconds:

- 5 cycles/minute, or 300/hour.
- At an 8-hour workday over 22 days: **52,800 cycles per active client/month**, or **158,400 RPC calls** (three per cycle).
- Bandwidth is approximately `cycles × (combined bytes returned by the three RPCs)`.

This is a scenario model, **not a measurement**. It assumes the app stays open for the stated hours and all returned bytes are uncached.

| Combined response from the three snapshots per cycle | One active client, 8h/day × 22 days | Five such clients | Ten such clients |
|---:|---:|---:|---:|
| 10 KB | ~0.53 GB/month | ~2.64 GB/month | ~5.28 GB/month |
| 25 KB | ~1.32 GB/month | ~6.60 GB/month | ~13.20 GB/month |

A small team could fit the Free bandwidth allowance while snapshots are tiny. As old punches, breaks, messages, and photos accumulate, the same polling pattern transfers more bytes every cycle. A single max-sized profile data URL can be about 60 KB of base64 text in each admin snapshot; 50 such photos alone could add roughly 3 MB to every admin response before the rest of the workspace. Native backgrounding may suspend mobile timers, but the code does not implement a deliberate “stop polling while inactive” policy, and a web tab can remain open.

### “How long until it dies?”

There is no honest fixed lifetime without a live baseline. Two independent clocks matter:

1. **Activity:** low database activity can lead Supabase to pause a Free project.
2. **Usage:** the database becomes read-only beyond 500 MB; bandwidth and other sustained quota overages can also trigger restrictions.

Use the organization’s actual trend rather than a guessed number:

- Database runway (months) = `(500 MB − current database size) ÷ measured monthly growth`.
- Bandwidth runway depends on remaining monthly quota and current uncached GB/day; it resets by billing cycle but continued over-quota usage can still result in restrictions.
- Message traffic and peak Realtime connections should be tracked separately.

For arithmetic only, from an empty database and before reserving safety space, growth of 5 MB/month reaches 500 MB in 100 months; 20 MB/month in 25 months; 50 MB/month in 10 months. Those are **not Tempo forecasts**. The poller can cause a bandwidth incident well before the database reaches 500 MB. Keep a working headroom target (for example, start planning at 350–400 MB rather than waiting for 500 MB) and use observed usage to set an alert/archive threshold.

The fastest way to replace this model with a real answer is to record several weeks of: database size and growth, combined snapshot response size, uncached egress, active foreground sessions, Realtime connection peak/messages, largest workspace state size, and average messages/breaks/photos per workspace.

## Archive plan that actually frees capacity

The current “Archived records” controls only set `archived: true` and hide a worker or shift from active lists. Data remains in the same JSON snapshot, still consumes Postgres storage, and is still sent in snapshots. **Soft-archiving does not extend Free-plan runway.**

A sensible staged approach:

1. **Agree on retention first.** Decide how long live schedules, punches, approvals, breaks, messages, photos, and account data must remain available. Employment and privacy rules/customer contracts may set different periods; the code cannot decide this policy.
2. **Normalize growing data.** Move shifts, assignments, punches, breaks, approvals, messages, and photos into independently queryable records. Keep dashboard reads scoped to the selected month/current schedule. Add pagination for history and messages. This removes old data from repeated current-state payloads even before deletion.
3. **Move photos separately.** Store one current avatar in a private object bucket with workspace-scoped authorization, keep only its object key in the worker row, and fetch it on demand. Set a strict size/type limit. Supabase Storage reduces database-row and snapshot pressure, but its bytes still count against the Free Storage and egress quotas.
4. **Export closed event groups.** Archive by workspace plus year, event/site, or month. Include shift, assignment, punch, break, approval and payroll-summary records that must be retained, along with a schema version, export date, record counts, and a checksum. Encrypt the package and restrict it to authorized workspace admins.
5. **Choose where cold files live.** A customer download or customer-owned/offsite object store actually removes that archive from Supabase’s limits. Supabase Storage is simpler and reduces Postgres pressure but still uses Supabase cloud quota. Keep only a small archive index/summary in the live database when the archive is elsewhere.
6. **Verify before pruning.** Confirm the archive can be opened and restored, then delete or detach eligible old records from the live database according to the agreed retention policy. Keep a documented restore path and audit log. Do not delete original time records just to stay on Free without an approved retention/export plan.

Postgres partitions can make date-based maintenance easier, but attached partitions still consume database storage. They only reduce hot database usage after old partitions/data have been exported or moved and removed from the live database. Supabase’s partitioning guide also cautions that partitioning adds complexity; normalize and paginate first, then partition if measured performance or retention operations justify it.

## Can the app make money?

No revenue mechanism exists in the checked source: there is no subscription, billing, payment, or in-app purchase integration. The feature value that could support a paid offer is operational: event-based shift assignment, site QR attendance, manager review, worker hours/pay visibility, and CSV handoff.

The numbers below are **illustrative gross-revenue arithmetic**, not market research, a forecast, or a recommended price. At a placeholder **€29 per paying workspace per month**:

| Paying workspaces | Gross monthly recurring revenue | Gross annualized revenue |
|---:|---:|---:|
| 1 | €29 | €348 |
| 10 | €290 | €3,480 |
| 50 | €1,450 | €17,400 |
| 100 | €2,900 | €34,800 |

Actual net income would be lower after taxes/VAT, payment or app-store fees, hosting, support, sales, refunds, and owner time. Supabase currently lists Pro at **$25/month** with included compute credits; that is a technical hosting reference, not the total cost of operating a business. The most useful next step is to validate willingness to pay with a few event organizers before building billing.

A plausible first pricing experiment is per workspace with a worker/active-shift ceiling, then a higher tier for more workers, multi-site reporting, exports/retention controls, and operational support. Avoid promising payroll compliance, a watch app, or legally sufficient retention until those parts are actually delivered and verified.

## Local completeness checks

| Check | Result | What it proves / does not prove |
|---|---|---|
| `npm ci --no-audit --no-fund` | Passed after a Windows permissions issue on the first normal install; 911 packages installed from the lockfile | Reproducible dependencies installed. Install showed deprecation notices. |
| `npm run lint` | Passed | Expo ESLint reports no current lint errors. |
| `npx tsc --noEmit` | Passed | The TypeScript project type-checks. |
| `npm run build:web` | Passed; exported to `dist` | Web bundle compiles. Export emitted a 4.8 MB main JS bundle (plus 45 KB and 2.7 KB chunks, before browser transfer compression). Expo also warned that `ios.appleTeamId` is missing; that may prevent signed iOS/Watch builds. |
| Pay-calculation tests | 2 passed, 0 failed, using a local TypeScript-stripping harness | Covers two `paySummary` cases only: daily cap math and rate-at-check-in. The repository has no `test` script; direct stock Node execution cannot resolve the TypeScript/TSX import. A temporary `tsx` install was blocked by registry DNS, so the harness isolated the pure data module without changing tracked files. |
| Live Supabase tests | Not run | No local URL/key or connected project. RLS, all RPCs, SQL ordering, quotas, latency and concurrent writes remain unverified. |
| iOS/Android/Watch physical tests | Not run | No signed native build/device verification from this Windows checkout; Watch requires the Mac/paired-device path in the user guide. |
| Browser interaction/e2e | Not run | The static export succeeded; no automated route or end-to-end test suite exists. |

The web main JavaScript bundle is a meaningful payload for a mobile-first product. Review its production compressed transfer size and first-screen load on a mid-range phone. The local export is not a native APK/IPA size measurement.

## What to keep, revise, add, and defer

### Keep

- Shift creation, assignments, QR-based clock-in/out, worker roster, attendance history, and manager approval.
- Estimated hours/pay with rates captured at clock-in, transparent excess-time display, and CSV export.
- Shared worker/admin accounts, paid breaks if customer policy needs them, simple team messaging, and native calendar handoff.
- Demo mode, accessibility labels, translations, responsive web, and consistent theme choices.

### Revise before relying on it for customers

1. Replace the workspace-sized JSON snapshot for high-growth records with normalized, indexed tables and scoped queries.
2. Replace the fixed 12-second full-history refresh with change-driven updates or shorter scoped queries; stop/reduce polling when inactive. Paginate messages, breaks, and history.
3. Move base64 profile images out of database state and avoid re-downloading them in every admin snapshot.
4. Add a real archive/export/restore lifecycle and explicit retention policy; soft archive alone is only a display state.
5. Put the timestamped SQL files into a formal migration workflow and test clean install plus upgrade paths.
6. Decide how managers correct mistaken punches and how workers dispute time without silently rewriting audit history.

### Add before production/customer launch

- Published privacy notice, controller/contact and retention decisions, in-app account deletion/request flow, and a tested data export/delete process.
- Off-site backups and a restore rehearsal; access review, admin MFA decision, rate limits, and operational alerts.
- Disposable Supabase integration tests covering admin/worker/other-workspace reads and writes, invitation abuse, QR expiry/replay, simultaneous clock scans, approvals, and message recipients/read receipts.
- A least-privilege QR display account for unattended tablets.
- A working billing/customer-plan boundary only after pricing validation.

### Defer or keep explicitly experimental

- Public Apple Watch claims until signed install and iPhone/Watch communication pass on hardware.
- Background geofencing, NFC clocking, full payroll, address search, and advanced scheduling until core storage, retention, privacy, and authorization are tested.

**Nothing in the current codebase is an obvious remove-now feature.** If you want to narrow scope, the Watch target and marketing/preview work are the clearest candidates to pause while the core shift/attendance product is made dependable.

## References inside the repository

- [User guide and deployment notes](../README.md)
- [Release, privacy, and security review](SHIP_READINESS.md)
- [Main domain and pay logic](../src/lib/data.ts)
- [Online Supabase synchronization](../src/lib/online-store.tsx)
- [Supabase SQL scripts](../supabase/)
- [Local pay tests](../tests/pay.test.mjs)

## External references

- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
- [Supabase pricing](https://supabase.com/pricing)
- [Supabase database partitioning](https://supabase.com/docs/guides/database/partitions)

