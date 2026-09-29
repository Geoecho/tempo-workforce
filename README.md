# Tempo

A React Native workforce operations prototype for event crews, factories, warehouses, and field teams. Built with Expo SDK 57 and TypeScript.

## Run

```bash
npm install
npx expo start
```

Open the QR shown by Expo in Expo Go on a phone, or press `w` for the web preview. The camera scanner needs a camera-equipped device and permission. The web preview is useful for the rest of the app.

## Phone web preview

The web build can be deployed to Vercel. Open the resulting HTTPS URL in your phone browser; you can also add it to your home screen. `vercel.json` builds the Expo web bundle and rewrites app routes so links such as `/schedule` work when opened directly.

```bash
npm run build:web
npx vercel --prod
```

## Explore the demo

1. Start in **Admin** view. Create a worker with a phone number and hourly rate, create a shift, and open **Site QR** for today's shift.
2. Open **Workspace → Worker** and choose a worker assigned to today's shift.
3. Open **Scan**. Scan the site code from a second display, or tap the same-device demo action.
4. The first scan checks in. A later scan checks out and shows estimated pay. Review payable hours and earnings under **Hours** or **Time & attendance**.
5. Use **Team** to call a worker through the phone's dialer, edit their rate, or open their profile. Admins can export a payroll CSV.

The demo caps **payable time at 10 hours per worker per day across all shifts**. It rejects another check-in once the cap is reached. Changing a worker's rate does not change the rate captured at earlier check-ins. The currency can be changed before the first punch. See [brand/README.md](brand/README.md) for the logo, Instagram feed and story creatives, colors, and launch copy.

Demo data, including changes, is saved on the device with AsyncStorage. **This is a local prototype:** switching roles is a preview control, not authentication; separate devices do not share data; the QR payload is client generated and can be forged. The 10 hour limit is a product preview, not a reliable fraud control. Do not use these records for real payroll or access control. Seeded phone numbers are fictional and should be replaced before trying the call button.

## Product scope

The prototype includes an admin dashboard, worker dashboard, team directory with phone calling and editable pay rates, shift creation and assignment, shift details, a rotating site QR, camera scanning, check-in and check-out events, capped payable hours, estimated pay, a payroll CSV, and demo role switching.

For a production release, the next implementation should include:

- Organization and site accounts with invited users, verified sign-in, and server enforced admin, manager, and worker permissions.
- A shared database for teams, workers, sites, shifts, assignments, immutable punch events, and approval history.
- Short-lived, **server signed** QR challenges. The server should validate assignment, site, shift window, expiration, replay, and the authenticated worker, then write a server timestamp. A client clock must never be the source of truth.
- Breaks, overnight shifts, time zones, overtime rules, missed punch requests, manager corrections with reasons, and approved timesheets. Keep raw events even when a correction is approved.
- Reliable offline behavior: queue pending scans, show that they are unverified, and reconcile them on reconnect with explicit conflict handling.
- Notifications for assignments and changes; availability and leave; qualifications and safety requirements; payroll export or integration; and audit/reporting views.
- Privacy controls for retention and access to personal information. Location should be optional and collected only when the organization has a clear need and worker notice.

The QR flow deliberately separates a **site code** displayed by the lead from a **worker identity** established by sign-in. That is the key design choice for trustworthy attendance across event and industrial sites.
