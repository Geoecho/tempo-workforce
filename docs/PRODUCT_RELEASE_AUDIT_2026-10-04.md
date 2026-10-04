# Tempo product and release audit — 4 October 2026

Scope: repository review, desktop browser checks, Expo diagnostics and local tests. Production planning migrations and the scheduled push worker were activated and verified through the Supabase CLI. Auth email settings, signed mobile builds, physical-device performance and store accounts remain unverified. This is a release plan, not a declaration that Tempo is ready to submit.

## Implemented in this pass

- Desktop worker profile: aligned summary and editing columns, grouped status/contact statistics, role tags and tasks, with more space for the form.
- Individual and bulk shift removal now archive records. The Shifts screen exposes Removed shifts with site, date, hours and Restore. Existing assignments, recurring-series identity and attendance survive restoration. Records permanently deleted by older versions cannot be recovered through this feature.
- Notification rendering starts with 30 rows, with View more. Sorting, unread filtering and grouping are memoized; group arrays are built without repeated copying; shift availability uses a lookup set. All/Unread keeps its spring indicator but no longer remounts and fades the whole inbox. Opening Notifications skips the heavy full-screen entrance animation. Actual phone frame-rate improvement remains to be measured.
- Create shift supports several time slots per day, each with separate worker assignments, repeated across the selected date range. One save creates the full set. Checks reject inactive workers, missing assignments, invalid times, overlapping slots for one worker, and conflicts with existing active schedules on any date in the series.
- Home has one attendance action: Scan to clock in/out. Worker identification is in mobile Settings under Worker ID for managers, with a clear explanation that it does not record attendance.

## Example: a month at Netaville

Choose Netaville once, select the start/end dates and repetition, then configure three daily slots, for example 06:00–12:00, 12:00–18:00 and 18:00–23:00. Assign different workers to each slot. A 30-day range creates 90 dated shifts, each with its own attendance. Adjacent shifts can share a worker; overlapping shifts cannot. An earlier end time now finishes the next day. Cross-day conflicts and availability are checked locally and by the new database migration. Site code issuance, punches and paid breaks support continuing across midnight.

## Follow-up implementation

- Saved sites and daily-slot templates reduce repeated setup. Starting from a worker profile preselects that person; each slot uses the same searchable person/team selector.
- This occurrence / future dates / all dates edits target the same daily slot and preserve recorded occurrences. Copy previous week previews the affected shifts and creates a separate series; individual-worker copying includes only that worker.
- Staffing requirements show coverage gaps. Availability and approved leave prevent new conflicting assignments, including overnight overlap. Existing shifts affected by leave are flagged for reassignment rather than silently removed.
- Workers can request leave or attendance corrections. Admin review requires a note; approved corrections audit originals and revoke the previous time approval.
- Time & pay separates scheduled, recorded, payable and approved hours. Pay CSV includes reviewed, closed records only. Monthly pay remains an estimated hourly equivalent using contracted monthly hours, not a finalized payroll accrual policy.
- Shared saves expose saving/failure states and retry. Creating shifts waits for server confirmation before leaving the form.
- Archives show five records initially, with View more in increments of five. Removed shifts can still be restored.
- Native onboarding explains notifications before the OS prompt, offers Not now, and permits retry from Settings. Camera/location/photo/calendar access remains contextual. Remote token registration and a server push queue/receipt worker are implemented; the production worker is deployed and scheduled calls return HTTP 200. Physical-device delivery and native push credentials remain unverified.
- New copy is translated in Macedonian and Albanian. Desktop template creation was verified through the UI.

See `PLANNING_AND_PUSH_DEPLOYMENT.md` for server activation, delivery checks and backup/monitoring verification. Display-only site access and a client crash-monitoring service remain follow-up items.

## Must resolve before store submission

| Priority | Missing or unverified work | Acceptance criterion |
| --- | --- | --- |
| P0 | Public signup and password reset email delivery | Create and recover accounts for unrelated email addresses on the production service. The earlier Resend sandbox restriction is a server configuration issue; reverting the client does not remove it. |
| P0 | Account deletion | A working in-app deletion initiation flow and a public web request path, with documented handling of records that must be retained. This is currently absent. |
| P0 | Privacy, support and store disclosures | Publish accurate privacy/support pages; complete Apple privacy details and Google Data safety; explain camera, location, calendar and photo access. The business/controller identity and retention decisions must be supplied by the owner. |
| P0 | Production builds and signing | `eas.json` currently contains only an internal preview profile. Add production and submit configuration; verify Apple/Google accounts and signing. The build warns that `ios.appleTeamId` is missing for the Watch target. Include Watch only after a signed-device test. |
| P0 | Production database and migrations | Security-hardening, shared tasks and planning migrations are now applied to the intended project; existing workspace records were preserved. Test admin/worker boundaries, invitation acceptance, tasks, restoration and conflict failures against a staging project. |
| P0 | Real-device acceptance | Test signed iPhone and Android builds: scanning, denied permissions, notification tabs with large inboxes, background/resume, weak network, time recording, localization, dark mode, reduced motion and screen readers. |
| P0 | Release web verification | Test the deployed HTTPS build, direct links and reloads, public welcome, auth redirects, invite/reset flows, mobile Safari, camera access and security headers. Local export does not verify deployed behavior. |

## Highest-value product work next

| Journey | Improvement | Why it matters |
| --- | --- | --- |
| Admin plans a month | Reusable sites and daily-slot templates | Save Netaville's entrance, pin and three-slot pattern once, then reuse it. |
| Admin changes a roster | Edit this occurrence / future occurrences / whole series; duplicate a week; availability and leave | A monthly plan should not require editing 90 records individually. |
| Admin fills shifts | Coverage requirements, unfilled-slot warnings and worker conflict explanations with names/dates | Knowing a conflict exists is less useful than seeing exactly who and when. Frontend checks also need server enforcement for concurrent admins. |
| Worker starts work | Clear arrival instructions and permission help, then a receipt with site, time and running status | Users should understand what was recorded and how to fix a failed scan. |
| Worker spots a mistake | Request attendance correction with reason and manager review | A missed checkout must have a transparent recovery path rather than silent editing. |
| Admin approves pay | Separate scheduled, recorded and approved hours; export reviewed pay; define monthly-salary accrual | Estimated pay must not appear to be a finalized payroll amount. |
| Both use weak networks | Explicit Saving / Saved / Failed states and recoverable retries | Current optimistic workspace writes need clear confirmation; do not present an unsynced action as final. |
| Worker misses a change | Push delivery for newly assigned/changed shifts while the app is closed | Current reminder logic is local scheduling, not a complete remote-push service. |
| Admin runs an entrance | Site-bound display-only access and device status | Public tablets should not hold an unrestricted admin session. |
| Support investigates | Crash/error monitoring, backups with a restore drill and an admin audit trail | A production workforce product needs supportable operational evidence. |

## Measured local checks

- Expo Doctor: 21/21 checks passed.
- Production web export succeeded. Its primary JavaScript bundle is approximately 5 MB before transfer compression: review initial loading and defer heavy scanner/chart/animation code where possible.
- Typecheck and lint passed; one existing WatchSync hook dependency warning remains.
- Automated tests additionally cover overnight conflicts, series edit boundaries, weekly copies, leave privacy, audited correction review and push queue isolation/coalescing. Desktop profile and multi-slot controls were checked in the browser.
- Store listing screenshots, descriptions, age/content ratings, reviewer access and Android testing eligibility still need verification in the actual store accounts.

## Official release references

- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play user data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
