const prisma = require('../config/db');

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

  return stats || null;
}

module.exports = { getStats };
