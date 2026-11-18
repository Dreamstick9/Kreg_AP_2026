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

  const daily = await getDailyUptime(monitorId);

  return {
    ...stats,
    daily,
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

module.exports = { getStats, getDailyUptime, getPublicStatus };
