const prisma = require('../config/db');
const { runCheck } = require('../services/checker.service');

let running = false;
// lastCheckedAt is saved after a check finishes, so allow a little timing slack.
const DUE_TOLERANCE_MS = 1000;

async function tick() {
  if (running) return;

  running = true;

  try {
    const monitors = await prisma.monitor.findMany({
      where: { isActive: true },
    });

    const now = Date.now();
    const dueMonitors = monitors.filter((monitor) => {
      return (
        monitor.lastCheckedAt === null ||
        now - new Date(monitor.lastCheckedAt).getTime() >=
          monitor.intervalSec * 1000 - DUE_TOLERANCE_MS
      );
    });

    const results = await Promise.allSettled(
      dueMonitors.map((monitor) => runCheck(monitor))
    );

    results.forEach((result, index) => {
      console.log(dueMonitors[index].name, result);
    });
  } catch (error) {
    console.error('Scheduler tick failed:', error.message);
  } finally {
    running = false;
  }
}

function startScheduler() {
  tick();
  return setInterval(tick, 10000);
}

module.exports = { startScheduler };
