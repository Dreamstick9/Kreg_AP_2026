const prisma = require('../config/db');

function createMonitor(userId, body) {
  const { name, url, intervalSec = 60, isPublic = false } = body;

  return prisma.monitor.create({
    data: { userId, name, url, intervalSec, isPublic }
  });
}

function getMonitors(userId) {
  return prisma.monitor.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

module.exports = { createMonitor, getMonitors };
