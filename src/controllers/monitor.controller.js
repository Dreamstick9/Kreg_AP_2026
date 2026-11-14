const monitorService = require('../services/monitor.service');

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

module.exports = { createMonitor, getMonitors };
