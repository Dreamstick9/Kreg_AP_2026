-- Run once on a local database after the KL-06 seed.
-- Replace 1–5 with the five demo monitor IDs from SELECT id FROM monitors.
WITH generated AS (
    SELECT (ARRAY[1, 2, 3, 4, 5])[1 + (g - 1) % 5] AS monitor_id,
           NOW() - make_interval(secs => g * 30) AS checked_at,
           random() < 0.05 AS failed
    FROM generate_series(1, 100000) AS s(g)
)
INSERT INTO check_results
    (monitor_id, checked_at, is_up, status_code, response_time_ms)
SELECT monitor_id,
       checked_at,
       NOT failed,
       CASE WHEN failed THEN 500 ELSE 200 END,
       50 + floor(random() * 401)::integer
FROM generated;
