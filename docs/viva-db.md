# Database viva notes

## 1. Why the tables are normalized

Each table stores facts about one entity: `users` stores account data, `monitors` stores a user's monitored URL and current state, `check_results` stores one observation per check, and `incidents` stores one outage episode. Foreign keys represent User 1-to-many Monitor and Monitor 1-to-many CheckResult/Incident relationships instead of copying details into every result. Cascades remove a monitor's dependent rows when it is deleted. This avoids update anomalies and keeps check history instead of overwriting it. `monitors.status`, `consecutive_failures`, and `last_checked_at` are a deliberate current-state summary; the detailed history remains in `check_results`.

## 2. Indexes and the queries they support

- Primary-key indexes on each `id` support direct row lookups and referenced parent keys.
- Unique `users.email` supports registration's duplicate lookup and login's user lookup.
- `monitors(user_id)` supports listing and ownership-scoped monitor lookups; the overview ranking query also filters monitors by user.
- The B-tree `check_results(monitor_id, checked_at)` puts the equality filter first and time range/order second. It supports a monitor's results ordered by time and monitor-specific time-window statistics. KL-23 measured it with a filter on one monitor and a recent `checked_at` range.
- `incidents(monitor_id, started_at)` supports listing a monitor's incidents in time order and finding its latest open incident.

Indexes reduce the rows PostgreSQL must search; the planner may still choose a scan for small tables or broad queries.

## 3. Why `runCheck` uses a transaction (ACID)

`runCheck` performs the network request first, then uses one Prisma transaction to insert the `CheckResult` and update the monitor's `lastCheckedAt`, status, and failure count. If either database write fails, both roll back (atomicity), so history and current state cannot disagree because of a half-save. Constraints keep the data valid (consistency); the transaction does not expose a partial pair of writes (isolation); a successful commit persists both (durability). The HTTP request stays outside the transaction so a slow target does not hold database locks open.

## 4. KL-23 index benchmark

On PostgreSQL 18.7 with 100,000 `check_results` rows, the same query returned 576 rows. Before the composite index, PostgreSQL used a sequential scan and took **6.595 ms**. After adding `check_results(monitor_id, checked_at)`, it used a bitmap index/heap scan and took **0.172 ms**—about 38× faster in that run. This is one local benchmark, not a promise for every database or data size.
