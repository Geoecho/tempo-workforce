# Planning and notifications deployment

Production activation completed on 4 October 2026 through the authenticated Supabase CLI for project `wyllcdqsnpwadtthymeb`. The missing security-hardening, shared-task and planning migrations were applied in one transaction. The before/after workspace fingerprint matched: all 122 shifts and 22 attendance events were preserved. No provider credentials are included in these files.

The `tempo-push` function is deployed, rejects unauthenticated calls, and runs every minute through Cron with a Vault-held secret. Three observed scheduled requests returned HTTP 200 with `accepted: 0`; no registered-device delivery was exercised. APNs/FCM credentials and delivery on a signed phone build still require verification.

A pre-migration public-record backup was encrypted with Windows DPAPI at `C:\Users\hbris\AppData\Local\Tempo\Backups\tempo-pre-planning-20261004-200422.dpapi`. Decryption was verified under the same Windows account. This is not a full Auth/Storage backup or a database restore drill. The activation bundle is `artifacts/planning-activation.sql`; do not apply it again to the activated project.

## Database

Apply the existing migrations in the order in `supabase/tests/migrations.test.mjs`. On a project that already has the security-hardening update, apply `20261004_shared_tasks.sql` if it is missing, followed by `20261004_planning_workflows.sql` once. Use the Supabase SQL editor or a trusted database connection. The new migration preserves existing workspaces, time records and assignments; approved attendance corrections retain their originals in `tempo_review_audit`.

The root SQL files are this repository's manual migration format, not Supabase CLI's `supabase/migrations/` directory. Do not assume `supabase db push` applies them.

After applying, verify `tempo_request_list`, `tempo_request_review`, `tempo_register_push`, `tempo_claim_push` and `tempo_shift_clock_available` exist. Run an admin/worker staging acceptance test, including denied edits, cross-midnight check-out, concurrent roster conflict, leave approval and correction review. Recorded attendance cannot be edited through ordinary workspace saves.

## Remote push worker

1. Configure FCM v1 and APNs credentials for the EAS project, then install a signed development/production build. Browser tests cannot exercise the native permission dialog.
2. Create a strong random server secret `TEMPO_PUSH_SECRET` in Supabase Edge Function secrets. Configure `EXPO_ACCESS_TOKEN` if Expo enhanced push security is enabled. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are server environment values. Never add the service key, push secret or Expo access token to `EXPO_PUBLIC_*`.
3. Deploy the prepared server function:

```powershell
npx supabase functions deploy tempo-push --project-ref wyllcdqsnpwadtthymeb --no-verify-jwt
```

This function checks its own `x-tempo-push-secret` header and rejects unauthorized invocations. The SQL claim/receipt RPCs are executable only by `service_role`, not workers or anonymous clients.

4. Enable Cron and pg_net in the project. Save the project URL and the matching push secret in Vault as `tempo_project_url` and `tempo_push_secret`. Schedule the following server-side invocation after those secrets exist:

```sql
select cron.schedule('tempo-push-every-minute', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='tempo_project_url') || '/functions/v1/tempo-push',
    headers := jsonb_build_object('Content-Type','application/json','x-tempo-push-secret',
      (select decrypted_secret from vault.decrypted_secrets where name='tempo_push_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
$$);
```

5. On a phone, choose Enable notifications during onboarding. Background the app; change a shift from another account. Verify one alert opens the inbox. A monthly roster is coalesced into one notification per device, with a five-minute quiet interval between sends. The inbox retains individual changes. Verify denied permission, Not now, enabling from Settings, sign-out and invalid-token cleanup.
6. The worker submits batches of at most 100 messages, retries temporary failures up to five attempts, checks delivery receipts after 15 minutes and removes unregistered devices. Lock-screen copy contains no names, attendance, pay or location. Failed acknowledgements can still produce a repeated alert: remote transport is not exactly-once delivery.

## Operational verification

Monitor the Edge Function's error/latency logs and Cron run failures. Alert when queued deliveries older than ten minutes or failed deliveries increase. Never send worker names, pay values, emails, access tokens or QR payloads to a monitoring service.

```sql
select status,count(*) from public.tempo_push_deliveries group by status;
select count(*) as delayed from public.tempo_push_deliveries
where status='queued' and (claimed_at is null or claimed_at<now()-interval '10 minutes');
select created_at,actor,request_id from public.tempo_review_audit order by created_at desc limit 20;
```

Before launch, verify the actual project's backup retention and take a restorable backup. Restore it into an isolated staging project with outbound mail, push Cron and real device registration disabled. Compare workspace/worker/shift/punch/request/audit counts; verify admin/worker login, paid-time totals and row-level security. Record the successful restore time, source backup time and responsible owner. A backup policy or restore drill has not been activated by adding this runbook.

Client crash monitoring still requires a chosen service and owner-approved privacy/retention settings. Public signup delivery, account deletion, privacy/support pages, signing, store disclosures and physical-device acceptance remain in the release audit. Site-bound display-only access remains separate follow-up work; entrance screens currently require an admin account.

## References

- [Expo SDK 57 notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/)
- [Expo push credentials/setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Expo push sending and receipts](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Supabase scheduled Edge Functions and Vault](https://supabase.com/docs/guides/functions/schedule-functions)

## Task completion alerts

The `20261004_task_completion.sql` update was applied to production on 4 October 2026. Task completion produces one private inbox record for each workspace admin and queues remote delivery to their registered devices. Repeated completion and reopening the same task do not generate additional alerts. Opening the inbox record leads to Team tasks. Read status is saved on the server. The push worker was redeployed with task-specific generic lock-screen copy. Physical-device delivery remains an acceptance check.
