# Kreg Lite: Normalization (UNF → 1NF → 2NF → 3NF → BCNF)

## 1. The app's data

Kreg Lite is a self-hosted uptime monitor. A **user** registers with name, email and password.
The user adds **monitors** (a name and a URL, checked every `interval_sec` seconds, optionally shown
on the public status page). Every check saves a **check result** (up/down, HTTP status code,
response time, error text). After 3 failures in a row the server opens an **incident**, which is
closed (`resolved_at`) when the monitor comes back up.

The final schema (`prisma/schema.prisma`, migration `20261113181735_init`) has 4 tables:
`users`, `monitors`, `check_results`, `incidents`. This document shows how we reach it, starting
from one flat sheet of all the data.

Notation: `A -> B` means "A functionally determines B". Primary keys are **bold**.

---

## 2. Unnormalized form (UNF)

If we kept everything in one spreadsheet, one row per user, it would look like this. The cells
in the `monitors`, `checks` and `incidents` columns hold **lists** (repeating groups).

| user_email | user_name | password_hash | user_created_at | monitors (name, url, interval_sec, is_active, is_public, status, consecutive_failures, last_checked_at) | checks (monitor, checked_at, is_up, status_code, response_time_ms, error) | incidents (monitor, reason, started_at, resolved_at) |
|---|---|---|---|---|---|---|
| demo@kreg.dev | Demo | $2b$10$Xa… | 2026-11-13 18:20 | Fake OK, http://localhost:4000/ok, 10, t, t, UP, 0, 2026-11-16 10:00:10; Fake Flaky, http://localhost:4000/flaky, 10, t, t, DOWN, 3, 2026-11-16 10:00:10; Private OK, http://localhost:4000/ok, 60, t, f, UP, 0, 2026-11-16 09:59:00 | Fake OK, 10:00:00, t, 200, 12, –; Fake OK, 10:00:10, t, 200, 14, –; Fake Flaky, 09:59:50, f, 500, 9, HTTP 500; Fake Flaky, 10:00:00, f, –, –, timeout; Fake Flaky, 10:00:10, f, 500, 8, HTTP 500 | Fake Flaky, 3 consecutive failures, 2026-11-16 10:00:10, – |
| madhav@example.com | Madhav | $2b$10$Qe… | 2026-11-14 09:05 | Example, https://example.com, 60, t, t, UP, 0, 2026-11-16 10:00:00 | Example, 10:00:00, t, 200, 230, – | – |

Problems with UNF:
- Cells are not atomic (a cell holds a list of monitors, a list of checks).
- You cannot query "all checks of Fake Flaky" without parsing text.
- A monitor's details are written again every time it is mentioned in `checks` or `incidents`.

---

## 3. First normal form (1NF)

**Rule:** every cell holds one atomic value, there are no repeating groups, and every row is
identified by a key.

We break the lists into rows. Two choices we make here:

1. **We add `monitor_id`.** A monitor cannot be identified by its name or URL: the same user can
   have two monitors with the same URL (`Fake OK` and `Private OK` both check
   `http://localhost:4000/ok`, with different intervals and visibility), and names are free text.
   So each monitor gets a surrogate id.
2. **Checks and incidents become two separate flat relations.** They are two *independent*
   repeating groups of a monitor. Putting both in one row would pair every check with every
   incident of the same monitor (a multivalued dependency `monitor_id ->> check`,
   `monitor_id ->> incident`) and create fake combinations.

### R1: CHECK_LOG (one row per check)

**Key:** (**monitor_id**, **checked_at**). The checker runs a monitor at most once per interval
(10 s minimum), so one monitor never has two checks with the same timestamp.

