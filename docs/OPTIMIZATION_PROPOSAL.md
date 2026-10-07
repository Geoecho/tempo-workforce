# Tempo Workforce: data loading and sync optimization

**Status:** Launch optimization plan. The first compatibility-safe sync reduction is implemented locally; the normalized cutover and live deployment are pending.
**Baseline reviewed:** 2026-10-07 source. The companion audit is a 2026-10-02 snapshot and predates task, request, and correction features.
**Scope:** Reduce unnecessary requests, response bytes, database scans/writes, client parsing, and history growth.

## Launch decision

The target architecture below remains the right long-term direction, but the original rollout order was too aggressive for a project with live firm data. Do not turn off the old workspace data path before an equivalent, tested path exists for every active screen and every supported app version. Use **expand → backfill → compare → switch by domain → retire**. Keep the legacy JSON read-only during a verified rollback window; removing it is a separate decision after live data and pay parity checks.

The first local step, `supabase/20261007_sync_revisions.sql`, adds small section change counters without changing existing data. The client can then poll only those counters once per minute while foregrounded, refresh a changed section, and use changes to the tiny revision table for prompt invalidation. Task proof bytes are fetched only when the photo is opened. This reduces idle requests and repeated media transfer, but **it does not solve the expensive full workspace read or shared-row write when many workers punch at once**. The normalized cutover below remains required before claiming that the database scales to many firms.

Apply the SQL before releasing a client that depends on it. The new client retains a slower legacy refresh if the SQL is absent; old clients continue to use existing RPCs. Do not apply the migration to the live Supabase project until the migration and role checks have been rehearsed on a disposable copy and a backup/restore has been verified.

**Rollback for this first step:** redeploy the previous client if the new refresh path misbehaves. Leave the additive counters and RPCs in place while any upgraded client is active; they do not replace or delete source records. If the counters themselves cause measurable write contention, disable their triggers in a controlled database change after clients have returned to the legacy path. Recheck that punches, approvals, tasks, and requests still save before closing the incident. Do not drop the old JSON or inline proof fields in this step.

## Recommendation

The strongest practical design for this app is:

1. **Screen-scoped queries over normalized records.** Each screen asks for only the records and date range it needs. A smaller response over the same giant JSON document would reduce transfer, but not remove the database's need to read and scan that document.
2. **Targeted transactional writes.** A change to one worker or shift updates that record, not the full workspace. Punches remain auditable append-only events.
3. **Realtime as an invalidation signal, not the data source.** Notify connected clients that a section changed; they then perform an authorized, scoped fetch. Reconcile on app resume/reconnect.
4. **Cursor pagination for growing lists and history.** Avoid unbounded snapshots and offset scans deep into old data.
5. **A small client query cache.** Keep recently viewed sections for quick navigation and deduplicate requests, while treating the database as authoritative.

This is more technically sound than merely changing the 12-second timer or caching the existing full JSON response. The change that makes it scale is changing what the database can query independently; realtime and client caching then keep those smaller reads current.

## Baseline implementation before the first local change

The online provider in [src/lib/online-store.tsx](../src/lib/online-store.tsx):

- Loads three RPC snapshots together: workspace, breaks, and messages.
- Repeats all three requests every 12 seconds while the provider is ready.
- Applies the response to provider state even if its version/data is unchanged.
- Loads the three snapshots again after punch, break, and time-approval actions.
- Listens for message changes through Realtime, then fetches the full message list again.

The newer code also has a shared-task poller (10 seconds) and a request poller (20 seconds). `tempo_task_list()` returned full proof photos inline, with each photo allowed up to 2,000,000 text characters. Task and request lists are unbounded. The first local sync change removes repeated full-list polling on unchanged revisions and fetches task proof on demand; bounded task/request pages and object storage are still required. The correction flow now records originals in `tempo_review_audit` while replacing the active punch array, so its audit and pay semantics must be preserved during migration.

