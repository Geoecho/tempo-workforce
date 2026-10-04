# Authentication UI

The login and password creation screens share soft container focus states and a single password visibility button. Web CSS suppresses Edge's additional native password reveal control without disabling password manager autofill.

Motion uses React Native Animated and respects Reduce Motion. Password strength is an advisory check of length, variety, and common patterns; Supabase remains responsible for password policy enforcement.

## Recovery email configuration

The existing recovery link flow remains supported. To include a code, copy `supabase/templates/recovery.html` into Supabase Dashboard → Authentication → Email Templates → Reset Password. The template includes both `{{ .Token }}` and `{{ .ConfirmationURL }}`. Keep the project's email OTP length at 6 digits to match the UI. No dashboard configuration is changed by this code update.

The app requests recovery emails using `resetPasswordForEmail` and verifies codes using `verifyOtp` with `type: 'recovery'`. Its `PASSWORD_RECOVERY` event opens the existing new-password screen. Codes use one real input for paste, autofill, keyboard editing, and accessibility, with six visual cells. Submission is explicit; resend has a 60-second cooldown and server-side limits still apply.

## Delivery limits

`over_email_send_rate_limit` (HTTP 429) means Supabase refused the email request because its sending limit was reached. The UI now explains this and waits at least 60 seconds before allowing another request; that delay does not promise the server quota has reset.

Check Authentication → Rate Limits and Authentication → Email → SMTP Settings in the project's dashboard. If using Supabase's built-in sender, configure a custom SMTP provider for production delivery. Its built-in service has a low project-wide quota and restricts recipients to organization members. See https://supabase.com/docs/guides/auth/auth-smtp. Keep SMTP credentials in Supabase, never in EXPO_PUBLIC environment variables.