| **monitor_id** | **checked_at** | user_email | user_name | password_hash | user_created_at | monitor_name | url | interval_sec | is_active | is_public | status | consecutive_failures | last_checked_at | monitor_created_at | is_up | status_code | response_time_ms | error |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 2026-11-16 10:00:00 | demo@kreg.dev | Demo | $2b$10$Xa… | 2026-11-13 18:20 | Fake OK | http://localhost:4000/ok | 10 | t | t | UP | 0 | 2026-11-16 10:00:10 | 2026-11-13 18:21 | t | 200 | 12 | NULL |
| 1 | 2026-11-16 10:00:10 | demo@kreg.dev | Demo | $2b$10$Xa… | 2026-11-13 18:20 | Fake OK | http://localhost:4000/ok | 10 | t | t | UP | 0 | 2026-11-16 10:00:10 | 2026-11-13 18:21 | t | 200 | 14 | NULL |
| 3 | 2026-11-16 10:00:00 | demo@kreg.dev | Demo | $2b$10$Xa… | 2026-11-13 18:20 | Fake Flaky | http://localhost:4000/flaky | 10 | t | t | DOWN | 3 | 2026-11-16 10:00:10 | 2026-11-13 18:21 | f | NULL | NULL | timeout |
| 4 | 2026-11-16 10:00:00 | madhav@example.com | Madhav | $2b$10$Qe… | 2026-11-14 09:05 | Example | https://example.com | 60 | t | t | UP | 0 | 2026-11-16 10:00:00 | 2026-11-14 09:06 | t | 200 | 230 | NULL |

### R2: INCIDENT_LOG (one row per incident)

**Key:** (**monitor_id**, **started_at**). A monitor cannot open two incidents at the same instant.

| **monitor_id** | **started_at** | user_email | user_name | password_hash | user_created_at | monitor_name | url | interval_sec | is_active | is_public | status | consecutive_failures | last_checked_at | monitor_created_at | reason | resolved_at |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3 | 2026-11-16 10:00:10 | demo@kreg.dev | Demo | $2b$10$Xa… | 2026-11-13 18:20 | Fake Flaky | http://localhost:4000/flaky | 10 | t | t | DOWN | 3 | 2026-11-16 10:00:10 | 2026-11-13 18:21 | 3 consecutive failures | NULL |
| 3 | 2026-11-15 22:14:30 | demo@kreg.dev | Demo | $2b$10$Xa… | 2026-11-13 18:20 | Fake Flaky | http://localhost:4000/flaky | 10 | t | t | DOWN | 3 | 2026-11-16 10:00:10 | 2026-11-13 18:21 | 3 consecutive failures | 2026-11-15 22:15:40 |

The tables are now in 1NF (atomic values, no repeating groups, a key per row), but they are full
of repetition: the user's and the monitor's details are copied into every check row.

### Functional dependencies in 1NF

| # | FD | Kind (w.r.t. the key of R1 / R2) |
|---|----|------|
| FD1 | `monitor_id, checked_at -> is_up, status_code, response_time_ms, error` | full (needs the whole key of R1) |
| FD2 | `monitor_id, started_at -> reason, resolved_at` | full (needs the whole key of R2) |
| FD3 | `monitor_id -> monitor_name, url, interval_sec, is_active, is_public, status, consecutive_failures, last_checked_at, monitor_created_at, user_email` | **partial** (only part of the key) |
| FD4 | `monitor_id -> user_name, password_hash, user_created_at` (via `user_email`) | **partial** (only part of the key) |
| FD5 | `user_email -> user_name, password_hash, user_created_at` | **transitive** (`monitor_id -> user_email -> user_name …`) |

Anomalies caused by FD3–FD5:
- **Update:** renaming a monitor or changing a user's password means updating thousands of check rows.
- **Insert:** a new user with no monitors, or a monitor that was never checked, cannot be stored
  (there is no `checked_at` to complete the key).
- **Delete:** deleting the last check of a monitor deletes the monitor and possibly the user.

---

## 4. Second normal form (2NF)

**Rule:** 1NF, and no non-key column depends on only *part* of a composite key.

FD3 and FD4 are partial dependencies on `monitor_id`. We move everything that depends on
`monitor_id` alone into its own table. The check and incident tables keep only the columns that
need the full key.

### MONITOR_2NF

**Key:** **monitor_id**

| **monitor_id** | user_email | user_name | password_hash | user_created_at | name | url | interval_sec | is_active | is_public | status | consecutive_failures | last_checked_at | created_at |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | demo@kreg.dev | Demo | $2b$10$Xa… | 2026-11-13 18:20 | Fake OK | http://localhost:4000/ok | 10 | t | t | UP | 0 | 2026-11-16 10:00:10 | 2026-11-13 18:21 |
| 3 | demo@kreg.dev | Demo | $2b$10$Xa… | 2026-11-13 18:20 | Fake Flaky | http://localhost:4000/flaky | 10 | t | t | DOWN | 3 | 2026-11-16 10:00:10 | 2026-11-13 18:21 |
| 5 | demo@kreg.dev | Demo | $2b$10$Xa… | 2026-11-13 18:20 | Private OK | http://localhost:4000/ok | 60 | t | f | UP | 0 | 2026-11-16 09:59:00 | 2026-11-13 18:21 |
| 4 | madhav@example.com | Madhav | $2b$10$Qe… | 2026-11-14 09:05 | Example | https://example.com | 60 | t | t | UP | 0 | 2026-11-16 10:00:00 | 2026-11-14 09:06 |

