-- Scratch setup for testing queries in docs/queries.sql.
-- Run in a throwaway database, e.g.:  psql kreg_scratch -f docs/scratch_seed.sql

DROP TABLE IF EXISTS check_results;

CREATE TABLE check_results (
    id          BIGSERIAL PRIMARY KEY,
    monitor_id  INT         NOT NULL,
    checked_at  TIMESTAMPTZ NOT NULL,
    success     BOOLEAN     NOT NULL,
    status_code INT,
    response_ms INT
);

-- Times are relative to now(), so "last 24 h" always has data.
-- Monitor 1: 5 rows in last 24h (4 ok, 1 fail), 7 older.
INSERT INTO check_results (monitor_id, checked_at, success, status_code, response_ms) VALUES
(1, now() - interval '1 hour',  true,  200, 120),
(1, now() - interval '3 hours', true,  200, 110),
(1, now() - interval '6 hours', false, NULL, NULL),
(1, now() - interval '10 hours', true, 200, 130),
(1, now() - interval '20 hours', true, 200, 100),
(1, now() - interval '30 hours', true, 200, 140),
(1, now() - interval '40 hours', true, 200, 150),
(1, now() - interval '50 hours', false, 500, 300),
(1, now() - interval '52 hours', true, 200, 160),
(1, now() - interval '70 hours', true, 200, 125),
(1, now() - interval '75 hours', true, 200, 135),
(1, now() - interval '90 hours', false, NULL, NULL);

-- Monitor 2: 4 rows in last 24h (3 ok, 1 fail), 4 older.
INSERT INTO check_results (monitor_id, checked_at, success, status_code, response_ms) VALUES
(2, now() - interval '2 hours',  true,  200, 200),
(2, now() - interval '5 hours',  true,  200, 220),
(2, now() - interval '12 hours', false, 503, 50),
(2, now() - interval '23 hours', true,  200, 180),
(2, now() - interval '26 hours', true,  200, 210),
(2, now() - interval '48 hours', true,  200, 190),
(2, now() - interval '60 hours', false, NULL, NULL),
(2, now() - interval '72 hours', true,  200, 205);

-- Expected for query 1 (last 24h):
--   monitor 1: 5 checks, 4 ok -> 80.00 %, avg response 115.0 ms
--   monitor 2: 4 checks, 3 ok -> 75.00 %, avg response 200.0 ms
