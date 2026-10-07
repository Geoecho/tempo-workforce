# Set up Google sign-in for Tempo

Tempo's current sign-in screen uses **Continue with Google** on web, Android, and iOS. Existing Supabase user IDs, firm memberships, and records are preserved when the Google identity links to the existing account. Older deployed web and installed app versions may still show email/password until replaced.

After Google sign-in, existing members open their workspace directly. Users without a workspace membership choose **Employee** or **Admin**. Employees need an invitation to their Google email; admins create a new workspace. The choice does not alter an existing member's database role.

## Production verification — 7 October 2026

The current client was deployed to `https://tempo-workforce.vercel.app` in `hbristikicloud-8992s-projects`, latest deployment `dpl_8K4RrNq4HFXG2iHoHD8eV98E52ou`. The published `/start` screen uses Google sign-in. A live Google sign-in completed PKCE exchange, cleared the callback code, and opened the workspace at `/`. After the account chooser update, an existing signed-in account was verified to open its workspace directly. Two component tests cover Employee/Admin selection and employee invitation guidance; a fresh Google account has not been tested end to end. No workspace records were edited during these checks. Invited-worker linking, MFA, native builds, and the server Email provider setting still require verification.

## 1. Create the Google credentials

1. Open the [Google Auth Platform](https://console.cloud.google.com/auth/overview) for the Google Cloud project that will own Tempo sign-in. Configure **Branding** and an **External** audience if people outside your Google Workspace will use Tempo. During Google's testing phase, add test users; publish the consent screen before a public launch.
2. In **Data Access**, request only `openid`, email, and profile. Supabase lists `openid` as a scope to add manually; email and profile are normally present by default. Do not request Google Drive, contacts, or other unrelated scopes.
3. In **Clients**, create an OAuth client of type **Web application**. Under **Authorized JavaScript origins**, add each exact web origin Tempo uses, such as the production HTTPS origin and `http://localhost:8081` for local testing. Origins contain no path or trailing slash.
4. Under **Authorized redirect URIs**, paste the **Callback URL shown on Supabase Dashboard → Authentication → Sign In / Providers → Google**. It has the form `https://<project-ref>.supabase.co/auth/v1/callback`. Use the actual URL from your project, not this example.
5. Save the **Client ID** and **Client Secret**. Keep the secret in Google Cloud and Supabase only. Never paste it into chat, `.env.local`, `EXPO_PUBLIC_*`, a mobile build, or this repository.

## 2. Enable Google in Supabase

1. Open the Tempo Supabase project → **Authentication → Sign In / Providers → Google**.
2. Enter the Google Client ID and Client Secret, then enable the provider and save.
3. In **Authentication → URL Configuration**, set the production **Site URL** and add redirect URLs for every supported return destination: `https://tempo-workforce.vercel.app/start` for new web sign-ins, the production web root for callbacks started by older builds, `http://localhost:8081/**` for local web testing, and the app's `tempo://**` deep-link scheme. Include any other real deployment host. Use narrow exact production URLs where possible; remove local and unused entries from a production project when no longer needed.
4. Deploy this client to the production Vercel site. Google returning a `?code=` URL to an older deployed page will still show the older login; the current client exchanges that code during auth startup. Start a fresh Google login after deployment, because authorization codes are single use and bound to the browser's PKCE verifier.

The Google button is always visible in the new client. If the Supabase provider is disabled or misconfigured, sign-in reports an error. Ship a native build containing this OAuth code; changing the provider setting alone cannot add it to an older installed build. Rebuild if the native deep-link scheme changes.

## 3. Verify before rollout

- Test sign-in, sign-out, and a second sign-in on production-like web, an installed Android build, and an installed iOS build. Expo Go is not a substitute for installed-build deep-link testing.
- Test one **existing** Tempo user using the same verified email as their Google account. Confirm they retain the same worker or admin identity, workspace, and data. Supabase can automatically link identities with matching verified emails, but verify this against a staging copy before broad rollout.
- Test a new invited worker with the invited email, a new admin workspace, a cancelled Google flow, and an account that needs MFA. Verify that each user sees only their own firm's data.
- Check that Google consent shows Tempo's expected name and domain, and that the app requests only basic identity scopes.
- Roll out to a small group first. Existing users must use a Google account with the same verified email to retain their Tempo account. Arrange a separate recovery path for users without a matching Google account before replacing their installed app. Once every live user has verified access and older clients are retired, disable **Authentication → Sign In / Providers → Email** in Supabase to enforce Google-only login server-side. This setting has not been verified or changed from this workspace.

## iOS App Store and data ownership

If Tempo offers Google sign-in in an iOS App Store build, [Apple App Review Guideline 4.8](https://developer.apple.com/app-store/review/guidelines/) requires an equivalent privacy-preserving login option. Configure and test Sign in with Apple before submitting that build.

Google handles the account credential and identity check. **Tempo and Supabase still store the user's account identifier, firm membership, shifts, hours, messages, and other app data.** Google sign-in does not remove Tempo's data retention, export, or account deletion responsibilities.

References: [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [native deep links](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking).