### CHECK_RESULT_2NF

**Key:** (**monitor_id**, **checked_at**)

| **monitor_id** | **checked_at** | is_up | status_code | response_time_ms | error |
|---|---|---|---|---|---|
| 1 | 2026-11-16 10:00:00 | t | 200 | 12 | NULL |
| 1 | 2026-11-16 10:00:10 | t | 200 | 14 | NULL |
| 3 | 2026-11-16 10:00:00 | f | NULL | NULL | timeout |
| 4 | 2026-11-16 10:00:00 | t | 200 | 230 | NULL |

### INCIDENT_2NF

**Key:** (**monitor_id**, **started_at**)

| **monitor_id** | **started_at** | reason | resolved_at |
|---|---|---|---|
| 3 | 2026-11-15 22:14:30 | 3 consecutive failures | 2026-11-15 22:15:40 |
| 3 | 2026-11-16 10:00:10 | 3 consecutive failures | NULL |

### FDs in 2NF

- MONITOR_2NF: `monitor_id -> user_email, name, url, interval_sec, is_active, is_public, status, consecutive_failures, last_checked_at, created_at` and `user_email -> user_name, password_hash, user_created_at`
- CHECK_RESULT_2NF: `monitor_id, checked_at -> is_up, status_code, response_time_ms, error`
- INCIDENT_2NF: `monitor_id, started_at -> reason, resolved_at`

No partial dependencies remain: every non-key column of CHECK_RESULT_2NF and INCIDENT_2NF needs the
whole key, and MONITOR_2NF has a single-column key. **All three tables are in 2NF.**

MONITOR_2NF still repeats the user's name and password hash for every monitor of that user,
because of the transitive dependency `monitor_id -> user_email -> user_name, password_hash, user_created_at`.

---

## 5. Third normal form (3NF)

**Rule:** 2NF, and no non-key column depends on another non-key column (no transitive
dependencies).

In MONITOR_2NF, `user_email` is not a key of that table but it determines `user_name`,
`password_hash` and `user_created_at`. We move the user's data to its own table. We also give
users a surrogate key `id` (emails can change; an integer FK is smaller and stable), and keep
`email` as a UNIQUE candidate key.

### users

| **id** | name | email (UNIQUE) | password_hash | created_at |
|---|---|---|---|---|
| 1 | Demo | demo@kreg.dev | $2b$10$Xa… | 2026-11-13 18:20 |
| 2 | Madhav | madhav@example.com | $2b$10$Qe… | 2026-11-14 09:05 |

FDs: `id -> name, email, password_hash, created_at` and `email -> id, name, password_hash, created_at`

### monitors

| **id** | user_id (FK → users.id) | name | url | interval_sec | is_active | is_public | status | consecutive_failures | last_checked_at | created_at |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | Fake OK | http://localhost:4000/ok | 10 | t | t | UP | 0 | 2026-11-16 10:00:10 | 2026-11-13 18:21 |
| 3 | 1 | Fake Flaky | http://localhost:4000/flaky | 10 | t | t | DOWN | 3 | 2026-11-16 10:00:10 | 2026-11-13 18:21 |
| 5 | 1 | Private OK | http://localhost:4000/ok | 60 | t | f | UP | 0 | 2026-11-16 09:59:00 | 2026-11-13 18:21 |
| 4 | 2 | Example | https://example.com | 60 | t | t | UP | 0 | 2026-11-16 10:00:00 | 2026-11-14 09:06 |

FD: `id -> user_id, name, url, interval_sec, is_active, is_public, status, consecutive_failures, last_checked_at, created_at`

`name` and `url` determine nothing: `(user_id, url)` is **not** unique (monitors 1 and 5), and two
monitors may share a name.

### check_results

Same columns as CHECK_RESULT_2NF; no transitive dependency.

FD: `monitor_id, checked_at -> is_up, status_code, response_time_ms, error`

