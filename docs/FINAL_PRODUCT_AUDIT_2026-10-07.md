# Tempo final-product audit — 7 October 2026

## Verdict and scope

Tempo has a substantial working core, but it is **not release ready or proven secure end to end**. This review inspected the current Expo client, SQL migrations, push worker, optional gateway, release configuration, and existing tests. It ran local unit, database, gateway, type, lint, and dependency checks. It did **not** change the live Supabase project, inspect its current settings, restore a backup, run a signed phone build, or conduct a penetration test. Existing customer data must be preserved throughout any migration.

The earlier `PRODUCT_RELEASE_AUDIT_2026-10-04.md` is historical. The table below is the current decision list. Priority means release impact, not a claim that an exploit was demonstrated.

| Priority | Finding | Evidence | Release condition |
| --- | --- | --- | --- |
| P0 | No in-app account deletion or public deletion path, privacy/support pages, or defined retention policy | No deletion flow or privacy/support route in `src/`; `docs/SHIP_READINESS.md` | Owner supplies controller/support details and retention decisions; build truthful public pages and deletion workflow, including retained employment records |
| P0 | Existing-user Google account migration is not fully verified | Google-only client deployed on 7 October; one production Google sign-in completed and opened a workspace | Verify invited workers, existing-user identity linking and MFA, and retire the server Email provider after users have verified Google access |
| P0 | Public site QR display requires an admin session with broad access | `src/app/pass.tsx`, `tempo_issue_qr` in `supabase/20261004_planning_workflows.sql`; `docs/SHIP_READINESS.md` | Create a site-bound display role/device with revocation and expiry before unattended display |
| P0 | Production store builds and signed-device acceptance are absent | `eas.json` has preview only; prior release audit records no signed-device proof | Configure production signing, test iPhone and Android on real devices, including push, QR, permissions, offline/reconnect, deep links, accessibility |
| P0 | Live-data-safe migration and recovery proof are incomplete | New `20261007_sync_revisions.sql` is local; prior backup was partial and no restore drill is recorded | Restore a full backup to isolated staging, apply migration there, compare records/totals and run cross-role tests before any live change |
| P1 | Optional gateway rejected current app RPCs | `gateway/src/config.js` had only the original 13 RPCs | **Fixed locally**: allowlist now covers all static client RPCs; a test fails if they diverge. Deploy matching gateway/client together if gateway is used |
| P1 | Google callback originally depended on the sign-in screen being mounted | Root callback could miss code exchange; current startup handles callbacks at `/` and `/start` | **Fixed and deployed** with PKCE startup exchange; production Google sign-in completed, callback code cleared, and workspace opened. Six callback regression tests pass. Current client removes password/recovery UI and disables implicit session detection |
| P1 | Native sessions live in AsyncStorage | `src/lib/supabase.ts` | Threat-model shared/lost devices; migrate native auth session storage to OS-backed secure storage with a no-logout migration plan, then test reinstall, backup/restore, and sign-out |
| P1 | Dependency advisory backlog | Fresh `npm audit --omit=dev` on 7 Oct: 32 findings (1 critical, 17 high, 14 moderate); gateway audit: 0 | Triage reachable paths and update compatible upstream versions; rerun build/tests. Do not accept npm's Expo 44 downgrade suggestion |
| P1 | Four Expo packages lag the SDK's expected patch versions | `expo-doctor`: 20/21 checks pass; image manipulator, linking, notifications, and router are one patch behind | Update with `expo install` in a separate verified dependency change, then rerun doctor, build, and device flows |
| P1 | Important events are not delivered while the app is closed | Notification matrix below | Implement a small set of actionable, private, deduplicated alerts and user preferences; test device delivery/receipt and denial paths |
| P1 | No defined retention/cleanup for notifications, messages, push deliveries, task proof, or audit records | SQL has QR expiry cleanup but no lifecycle jobs for these tables | Set legal retention periods, purge/archive policy, metrics and a staged cleanup migration preserving live records |
| P1 | Current data model will still contend at larger firms | Workspace state, punches, workers, shifts in one JSON row; `tempo_save_snapshot` serializes edits; proof photos are base64 text | Benchmark realistic concurrent firms and normalize hot records incrementally with dual-read/write and rollback proof |
| P1 | No release CI or production incident evidence | No `.github` workflow; current tests are local; deployment/monitoring claims are historical | Add reproducible CI gates, alerting, backup restore drill, incident owner, and independent security test |

