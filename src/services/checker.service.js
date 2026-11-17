const prisma = require('../config/db');

const TIMEOUT_MS = 10000;

/**
 * Perform one HTTP check against a monitor.
 * Never throws: failures are reported in the returned object.
 *
 * @param {{ url: string }} monitor
 * @returns {Promise<{ isUp: boolean, statusCode: number|null, responseTimeMs: number, error: string|null }>}
 */
async function checkOne(monitor) {
  const start = performance.now();

  try {
    const res = await fetch(monitor.url, {
      method: 'GET',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const responseTimeMs = Math.round(performance.now() - start);

    // Free the connection; we only care about the status, not the body.
    await res.body?.cancel();

    return {
      isUp: res.ok, // true for 2xx (fetch follows redirects, so this is the final status)
      statusCode: res.status,
      responseTimeMs,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    const responseTimeMs = Math.round(performance.now() - start);

    const error =
      err.name === 'TimeoutError'
        ? `Timed out after ${TIMEOUT_MS}ms`
        : err.cause?.code || err.message; 

    return { isUp: false, statusCode: null, responseTimeMs, error };
  }
}

async function runCheck(monitor) {
  const result = await checkOne(monitor);

  let failures = 0;
  if (!result.isUp) {
    failures = monitor.consecutiveFailures + 1;
  }

  let status = monitor.status;
  if (result.isUp) {
    status = 'UP';
  } else if (failures >= 3) {
    status = 'DOWN';
  }

  await prisma.$transaction([
    prisma.checkResult.create({
      data: {
        monitorId: monitor.id,
        isUp: result.isUp,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        error: result.error
      }
    }),
    prisma.monitor.update({
      where: { id: monitor.id },
      data: {
        lastCheckedAt: new Date(),
        consecutiveFailures: failures,
        status: status
      }
    })
  ]);

  return result;
}

module.exports = { checkOne, runCheck };
