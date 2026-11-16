const prisma = require('../config/db');
const { checkOne } = require('../services/checker.service');

let running = false;

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
        now - monitor.lastCheckedAt.getTime() >= monitor.intervalSec * 1000
      );
    });

    const results = await Promise.allSettled(
      dueMonitors.map((monitor) => checkOne(monitor))
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