## Notification coverage

“Notify for everything” would create noise and expose more workforce detail on lock screens. Use the server inbox as the durable source, and send push only for time-sensitive action. Remote push should carry generic text; details open after authentication. Push is best effort, so the inbox must still work if a phone denies permission or Expo/APNs/FCM is unavailable.

| Event | Current behavior | Recommended behavior |
| --- | --- | --- |
| Shift assigned, changed, removed | Server inbox row and push queue; worker gets a local one-hour shift reminder | Keep; coalesce batch roster edits, provide detail/deep link, test physical delivery |
| Task completed | One server inbox row per admin and push queue; later reopen/recompletion intentionally creates no new row | Keep; verify admin role and repeat behavior on device |
| Worker clock-in | Admin inbox item is derived from punch history and marked read only on that device | Persist server event; optional admin push for late/exception arrival, not every ordinary clock-in by default |
| Clock-out, break started/ended | No server alert | Surface in live arrival board; push only for unresolved missed clock-out or policy exception |
| New private/team message | Message appears in conversations, with no notification row or push | Add recipient-scoped inbox/push with generic lock-screen text, mute and quiet hours |
| Leave or correction request submitted | Request list/home pending count; no push/inbox | Alert workspace admins once; deep link to review |
| Request approved/rejected | Worker sees status when opening Requests; no push/inbox | Alert requester once with neutral lock-screen text and in-app reason |
| Time approval/revocation | Reflected in Time & pay; no alert | Keep as in-app status, or alert only on revocation/dispute |
| Invite, account recovery, sync failure | Email or local UI feedback only | Verify email delivery and failure handling; avoid pushing security codes; make failed writes visible and retryable |

Implementation should add an event type/recipient policy, idempotency key, deep-link target, severity, expiration, localization, and per-user preference. Do not expand `tempo_notifications.kind` until the client and older app versions can handle the new kinds. Cover tenant isolation, duplicate retries, sign-out/token rotation, denied permission, old devices, and quiet hours. `tempo_claim_push` already checks current membership and push receipts, which is a useful base. The scheduled worker previously returned HTTP 200 with zero accepted devices; that does not establish delivery.

## Security review

**Controls observed:** Supabase RLS and RPC authorization, MFA enforcement for enrolled accounts, database write rate limits, invite checks, message visibility, QR expiry/cooldowns, audited attendance corrections, gateway JWT/CORS/rate/body checks, web security headers, and server-only push credentials. Local PGlite tests include worker/admin boundaries and cross-workspace cases. These are meaningful controls, but live roles/settings still require validation. A public publishable key in the client is expected; never place service-role, push, signing, or SMTP credentials in `EXPO_PUBLIC_*`.

**Authentication and sessions.** The current client uses Google OAuth with PKCE and removes legacy password/recovery screens and implicit URL session detection. Callback processing runs during authentication startup. The production deployment and live provider settings still need verification. MFA is optional for admins; require it for firm owners and people who approve pay. Native auth tokens in AsyncStorage are a device-loss concern; OS-backed storage is preferable after migration testing. Confirm Google provider, account linking, allowed redirect URLs, session lifetime, and sign-out on all devices. No claim is made here that the live Email provider is disabled.

**Data access.** Security-definer functions are in the exposed `public` schema but are mostly explicitly granted to `authenticated` and check membership/MFA; the new sync functions do too. Re-run every RPC with anonymous, worker, admin of the same firm, admin of another firm, stale member, and downgraded MFA sessions against a disposable copy. Test direct PostgREST access, not only app controls or gateway rules. Keep the gateway as defense in depth because clients can call Supabase directly with the public key.

**Privacy and devices.** The QR display should not hold an admin session in an unattended entrance. Current local shift reminders include shift title and site on the lock screen; this needs a privacy setting or neutral text for shared phones. Task proof photos and profile photos are inline data; define access, retention, size, and deletion rules. Move large proof images to a private object bucket with authorized short-lived access as part of the scaling work. Watch synchronization also needs a physical paired-device privacy check.

