# Tempo release readiness

This is a working release checklist, not a certification or a legal opinion. Tempo is **not ready for an iOS or Android store submission** until the launch blockers below are resolved and tested on real devices.

## What works now

- Separate admin and worker accounts, invitation-based worker access, email confirmation, and password recovery.
- Shared Supabase workspace state with server-side role checks for clock actions and time approvals.
- Teams, worker profiles, profile photos, single and repeating shifts, monthly grouping of repeating shifts, site pins, directions, and calendar actions.
- Short-lived server-issued site QR codes, worker phone scanning, check-in/out history, paid breaks, and estimated time and pay exports.
- Local shift reminders, haptics and sounds where supported, and an Apple Watch companion source and preview. The physical Watch build remains unverified.
- System, Light, and Dark appearance modes saved per device. Native tab icons now use the Lucide Animated artwork and motion patterns, but the physical iOS animation still needs a device check.

## Site display design

1. Admin creates a shift with a clear site name, entrance or meeting point, and optional exact pin. A site record shared across shifts would avoid entering the same details repeatedly.
2. Admin selects **Site QR**, chooses today's exact shift, checks the site and meeting point, then displays the rotating code on a powered device at that entrance. No code is shown until a shift is selected from the general Site QR action.
3. Assigned workers scan with their signed-in phones. The backend checks the worker, workspace, assignment, shift day, token expiry, and scan cooldown. The admin can review arrivals on the shift page.
4. Before installing an unattended tablet, add a **display-only role** bound to one site/device, enrollment and revocation, session expiry, and a device-status screen. Do not use an admin session in public view. Test screen wake, Wi-Fi loss, clock drift, and QR contrast at the physical entrance.
5. A photographed live QR can be shared while valid. The QR alone cannot prove physical presence. If stronger assurance is needed, evaluate a privacy-conscious proximity check with explicit worker notice and a manual exception process. Do not silently collect continuous location.

## Launch blockers

| Priority | Work | Why it matters |
| --- | --- | --- |
| P0 | Publish a real privacy notice in the app and at a stable public URL. Name the legal controller, contact, purposes, legal bases, data categories, retention, recipients, transfer safeguards, and rights process. | North Macedonia's personal-data law requires transparent information when data is collected. App stores also require an accessible policy. |
| P0 | Implement account-deletion initiation inside the app and a public web request path. Define what happens to employment time records that must be retained, and document the retention basis. | Apple and Google Play require deletion paths for apps with account creation. |
| P0 | Define the business entity, support/privacy contact, retention schedule, and controller/processor responsibilities with each customer. Review the notice and worker monitoring practices with counsel in North Macedonia. | These facts cannot be inferred from source code or filled into a truthful policy automatically. |
| P0 | Replace admin sessions on public QR displays with least-privilege display accounts before unattended deployment. | An unlocked admin account would expose workforce and pay data at the entrance. |
| P1 | Run cross-workspace/role tests against a disposable Supabase project, including all security-definer RPCs, and commission an independent penetration test before claiming a professional security audit. | Code inspection cannot prove authorization boundaries or absence of exploitable flaws. |
| P1 | Review dependency advisories. `npm audit --omit=dev` reported 18 advisories on 2026-10-01, including one high advisory through the Watch target's XML tooling. Do not apply `npm audit fix --force` because it proposes incompatible Expo versions; verify patched upstream releases and update compatibly. | The advisory report is a signal, not proof that the running app is exploitable; the build toolchain still needs review. |
| P1 | Define backup/restore, incident response, access review, admin MFA, and rate limits for authentication and high-volume operations. | Workforce and pay records need operational controls beyond app UI. |
| P1 | Test iOS and Android signed builds on real devices, including scanner, notification permission, background/foreground recovery, weak network, keyboard, localization, and accessibility. | A working web or Expo Go preview does not verify store builds. |
| P1 | Add the Apple signing Team ID when available and build the Watch companion from a Mac with a paired device. | The current Expo config warns that `ios.appleTeamId` is missing; the physical Watch build has not been verified. |
| P1 | Check Light, Dark, and System appearance on physical iPhone and Android devices, including the keyboard, date picker, QR display, and reduced motion setting. | Web previews and bundle exports cannot prove native rendering or animation timing. |

## Product improvements after the launch blockers

1. Add reusable **Sites** with saved entrance, map pin, and display-device assignment. A shift would select a saved site, so admins do not repeatedly type the same location.
2. Give a recurring series its own detail page with **edit future days**, **pause**, and **end series** actions. The current monthly grouping organizes the list, while each dated shift is still edited separately.
3. Add a calendar view and filters for site, team, worker, and status. Keep the grouped list as the quick overview.
4. Add a dedicated arrival board for each site, including expected, on site, on break, and checked out counts. The shift page already shows individual status.
5. Audit contrast and touch targets in both themes with real users, especially small labels, QR displays in bright light, and the worker scanning path.

## Privacy-policy facts to decide

- Legal business name, postal address, support address, and privacy contact.
- Whether Tempo is the controller for worker records, a processor for employers, or both in different contexts; the agreement with workspace customers.
- Exact retention periods for accounts, photos, location pins, shift history, punches, breaks, payroll exports, notifications, and logs, including any employment-law basis for retained records.
- Supabase and Vercel processing locations, subprocessors, international-transfer basis, and breach-notification responsibilities.
- Whether location is ever collected beyond an admin's one-time site-pin action. Background worker geofencing is not implemented and should have a separate impact assessment before any rollout.
- How users request access, correction, export, and deletion, and how an employer resolves disputed clock records.

## Sources for the release review

- [North Macedonia Personal Data Protection Agency: current law](https://azlp.mk/en/pdpa/regulations-and-documents/laws/) and [English translation, especially Articles 9, 17–18, 37–39](https://azlp.mk/wp-content/uploads/2022/12/lpdp_2020.pdf).
- [Apple: account deletion in apps](https://developer.apple.com/support/offering-account-deletion-in-your-app/) and [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
- [Google Play: user data policy](https://support.google.com/googleplay/android-developer/answer/10144311) and [account-deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111).
