const monitorService = require('../services/monitor.service');
const statsService = require('../services/stats.service');

async function createMonitor(req, res) {
  try {
    const monitor = await monitorService.createMonitor(req.user.id, req.body);
    res.status(201).json({ data: monitor });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
}

async function getMonitors(req, res) {
  try {
    const monitors = await monitorService.getMonitors(req.user.id);
    res.json({ data: monitors });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
}

async function getMonitorStats(req, res) {
  const monitorId = Number(req.params.id);

  if (!Number.isInteger(monitorId)) {
    return res.status(404).json({ error: 'Monitor not found' });
  }

  try {
    const monitor = await monitorService.getMonitorById(monitorId, req.user.id);

    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    const stats = await statsService.getStats(monitorId);

    if (!stats) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    return res.json({ data: stats });
  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

module.exports = { createMonitor, getMonitors, getMonitorStats };