Note: `is_up` is **not** a function of `status_code`. A network error or timeout has
`status_code = NULL` and `is_up = false`, and the checker decides "up" from more than the code
(for example a timeout). So `status_code -> is_up` does not hold and `is_up` is stored.

### incidents

Same columns as INCIDENT_2NF; no transitive dependency.

FD: `monitor_id, started_at -> reason, resolved_at`

**All four tables are in 3NF.**

---

## 6. Boyce–Codd normal form (BCNF)

**Rule:** for every non-trivial FD `X -> Y`, `X` is a superkey.

| Table | Determinants | Candidate keys | BCNF? |
|---|---|---|---|
| users | `id`, `email` | `{id}`, `{email}` | ✅ both determinants are candidate keys |
| monitors | `id` | `{id}` | ✅ |
| check_results | `id`; (`monitor_id`, `checked_at`) | `{id}`, `{monitor_id, checked_at}` | ✅ |
| incidents | `id`; (`monitor_id`, `started_at`) | `{id}`, `{monitor_id, started_at}` | ✅ |

In the final schema `check_results` and `incidents` use a surrogate `id` as the primary key
(simpler for Prisma, the API and future references); `(monitor_id, checked_at)` and
`(monitor_id, started_at)` remain the natural candidate keys. No determinant is a non-key
column, so **every table is in BCNF**.

---

## 7. Derived / redundant columns (deliberate denormalization)

These columns in `monitors` can be computed from `check_results`, so strictly they are redundant.
They are **not** an FD violation (they depend on the key `monitors.id`), but they must be kept in
sync by the app.

| Column | Can be derived from | Why we keep it |
|---|---|---|
| `monitors.status` | the latest `check_results.is_up` of the monitor (`UNKNOWN` if none) | The status page and dashboard read it constantly; without it every page load needs "latest check per monitor" over a fast-growing table. |
| `monitors.consecutive_failures` | the run of `is_up = false` at the end of the monitor's check history | The checker decides "open an incident after 3 failures in a row" on every check; one integer is cheaper than re-scanning recent results each time. |
| `monitors.last_checked_at` | `max(check_results.checked_at)` for the monitor | The scheduler uses it to decide which monitor is due (`last_checked_at + interval_sec <= now()`). |
| incident "open" flag | `incidents.resolved_at IS NULL` | Not stored separately, already normalized. |

The checker job should update all three in the same transaction that inserts the check result,
so they cannot drift from the history.

---

## 8. Final tables (match `prisma/schema.prisma`)

| Table (Prisma model) | Primary key | Foreign keys (ON DELETE) | Candidate keys / UNIQUE | Other rules |
|---|---|---|---|---|
| `users` (User) | `id` SERIAL | – | `email` UNIQUE (`users_email_key`) | `name`, `email`, `password_hash`, `created_at` NOT NULL |
| `monitors` (Monitor) | `id` SERIAL | `user_id → users.id` (CASCADE: deleting a user deletes their monitors) | – | `status` enum `MonitorStatus` (UP, DOWN, UNKNOWN), default UNKNOWN; `interval_sec` default 60 (API allows 10–3600); `consecutive_failures` default 0; `last_checked_at` NULL until the first check |
| `check_results` (CheckResult) | `id` SERIAL | `monitor_id → monitors.id` (CASCADE) | natural key `(monitor_id, checked_at)` (indexed, not declared UNIQUE) | `status_code`, `response_time_ms`, `error` NULL when the request failed or succeeded respectively |
| `incidents` (Incident) | `id` SERIAL | `monitor_id → monitors.id` (CASCADE) | natural key `(monitor_id, started_at)` (indexed, not declared UNIQUE) | `resolved_at` NULL while the incident is open |

Relationships: `users 1 — N monitors`, `monitors 1 — N check_results`, `monitors 1 — N incidents`.

### Rules not yet enforced in the database (possible improvements for `03_schema.sql`)

- `UNIQUE (monitor_id, checked_at)` and `UNIQUE (monitor_id, started_at)` to enforce the natural keys.
- `CHECK (interval_sec BETWEEN 10 AND 3600)` and `CHECK (consecutive_failures >= 0)` (today only the API validates).
- `CHECK (resolved_at IS NULL OR resolved_at >= started_at)`.
- At most one open incident per monitor: `CREATE UNIQUE INDEX ... ON incidents (monitor_id) WHERE resolved_at IS NULL`.
