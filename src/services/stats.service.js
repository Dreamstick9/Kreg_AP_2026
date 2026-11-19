const prisma = require('../config/db');

async function getDailyUptime(monitorId) {
  const daily = await prisma.$queryRaw`
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
      WHERE monitor_id = ${monitorId}
        AND checked_at >= NOW() - INTERVAL '7 days'
      GROUP BY (checked_at AT TIME ZONE 'UTC')::date
      ORDER BY "day" DESC
      LIMIT 7
    )
    SELECT * FROM recent ORDER BY "day" ASC
  `;

  return daily;
}

async function getMovingAverage(monitorId) {
  return prisma.$queryRaw`
    WITH recent_checks AS (
      SELECT checked_at, response_time_ms
      FROM check_results
      WHERE monitor_id = ${monitorId}
        AND is_up = true
      ORDER BY checked_at DESC
      LIMIT 50
    )
    SELECT
      checked_at AS "checkedAt",
      response_time_ms::int AS "responseTimeMs",
      ROUND(
        AVG(response_time_ms) OVER (
          ORDER BY checked_at
          ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
        )
      )::int AS "movingAvgMs"
    FROM recent_checks
    ORDER BY checked_at DESC
  `;
}

async function getRanking(userId) {
  return prisma.$queryRaw`
    WITH monitor_averages AS (
      SELECT
        m.id,
        m.name,
        ROUND(AVG(cr.response_time_ms))::int AS avg_ms
      FROM monitors m
      JOIN check_results cr ON cr.monitor_id = m.id
      WHERE m.user_id = ${userId}
        AND cr.is_up = true
        AND cr.checked_at >= NOW() - INTERVAL '24 hours'
      GROUP BY m.id, m.name
    )
    SELECT
      id::int AS "id",
      name,
      avg_ms::int AS "avgMs",
      RANK() OVER (ORDER BY avg_ms)::int AS "speedRank"
    FROM monitor_averages
    ORDER BY "speedRank", id
  `;
}

async function getDowntime(userId) {
  // Prisma writes started_at and resolved_at as UTC timestamps without a time zone.
  return prisma.$queryRaw`
    SELECT
      m.name,
      COUNT(i.id)::int AS "incidents",
      EXTRACT(EPOCH FROM SUM(
        COALESCE(i.resolved_at, NOW() AT TIME ZONE 'UTC') - i.started_at
      ))::float AS "downtimeSec"
    FROM monitors m
    LEFT JOIN incidents i ON i.monitor_id = m.id
    WHERE m.user_id = ${userId}
    GROUP BY m.id, m.name
    HAVING COUNT(i.id) > 0
    ORDER BY "downtimeSec" DESC, m.id
  `;
}

async function getFailingNow(userId) {
  return prisma.$queryRaw`
    WITH latest_checks AS (
      SELECT DISTINCT ON (m.id)
        m.name,
        c.status_code,
        c.error,
        c.checked_at,
        c.is_up
      FROM monitors m
      JOIN check_results c ON c.monitor_id = m.id
      WHERE m.user_id = ${userId}
        AND c.checked_at = (
          SELECT MAX(c2.checked_at)
          FROM check_results c2
          WHERE c2.monitor_id = m.id
        )
      ORDER BY m.id, c.id DESC
    )
    SELECT
      name,
      status_code AS "statusCode",
      error,
      checked_at AS "checkedAt"
    FROM latest_checks
    WHERE is_up = false
  `;
}

async function getOverview(userId) {
  const [ranking, downtime, failingNow] = await Promise.all([
    getRanking(userId),
    getDowntime(userId),
    getFailingNow(userId),
  ]);

  return { ranking, downtime, failingNow };
}

async function getStats(monitorId) {
  const [stats] = await prisma.$queryRaw`
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
    WHERE m.id = ${monitorId}
    GROUP BY m.id
  `;

  if (!stats) return null;

  const [daily, movingAvg] = await Promise.all([
    getDailyUptime(monitorId),
    getMovingAverage(monitorId),
  ]);

  return {
    ...stats,
    daily,
    movingAvg,
  };
}

async function getPublicStatus() {
  const rows = await prisma.$queryRaw`
    SELECT
      m.id AS "id",
      m.name AS "name",
      m.status::text AS "status",
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
    WHERE m.is_public = true
    GROUP BY m.id
    ORDER BY m.id
  `;

  return rows;
}


module.exports = { getStats, getDailyUptime, getMovingAverage, getOverview, getPublicStatus };