The main workspace snapshot in [supabase/20260929_tempo.sql](../supabase/20260929_tempo.sql) reads one workspace JSON document. Workers, shifts, and punches are arrays inside that document. Admin saves send the full state back for replacement with an expected-version check. Punch writes append to the punches array while locking the workspace row and scanning that row's arrays.

The worker snapshot returns filtered records, but first reads the same workspace document and walks its arrays to build the response. It includes all matching history instead of a bounded date range.

Break events and messages are stored in tables, but their snapshot functions return unbounded history. A message Realtime event reloads that entire history. Profile photos are base64 data URLs inside worker objects in the workspace JSON; the helper allows up to 60,000 base64 characters.

The archived flag hides workers or shifts from active screens. It does not remove them from the JSON state or free database space.

## What is actually expensive

There are four distinct costs. A proposal should reduce each one directly:

| Cost | Current cause | Effective reduction |
|---|---|---|
| **Network egress** | Full workspace and history repeatedly returned to each active client | Return only selected rows/fields; fetch only after a relevant change |
| **Database work** | JSON arrays read and scanned inside snapshot/punch functions; unbounded history aggregation | Relational predicates, indexes aligned to filters/sorts, bounded queries |
| **Write contention** | Admin edits replace one shared document; every workspace punch locks that same row | Update narrow records; lock only the affected worker/session invariant |
| **Client work** | Large JSON decoded and shared provider state updated every refresh | Keep section-specific data/cache entries and update only changed sections |

A small revision poll can cut bytes, but still spends one database/API request per poll. A Realtime subscription can eliminate most idle polling, but it does not make a large snapshot cheap when a screen opens or a change occurs. Both need screen-scoped queries to solve the underlying response and scan costs.

## Compare viable sync approaches

| Approach | Idle requests | Data on a change | Recovery after disconnect | Complexity | Recommendation |
|---|---:|---|---|---|---|
| Current full snapshot poll | High: 3 RPC calls every 12 seconds per ready client | Whole workspace plus full break/message snapshots | Naturally reloads all data every poll | Low | Retire |
| Poll only a small revision value | Still periodic, but response/query can be tiny | Fetch current screen data only when the revision differs | Simple: compare revision on resume/reconnect | Low | Good fallback; useful first reduction |
| Private Realtime invalidation plus scoped fetch | No periodic data poll while connected; WebSocket heartbeats remain | Fetch only affected section/record | Compare revisions and reload visible sections after reconnect | Medium | Preferred near-real-time path |
| Durable change log plus client cursor | Very low repeated reads; fetch exact changes since cursor | Small ordered deltas, including deletion tombstones | Strong catch-up after long disconnects | High | Add only if reconnect/offline requirements justify it |

### Recommended first release of the new sync path

Use a small revision value per data section and a private notification when a section changes. An active screen listens for relevant changes, coalesces bursts, and refetches its current bounded query. On resume/reconnect it compares revisions and reloads any visible section that is stale. A slow revision check can recover from missed notifications.

This provides reliable screen freshness without immediately building a general-purpose sync engine. A durable change log is a later option if clients must replay every change after long offline periods or if testing shows section reloads are still too costly.

## Target query and response contracts

Define screen data contracts before writing SQL. Each query should list the tenant scope, fields, date interval, ordering, and maximum page size. Do not expose one generic “workspace snapshot” endpoint as the default data API.

| Screen/use case | Initial response should include | Load separately |
|---|---|---|
| Bootstrap | Signed-in role, workspace ID/time zone, small section revisions, and the minimal first-screen data | Directory, deep history, photos, messages beyond recent page |
| Home | Today's shifts, current attendance state, and small summary values | Earlier schedule, worker profiles not visible on screen |
| Schedule | A bounded date window and required assignment labels | Adjacent date windows and archived shifts |
| Worker directory | Search/filter result page with only list fields | Next page, full worker detail, photo, historical time data |
| Worker detail | One worker and upcoming assignments | Selected time-history page and older history |
| Shift detail/attendance | One shift, its assignments, and latest attendance for that shift | Other shifts and unrelated workers' history |
| Time/pay review | One selected month/date range, its punches/breaks/approvals, and applicable captured rates | Other months; a server-computed monthly summary only after parity is proven |
| Messages | Most recent page for the current user | Older pages on demand |
| Break status | Current/selected shift or date range | Closed break history when the user opens it |
| Archived history | Explicitly requested date range or archive group | Never silently include it in active-screen responses |