**Web and infrastructure.** `vercel.json` has a restrictive CSP and other headers. Its `connect-src` lists Supabase but no custom gateway origin, so a separately hosted optional gateway would be blocked on a Vercel web build unless that origin is added. Verify headers and redirects on the actual HTTPS deployment, including reset/invite links and mobile Safari. Kubernetes examples require real hosts, secret management, network-policy support, Redis, alerting, and deployment rehearsal; example manifests alone are not proof of production hardening.

**Dependencies.** The npm audit count includes transitive native/build tooling and is not an exploitability assessment of the shipped bundle. The critical `shell-quote` path is through `react-native` → `react-devtools-core`; other high findings include Metro/tooling and `node-forge`. Triage by reachable runtime and build environment, track upstream compatible fixes, and avoid forcing incompatible Expo/React Native downgrades. The gateway's installed lockfile had zero advisories at review time.

## Functionality and scale

- Core journeys exist: account/invite, scheduling and repeat edits, worker profiles, QR attendance, paid breaks, requests/corrections, time review/pay export, messages, tasks, and three languages. The 22 unit tests, 16 database tests, and 12 gateway tests passed locally. Typecheck passed; lint had one existing `WatchSync.tsx` hook warning. These tests do not cover the full UI or phone hardware.
- The new sync-revision migration and client changes reduce repeated full JSON fetches, but they are **not applied to live data**. Existing clients still read workspace JSON and hot writes lock/rewrite a single row. A firm-sized load test must measure database CPU, row lock wait, bandwidth, realtime reconnects, and p95 latency at realistic concurrent worker counts before a capacity claim.
- Notifications and messages return their full history to each eligible client; no pagination or retention is in place. The admin clock-in inbox is reconstructed from all recorded punches. As records grow, both database cost and app memory will rise.
- Task proof is stored as up to 2 MB of base64 text in Postgres. The new compact list avoids downloading each proof on every refresh, but not storage, backup, or write cost.
- The app has demo/local paths and real online paths. Signed-device acceptance must verify that demo data cannot be confused with saved firm data, writes show success/failure accurately, and stale sessions or weak connectivity do not silently discard work.
- `eas.json` only defines an internal preview. Add production profiles, signing, store metadata/screenshots/privacy labels, support contact, crash reporting with a privacy policy, and a release rollback plan.

## Release acceptance sequence (preserve live data)

1. Decide the legal business identity, support/privacy contact, controller role, retention periods, account deletion handling, and unattended QR-display policy. Publish the resulting privacy/support/deletion paths.
2. Take a restorable full backup and restore it to an isolated staging project with outbound email, push Cron, and real device registration disabled. Rehearse the unapplied sync migration there; compare workspace, member, shift, punch, request, task, notification, and audit counts plus payable totals before/after.
3. Run an authorization matrix on that copy, including direct RPC/PostgREST calls, MFA, expired sessions, invitation races, correction review, and cross-firm data. Commission an independent penetration test once flows are stable.
4. Complete the notification policy and device implementation; verify APNs/FCM credentials, denied-permission fallback, push tickets/receipts, duplicate retries, sign-out, and generic lock-screen copy on signed iOS/Android builds.
5. Add production CI and signed builds, then execute real-device and deployed-web acceptance: signup/recovery, shift edit, QR issue/scan, overnight clock-out, request approval, pay export, weak network, app resume, language/theme/accessibility, direct-link reload, and data restore.
6. Benchmark several firm sizes and peak check-in concurrency. Normalize hot data and add lifecycle cleanup only after staging proves that old and new clients preserve every live record.

## Verification performed for this review

- `node --test tests/*.test.mjs`: 22/22 pass.
- `npm run test:db`: 16/16 pass on in-process Postgres with all listed migrations.
- `npm run test:gateway`: 12/12 pass after the allowlist update.
- `npx tsc --noEmit`: pass. `npm run lint`: 0 errors, one pre-existing Watch hook warning.
- `npm audit --omit=dev`: 32 advisories (1 critical, 17 high, 14 moderate); `npm audit --prefix gateway --omit=dev`: 0.
- `npx expo-doctor`: 20/21 checks pass; four SDK 57 patch versions need alignment.
- No signed build, live migration, backup restore, production email delivery, push delivery, or penetration test was performed in this review.

## Reference standards and vendor guidance

- [Supabase RLS and security-definer guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) and [tickets/receipts](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Apple in-app account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/) and [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Expo production builds](https://docs.expo.dev/deploy/build-project/)
