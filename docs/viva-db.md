# Kreg Lite database viva notes

## Normalization

`users` stores one row per account, `monitors` one per configured target, `check_results` one per check, and `incidents` one per outage. Foreign keys link each monitor to its owner and each check or incident to its monitor. Changing an owner's email touches one row even if they own several monitors. The monitor row also keeps current status, failure streak, and last-check time so the app can read current state without scanning check history.

## Indexes

| Indexed columns | Purpose and example query |
| --- | --- |
| `users(id)` (PK) | Identifies a user for `getMe`. |
| `monitors(id)` (PK) | Identifies the monitor that `runCheck` updates. |
| `check_results(id)` (PK) | Gives each check a unique ID and supports lookup by ID. The history queries filter by monitor. |
| `incidents(id)` (PK) | Gives each outage a unique ID and supports lookup by ID. The incident list filters by monitor. |
| `users(email)` (unique) | Enforces one account per email and supports `loginUser`'s email lookup. |
| `monitors(user_id)` | Finds a user's monitors for `getMonitors`, including the count query. |
| `check_results(monitor_id, checked_at)` | Finds one monitor's rows in a time range for `getStats` and supports newest-first history. |
| `incidents(monitor_id, started_at)` | Finds one monitor's incident history for `getMonitorIncidents` and supports ordering by start time. |

## Why `runCheck` uses a transaction

**Atomicity** means the check insert and monitor update commit together or both roll back. **Consistency** means database rules such as the check's foreign key still hold, and those two writes stay in sync. **Isolation** keeps other transactions from seeing partial writes. **Durability** means committed writes survive a database restart. The HTTP check happens before the transaction. Incident handlers write separately after the transaction commits.

## KL-23 benchmark

For one monitor's last 24 hours in a table of 100,000 checks, [`EXPLAIN ANALYZE`](explain.md) recorded **6.595 ms before** (sequential scan) and **0.172 ms after** (bitmap index and heap scans). Both plans returned 576 rows.
