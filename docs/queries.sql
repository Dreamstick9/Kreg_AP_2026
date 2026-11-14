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