Use one bounded bootstrap request when it prevents several tiny round trips, but keep the response small and defined. Avoid both extremes: three redundant snapshots for every screen, and a single giant response that tries to preload the entire product.

Use cursor/keyset pagination for growing datasets. A cursor should contain the full stable ordering key, such as timestamp plus unique ID, so records created with the same timestamp do not get skipped or duplicated. Avoid deep OFFSET pagination. Supabase's pagination guide and Postgres index guidance describe the trade-offs and index requirements: [cursor pagination](https://supabase.com/docs/guides/database/pagination), [Postgres indexes](https://supabase.com/docs/guides/database/postgres/indexes).

## Storage and write design

### Normalize independently changing and growing data

Move the following collections out of the workspace JSON document into tenant-scoped rows:

- Workers, teams, and saved sites/templates.
- Sites.
- Shifts and shift assignments.
- Punch events and current attendance state.
- Break events.
- Time approvals.
- Messages and notifications.
- Tasks, requests, and correction audit records.

Keep workspace settings small. Add foreign keys and tenant-aware uniqueness constraints so a shift cannot accidentally reference a worker from another workspace. Query by workspace and the screen's date/entity filters.

Do not create indexes for every column by guesswork. Index the actual filter, join, and order-by patterns; include foreign-key lookup paths and RLS membership lookups. Validate important reads using EXPLAIN (ANALYZE, BUFFERS) on representative data. Every index adds storage and write work, so keep only indexes justified by a query path. Supabase guidance: [query optimization](https://supabase.com/docs/guides/database/query-optimization), [index management](https://supabase.com/docs/guides/database/postgres/indexes).

### Use narrow commands and minimal responses

Replace whole-state saves with explicit operations such as editing a worker, changing a shift, or changing a workspace setting. Each operation should:

- Check the authenticated actor's workspace membership and role on the server.
- Validate inputs and relevant business invariants inside a short database transaction.
- Update only the affected row(s).
- Return the changed record or a compact result; never return the entire workspace just to confirm a write.
- Carry an idempotency key for retryable actions such as scans, so a timeout/retry cannot record the same punch twice.

For screen actions, apply an optimistic update to the affected local section. Reconcile that section from the server result; use a scoped read if the operation is rejected or another device changed the same record.

### Keep punch history auditable without locking the workspace

Store punch events as append-only rows with workspace, worker, shift, server timestamp, source, actor, and idempotency key. Preserve the original event when correcting a time record; store an authorized correction as a separate audit entry.

The current rule allowing at most one open shift per worker must remain race-safe. Enforce it with a targeted worker/session lock or a dedicated current-attendance row protected by a unique constraint, and insert the immutable punch event in the same transaction. Do not scan the worker's complete punch history or lock the workspace row on every scan.

This is a focused event ledger for time punches, not a requirement to event-source every part of the application. Shifts, profiles, and settings can remain ordinary relational records with targeted updates.

### Move profile images out of the database document

Store compressed profile and task-proof photos as private object files. Keep a small object key and metadata on the related row. Load thumbnails or proof only when a visible screen needs them; never include photo bytes in routine list, roster, punch, or attendance responses. Preserve workspace-scoped authorization. Migrate existing inline bytes with a verified, resumable export/upload process before deleting any originals.

### Handle history and archiving explicitly

Bound all history reads by date and page cursor. Define retention before deleting employment/time records. For cold archive, export closed periods with schema version, record counts, and checksum; verify readback/restore before removing eligible live rows. A boolean archive flag alone is not a storage archive.

Partitioning is not the first optimization. Normalize, index measured queries, paginate, and agree on retention first. Consider date partitioning for high-volume append-only history only when measured query or retention-maintenance costs justify its added constraint and migration complexity.

## Realtime and revision design

Supabase recommends Broadcast over Postgres Changes for scalable and secure database-change subscriptions. For this app:

- Use one private workspace-scoped change topic per relevant client scope, not a subscription to the full workspace row.
- Send only an event type, section, record ID if needed, and the new section revision.
- On notification, mark the relevant query stale and fetch it through the normal authorized API path.
- Coalesce rapid changes so one burst causes one scoped refresh.
- Mark inactive screen caches stale but do not fetch them until the screen is opened.
- On reconnect or app resume, compare revisions and reload visible stale sections.

For a custom invalidation payload, use a custom Broadcast message (for example, database-triggered realtime.send) rather than broadcasting the full row. The realtime.broadcast_changes helper mirrors row changes and can include the full new/old row; that is the wrong payload shape for a large state document. Private-channel authorization must verify current workspace membership. Do not use a broad policy that allows every authenticated user to subscribe to every workspace topic.

Current Supabase docs mark database-triggered Broadcast as beta in at least one feature reference. Verify availability and behavior for the target project before making it the only freshness mechanism; keep revision-based reconciliation as a correctness fallback. Supabase references: [database change subscription guidance](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes), [custom Broadcast and authorization](https://supabase.com/docs/guides/realtime/broadcast), [Realtime limits](https://supabase.com/docs/guides/realtime/limits).

Do not subscribe to every table change and blindly refetch every screen. Scope events to the active workspace and relevant section. Realtime has its own connection, message, throughput, and payload limits; monitor it as part of the same design.

## Client cache and rendering

The app's current OnlineStore is a single provider for the full state. Split network state into bounded domains such as workspace settings, roster pages, schedule windows, attendance, messages, and monthly time review. Components should subscribe to the domain they render, not every field in the workspace.

Use stable cache keys containing workspace, domain, date range, and cursor. Deduplicate requests for a key; retain recently viewed data in memory; update only the affected key when a write or notification arrives. Do not call a broad provider setter if only one attendance row changed.

A query/cache library such as TanStack Query could manage request deduplication, freshness, and invalidation, but it will not reduce database work or response bytes if each query still returns the whole JSON document. First define the query contracts. Then either implement those contracts in the current provider or adopt a query cache if it materially simplifies them. Do not add the dependency as a substitute for changing the data API.

Persisted local caching is a separate offline/privacy decision. If introduced, define sign-out/workspace-switch clearing, expiration, and which employee data may remain on a device. A stale local view must not authorize a punch or decide its timestamp.

## Database security and query performance

The new tables and functions must preserve the current server-side authorization guarantees:

- Enable RLS on every exposed table and define workspace-scoped policies for each role.
- Index columns used for workspace membership checks, joins, and policy predicates.
- Use explicit grants and narrow function execution permissions. Any SECURITY DEFINER function must explicitly validate auth.uid(), workspace membership, and role, use a fixed search_path, and revoke execution from roles that should not call it.
- Keep sensitive data such as hourly rates, contact details, and time history out of queries that do not need them.
- Test cross-workspace access and each role using real authenticated sessions; a successful admin query does not prove worker policies are correct.

Supabase references: [RLS basics and performance](https://supabase.com/docs/guides/database/postgres/row-level-security), [query/index optimization](https://supabase.com/docs/guides/database/query-optimization).

## Migration and rollout

Choose the migration route based on whether real customer data exists:

### If there is no production data

1. Create tracked migrations for the normalized schema and security policies.
2. Update all reads/writes to use the new schema.
3. Import representative seed data and verify product behavior before release.
4. Remove the old JSON arrays from the new schema path.

### If existing workspace data must be preserved

1. Back up database state and separately back up stored files; rehearse restore before schema cutover.
2. Create new tables and constraints through tracked migrations.
3. Backfill existing JSON while preserving IDs, timezone/date semantics, assignment links, rate-at-check-in, approval state, and archive status.
4. Compare row counts, relationship counts, and historical time/pay outputs against the old representation.
5. Route all writes through one transactional server path. If temporary dual-write is required, do both representations inside the same database transaction; never let clients independently write two sources of truth.
6. Shadow-compare reads in a test environment, then switch one screen/domain at a time.
7. Keep the old JSON read-only through a short rollback window; remove it only after data parity and restore tests pass.
8. Add Realtime invalidation after the normalized write paths are stable.

This repo currently has timestamped SQL scripts rather than a complete migration history in the standard Supabase migration path. Migration history and repeatable clean-install/upgrade checks are part of the optimization work because query and RLS behavior must match in every environment.

## Performance model and measurement

Current polling arithmetic:

- A 12-second interval is 5 polling cycles per minute.
- One client mounted 8 hours/day for 22 workdays makes about 52,800 polling cycles per month.
- With three snapshot RPC calls per cycle, that is about 158,400 snapshot RPCs per client-month, before post-action reloads.
- The later task and request features add roughly 6 and 3 full-list calls per minute while mounted, respectively. Together with the workspace loop, the prior foreground cadence is about **24 data RPCs/minute per client**. The first local change replaces that idle cadence with about **3 small revision checks/minute** and no unchanged full-list or full-workspace response. Realtime events and actual changes add requests; this is code-path arithmetic, not a live usage measurement.
- This is the code's request cadence, not measured traffic. Actual bytes depend on role, data size, compression, and how long clients stay active.

The target model is:

**Data transfer = initial screen data + relevant changed records + requested history pages + visible media + reconnect reconciliation**

The target should be judged from measurements, not a guessed number of supported firms. Capture:

- Response bytes by query and role, plus p50/p95 response size and latency.
- Requests per active session and repeated unchanged-response rate.
- Query plan, rows scanned/returned, buffer reads, and database execution time.
- Database size/growth by record class.
- Egress per session/workspace and bytes due to image delivery.
- Realtime messages, concurrent connections, reconnects, and missed-notification recoveries.
- Lock waits, conflicts, duplicate retries, and failed writes.
- Client JSON parse/render time on a representative mid-range device.

Benchmark with representative data: a roster in the intended upper range, realistic upcoming/recurring shifts, and several months of punches, breaks, messages, and photos. Include concurrent writes and multiple clients looking at the same shift. Compare the new design to the current code under identical scenarios.

The desired measurable result is no full-snapshot transfer on an unchanged screen; bounded response sizes per screen; no growth in query latency as old history is added to unrelated screens; and correctly reconciled views after missed Realtime events. Set numeric latency/egress thresholds from an instrumented baseline, not by guessing.

## Complexity choices

| Tempting shortcut | Why it falls short | Better decision |
|---|---|---|
| Keep the JSON document and just increase the timer interval | Lowers request frequency but retains full-response payloads, array scans, and large writes | Replace with scoped data queries and targeted writes; use a slower revision check only as fallback |
| Poll a revision every few seconds forever | Much smaller egress, but still continuous requests and DB work | Use foreground/reconnect checks plus Realtime invalidation; retain a slow safety check only if measurements require it |
| Realtime-subscribe to the workspace JSON row | Row updates can carry or invalidate the entire large state; clients still need the same huge snapshot | Publish a tiny section/revision event and fetch only the active section |
| Add a client cache library first | Can deduplicate requests, but cannot shrink an oversized SQL/RPC result | Define server query boundaries first; choose a cache implementation second |
| Partition all tables from the beginning | Adds migration, uniqueness, and maintenance complexity without solving unbounded responses by itself | Normalize, index, page, and measure first; partition only high-volume history if justified |
| Build a generic offline sync engine now | Requires conflict resolution, durable queues, replay/idempotency, and stale authorization handling | Start with online change notifications and reconnect reconciliation; add offline sync only for a proven offline requirement |

## Release acceptance criteria

- No full workspace/break/message snapshots are fetched every 12 seconds while data remains unchanged.
- Every screen reads only its declared fields, tenant, date range, and page.
- Directory and event history use bounded cursor pagination.
- A punch, break, message, or approval updates only affected visible data.
- An unchanged revision does not trigger JSON parsing or broad provider updates.
- Resume/reconnect restores current screen consistency if Realtime notifications were missed.
- Retried writes cannot duplicate punches; punches remain server-timestamped and auditable.
- Worker punch concurrency no longer locks or scans the whole workspace document.
- Cross-workspace and per-role access tests pass for every new table and RPC.
- Historical time/pay output matches the current rules before legacy state is removed.
- Photos are absent from routine schedule, roster-list, punch, and attendance payloads.
- Deeper history does not increase the size/latency of current-screen responses.
- Performance results include the dataset, device/session assumptions, and query plans used.

## Implementation order

### First: measure, protect live data, and set contracts

1. Instrument current snapshot sizes, request counts, latency, and workspace-state sizes.
2. Export and restore a disposable copy of live data, including photos and correction audits. Record per-workspace row counts and pay totals.
3. Write the field/date/sort/page contract for every screen, including tasks and requests; decide which screens need near-real-time updates.
4. Run the existing migration/security suite and real-session role checks on a disposable Supabase project.

### Second: reduce idle transfer without changing storage

1. Apply the additive section-revision migration, then release the client that checks it in the foreground and on resume. Keep a slow reconciliation check for missed Realtime events.
2. Fetch only changed sections; do not reload workspace JSON for a message, task, break, or approval change.
3. Fetch task proof only when opened. Add bounded pages for messages, tasks, requests, breaks, notifications, and time history.
4. Measure the reduction in requests, egress, JSON parsing, and p95 latency. This stage is an immediate cost reduction, not the final database architecture.

### Third: normalize and switch one domain at a time

1. Add tracked migrations for workers, sites, shifts, assignments, punches/current attendance, and any still-growing JSON fields. Reuse existing relational tables for breaks, approvals, messages, tasks, requests, and audits; do not duplicate them.
2. Backfill from the live JSON in small, idempotent batches. Preserve IDs, timezone/work-date semantics, rate-at-check-in, existing correction originals, approvals, archived status, and assignment links. Compare counts and historical pay against the old path.
3. Route each domain's writes through one transactional server path. During mixed-version operation, keep old and new representations consistent in the same database transaction; never ask clients to dual-write.
4. Add bounded, role-specific queries and switch home, schedule, attendance, time/pay, directory, and detail screens one by one. A successful screen switch must remove its dependency on the full workspace snapshot.
5. Enforce the one-open-shift invariant with a worker-scoped row/constraint and append immutable punch and correction events with idempotency keys. Prove concurrent scans and retries cannot duplicate or overlap attendance.
6. Move profile and proof photos to private object storage with resumable migration and on-demand delivery. Add private Broadcast invalidation only after targeted writes are stable; keep revision reconciliation for missed events.
7. Keep the legacy JSON read-only through a tested rollback window. Remove it only after old clients are retired, parity is proved, and a separate retention decision authorizes contraction.

### Fourth: prove it under load before launch

1. Run SQL query-plan checks on representative data.
2. Exercise many workspaces, large rosters, deep history, concurrent punches, concurrent admin edits, missed Realtime events, reconnects, stale clients, and mixed old/new client versions.
3. Record the new per-screen payloads and p95 query/client timings against the measured baseline.

## Technical references

- [Supabase database change subscriptions](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)
- [Supabase Realtime Broadcast](https://supabase.com/docs/guides/realtime/broadcast)
- [Supabase Realtime limits](https://supabase.com/docs/guides/realtime/limits)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Postgres pagination](https://supabase.com/docs/guides/database/pagination)
- [Supabase query optimization](https://supabase.com/docs/guides/database/query-optimization)
- [Supabase index management](https://supabase.com/docs/guides/database/postgres/indexes)

