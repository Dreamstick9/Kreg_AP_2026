-- Kreg monitoring queries (PostgreSQL)
-- Tables: monitors(id, ...), check_results(id, monitor_id, checked_at, is_up, response_time_ms, ...)

-- ---------------------------------------------------------------
-- Query 1: uptime % and average response time for one monitor, last 24 hours
-- Use $1 for the monitor ID. Average response uses successful checks only.
-- ---------------------------------------------------------------
SELECT
    COUNT(cr.id)::int AS "totalChecks24h",
    ROUND(
        100.0 * COUNT(cr.id) FILTER (WHERE cr.is_up)
        / NULLIF(COUNT(cr.id), 0),
        2
    )::float AS "uptime24h",
    ROUND(AVG(cr.response_time_ms) FILTER (WHERE cr.is_up))::int AS "avgMs24h"
FROM monitors m
LEFT JOIN check_results cr
    ON cr.monitor_id = m.id
    AND cr.checked_at >= NOW() - INTERVAL '24 hours'
WHERE m.id = $1
GROUP BY m.id;

-- ---------------------------------------------------------------
-- Query 2: daily uptime % for one monitor, for the last seven UTC days
-- Use $1 for the monitor ID. Return oldest to newest.
-- ---------------------------------------------------------------
WITH recent AS (
    SELECT
        (checked_at AT TIME ZONE 'UTC')::date::text AS "day",
        COUNT(*)::int AS "checks",
        ROUND(
            100.0 * COUNT(*) FILTER (WHERE is_up)
            / NULLIF(COUNT(*), 0),
            2
        )::float AS "uptimePct"
    FROM check_results
    WHERE monitor_id = $1
      AND checked_at >= NOW() - INTERVAL '7 days'
    GROUP BY (checked_at AT TIME ZONE 'UTC')::date
    ORDER BY "day" DESC
    LIMIT 7
)
SELECT * FROM recent ORDER BY "day" ASC;

-- ---------------------------------------------------------------
-- Query 3: moving average response time for one monitor
-- Use $1 for the monitor ID. Only the latest 50 successful checks
-- are included; the window runs chronologically before results are
-- returned newest first.
-- ---------------------------------------------------------------
WITH recent_checks AS (
    SELECT checked_at, response_time_ms
    FROM check_results
    WHERE monitor_id = $1
      AND is_up = true
    ORDER BY checked_at DESC
    LIMIT 50
)
SELECT
    checked_at,
    response_time_ms::int,
    ROUND(
        AVG(response_time_ms) OVER (
            ORDER BY checked_at
            ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
        )
    )::int AS moving_avg_ms
FROM recent_checks
ORDER BY checked_at DESC;

-- ---------------------------------------------------------------
-- Query 4: fastest monitors for one user over the last 24 hours
-- Use $1 for the user ID. A rank of 1 is the fastest average.
-- ---------------------------------------------------------------
WITH monitor_averages AS (
    SELECT
        m.id,
        m.name,
        ROUND(AVG(cr.response_time_ms))::int AS avg_ms
    FROM monitors m
    JOIN check_results cr ON cr.monitor_id = m.id
    WHERE m.user_id = $1
      AND cr.is_up = true
      AND cr.checked_at >= NOW() - INTERVAL '24 hours'
    GROUP BY m.id, m.name
)
SELECT
    id::int,
    name,
    avg_ms::int,
    RANK() OVER (ORDER BY avg_ms)::int AS speed_rank
FROM monitor_averages
ORDER BY speed_rank, id;

-- ---------------------------------------------------------------
-- Query 5: total incident downtime per monitor for one user
-- Use $1 for the user ID. Open incidents count through now.
-- Prisma writes both incident timestamps as UTC without a time zone.
-- ---------------------------------------------------------------
SELECT
    m.name,
    COUNT(i.id)::int AS incidents,
    EXTRACT(EPOCH FROM SUM(
        COALESCE(i.resolved_at, NOW() AT TIME ZONE 'UTC') - i.started_at
    ))::float AS downtime_sec
FROM monitors m
LEFT JOIN incidents i ON i.monitor_id = m.id
WHERE m.user_id = $1
GROUP BY m.id, m.name
HAVING COUNT(i.id) > 0
ORDER BY downtime_sec DESC, m.id;

-- ---------------------------------------------------------------
-- Query 6: monitors whose latest check failed for one user
-- Use $1 for the user ID. If timestamps tie, use the larger check ID.
-- ---------------------------------------------------------------
WITH latest_checks AS (
    SELECT DISTINCT ON (m.id)
        m.name,
        c.status_code,
        c.error,
        c.checked_at,
        c.is_up
    FROM monitors m
    JOIN check_results c ON c.monitor_id = m.id
    WHERE m.user_id = $1
      AND c.checked_at = (
          SELECT MAX(c2.checked_at)
          FROM check_results c2
          WHERE c2.monitor_id = m.id
      )
    ORDER BY m.id, c.id DESC
)
SELECT name, status_code, error, checked_at
FROM latest_checks
WHERE is_up = false;
