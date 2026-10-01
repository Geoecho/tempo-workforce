# Tempo Workforce

Tempo schedules crews at sites, records QR based check-ins, and gives admins a monthly view of estimated pay. It runs as an Expo app on iOS and Android and as a responsive web app at [tempo-workforce.vercel.app](https://tempo-workforce.vercel.app/).

## How work moves through Tempo

1. An admin creates a workspace, then creates teams and worker profiles.
2. In **More → Invite worker**, the admin links a worker profile to an email and shares the join instructions. The worker creates their own account, confirms their email, and signs in. Admin and worker permissions are separate. Each role has a short introduction before sign-up, followed by the account → workspace/invitation → ready steps. Password recovery is available from Sign in.
3. In **Shifts → New shift**, the admin chooses a site, meeting point, time, and workers. **Site pin** accepts latitude/longitude or a Maps link containing coordinates; an admin physically at the site can also choose **Use my position** and preview the pin before saving. The pin is optional. Workers see the meeting point and can tap **Get directions to site** from the shift page. A shift can be **One day**, **Every day**, or **Weekdays** through a chosen end date (up to 31 calendar days). Repeating creates a separate shift for each date; the Shifts screen groups a series by month and shows seven days at a time when expanded. An admin can change an individual day, including its pin, later. Create another series for a different site or schedule.
4. At the site, an admin opens that day's shift and taps **Display site QR code**. The live code refreshes about every 30 seconds. Workers use **Scan** on their own signed-in phones. A scan alternates check-in and check-out; a 45-second cooldown prevents accidental immediate repeats. The shift page shows who is on site and the clock history. While checked in, a worker can start and end a **paid break**. Admins can see who is on break and the break history. Breaks do not reduce estimated pay. A worker who is still checked in gets a local reminder near the scheduled shift end; the reminder does not check them out automatically.
5. **Shifts → History** shows finished shifts. Open one to see its team and check-in/check-out records; export the history as CSV. Removed shifts with clock records remain archived for audit.
6. **Time & pay** starts on the current month. Use the arrows to review earlier months. The monthly estimated total comes from dated daily records; admins review or undo approval on each day and export a CSV named for that month. Payable time is capped at 10 hours per worker per day. Raw extra time remains visible for review. Tempo calculates estimates; it does not pay workers or replace a payroll system.

Admins can add or change a worker's profile photo when creating or editing that worker. Tempo crops and compresses it before saving it with the shared worker profile; team members see the photo in their workspace.

The **Add to calendar** action opens the native calendar event editor on iOS and Android. On web, browser support varies and an `.ics` calendar file is offered.

## Site QR display

Start with a powered iPad or Android tablet on a stable stand, connected to Wi-Fi or cellular data. An admin chooses today's exact site and shift before any code appears, checks the meeting point or opens its map, then keeps that code on screen at the entrance. Use the device's kiosk or single-app setting. For a larger fixed entrance display, a small computer such as a Raspberry Pi can run the web app in kiosk mode on a monitor. The screen must stay online because the code expires; a printed QR code will not work. Today the QR screen requires an admin account, so do not leave an admin-signed-in device unattended. A restricted display-only role and device registration are required before a broad unattended rollout.

## Apple Watch companion

The **More → Watch preview** screen is an interactive design preview on phone or web. The native SwiftUI companion source is in `targets/watch/`. It shows the worker's next shift or check-in state using the paired iPhone's latest data. Its button requests the iPhone scanner; the worker still scans the site QR with the phone. The Watch does not record time itself.

The watch target uses `@bacons/apple-targets` and the iPhone bridge uses `@plevo/expo-watch-connectivity`. These are native modules, so **Expo Go and the web deployment cannot install or test the Watch app**. A new iPhone + Watch native build is required. The native companion has not yet been compiled or tested on physical devices from this Windows workspace.

### Test on a paired iPhone and Apple Watch using a Mac

1. Install current Xcode on the Mac, sign in with your Apple ID in **Xcode → Settings → Accounts**, and pair the iPhone and Watch in Apple's Watch app. Xcode must support the iPhone's iOS and the Watch's watchOS (the test device here is an Apple Watch SE 3 on watchOS 26.6).
2. Clone this repo on the Mac and run `npm install`.
3. Create `.env.local` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the Supabase project. Do not put a service-role key in the app.
4. Run `npx expo prebuild -p ios --clean` on the Mac. The plugin generates `ios/` from `app.json` and `targets/watch/`; do not edit generated native files as the source of truth. The plugin may warn about a missing `ios.appleTeamId` until signing is configured in Xcode. You can find your Personal Team ID there and add it to `app.json` before regenerating.
5. Open the generated `.xcworkspace` in Xcode. Select your **Personal Team** for both the Tempo iPhone app and its Watch target under **Signing & Capabilities**. If Xcode reports the bundle identifier is taken, change `ios.bundleIdentifier` in `app.json` to one unique to your Apple ID, then regenerate. A free Personal Team may have signing restrictions or short-lived provisioning; if Xcode cannot sign both targets, Apple Developer Program membership is required.
6. Choose the paired iPhone/Watch run destination and build from Xcode. Install and launch Tempo on iPhone, sign in as an invited worker, then open Tempo on the Watch. Verify that the next shift appears and **Scan on iPhone** opens the scanner or gives a notification to tap. Check in by scanning the live site QR displayed on a second device.

The current native source and connectivity API are prepared for that test, but the install and two-device communication remain unverified until this Xcode run succeeds.

## Run locally

```bash
npm install
npx expo start
```

Press `w` for the web build, or scan Expo's development QR with Expo Go on a phone. Native-only features, including Watch connectivity, require a development/native build. If `.env.local` is absent, Tempo uses local demo data on that device; that demo is not shared across devices and demo QR codes do not provide production security.

For a real shared workspace, configure the two public Supabase variables above and apply the SQL in `supabase/` in date order to the project. The publishable key can be shipped to clients; never add a service-role key to client code. Supabase sign-in and database policies enforce account roles, invitations, QR issuance, punches, and approvals.

The paid-break feature needs `supabase/20260930_paid_breaks.sql`. It stores break events separately from clock punches, applies the workspace's admin/worker permissions, and allows break changes only to the checked-in worker assigned to today's shift.

To check the app before shipping:

```bash
npx expo lint
npx tsc --noEmit
npm run build:web
```

Vercel deploys the connected Git repository to the production web URL. For local deployment management, install the [Vercel CLI](https://vercel.com/docs/cli) with `npm i -g vercel`.

## Current limits

- Repeating shifts are generated one month at a time. Editing or removing one day does not change the other days in that series.
- Pay is estimated from recorded punches and the hourly rate captured at check-in. Payroll export is for review and transfer to a payroll system; it does not handle taxes, overtime rules, leave, or disbursement.
- The Watch uses paired iPhone connectivity and has no independent QR scanner. Physical Watch installation and phone-to-watch messaging still need the Mac/Xcode test above.
- A permanently unattended QR display should use a restricted site-display role; current QR display access is admin-only.
- Site pin entry supports coordinates, coordinate-bearing Maps links, and the admin device's current position. It does not include address search or a draggable map pin; worker directions open the device's map app or browser. If there is no pin, directions search for the meeting point and site name.
- The shift-end reminder is local to the worker's signed-in device. It requires notification permission, the app's shift data to be current, and device notifications to be enabled. Leaving a site is not monitored yet. Reliable geofence reminders require an opt-in background-location native build and on-site testing; they should prompt the worker to review their status, never change a time record automatically.
- A fixed NFC site tag can open the app or scanner on supported phones. A plain NFC URL is copyable and is not proof of physical presence, so it must not record a check-in by itself. Secure tap-to-clock would need tamper-resistant dynamic tags and server verification, alongside the existing account and shift checks.

See [brand/README.md](brand/README.md) for Tempo's visual identity.
See [docs/SHIP_READINESS.md](docs/SHIP_READINESS.md) for the release, privacy, and security review.

In **More → Appearance**, choose System, Light, or Dark. The preference is saved on this device; it does not change the rest of the workspace.
