-- Kreg monitoring queries (PostgreSQL)
-- Table: check_results(id, monitor_id, checked_at, success, status_code, response_ms)

-- ---------------------------------------------------------------
-- Query 1: uptime % and average response time, last 24 hours
-- Average response is taken over successful checks only, since
-- failed checks (timeouts) usually have no meaningful response time.
-- ---------------------------------------------------------------
SELECT
    monitor_id,
    COUNT(*)                                             AS total_checks,
    COUNT(*) FILTER (WHERE success)                      AS successful_checks,
    ROUND(100.0 * COUNT(*) FILTER (WHERE success)
          / COUNT(*), 2)                                 AS uptime_pct,
    ROUND(AVG(response_ms) FILTER (WHERE success)::numeric, 1)
                                                         AS avg_response_ms
FROM check_results
WHERE checked_at >= now() - interval '24 hours'
GROUP BY monitor_id
ORDER BY monitor_id;

-- ---------------------------------------------------------------
-- Query 2: uptime % per day (UTC), per monitor
-- ---------------------------------------------------------------
SELECT
    monitor_id,
    (checked_at AT TIME ZONE 'UTC')::date                AS day,
    COUNT(*)                                             AS total_checks,
    COUNT(*) FILTER (WHERE success)                      AS successful_checks,
    ROUND(100.0 * COUNT(*) FILTER (WHERE success)
          / COUNT(*), 2)                                 AS uptime_pct
FROM check_results
GROUP BY monitor_id, day
ORDER BY monitor_id, day;

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
