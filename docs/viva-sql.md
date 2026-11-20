# SQL viva notes

The first six entries follow [`queries.sql`](queries.sql). Each service counterpart uses the current `is_up` and `response_time_ms` column names.

## Query 1 — 24-hour monitor stats

**Answers:** For one monitor, how many checks ran, what percentage succeeded, and the average response time of successful checks in the last 24 hours.
**SQL feature:** `LEFT JOIN` retains a monitor with no checks; `GROUP BY` and filtered aggregates calculate its stats.
**Service match:** `getStats` in `stats.service.js`.

## Query 2 — daily uptime

**Answers:** The check count and uptime percentage for up to seven UTC days for one monitor, oldest day first.
**SQL feature:** `GROUP BY` UTC date, a filtered aggregate, and a CTE with `ORDER BY`/`LIMIT`.
**Service match:** `getDailyUptime` in `stats.service.js`.

## Query 3 — moving response average

**Answers:** The last 50 successful checks for one monitor, each paired with its response time and the average of that check plus the four previous checks.
**SQL feature:** A CTE selects the 50 rows; `AVG() OVER (...)` is a window function with a five-row frame.
**Service match:** `getMovingAverage` in `stats.service.js`.

## Query 4 — speed ranking

**Answers:** A user's monitors' average successful response times in the last 24 hours, ranked fastest first.
**SQL feature:** A CTE calculates averages; `RANK() OVER (ORDER BY avg_ms)` ranks the results.
**Service match:** `getRanking` in `stats.service.js`.

## Query 5 — incident downtime

**Answers:** Total incident count and downtime per monitor for one user; an unresolved incident is counted through the current time.
**SQL feature:** `LEFT JOIN` keeps monitors without incidents during aggregation; `GROUP BY` combines rows and `HAVING` removes groups with no incidents.
**Service match:** `getDowntime` in `stats.service.js`.

## Query 6 — failing latest checks

**Answers:** A user's monitors whose most recent check failed; ties on check time use the larger check ID.
**SQL feature:** A correlated `MAX(checked_at)` subquery finds the latest time, and PostgreSQL `DISTINCT ON` breaks ties.
**Service match:** `getFailingNow` in `stats.service.js`.

## KL-23 — generate 100,000 checks

**Answers:** Insert 100,000 synthetic checks across five seeded monitors, spaced 30 seconds apart, with about 5% failures and response times from 50 to 450 ms.
**SQL feature:** `generate_series(1, 100000)` creates the rows for a set-based `INSERT ... SELECT`.
**Service match:** This is benchmark data generation in `seed-100k.sql`, separate from the runtime stats queries.
