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

async function getOverview(userId) {
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

module.exports = { getStats, getDailyUptime, getMovingAverage, getOverview };
