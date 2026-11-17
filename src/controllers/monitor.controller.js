const monitorService = require('../services/monitor.service');
const statsService = require('../services/stats.service');

// Services throw errors with a statusCode (e.g. 400) for bad input.
function handleError(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  res.status(500).json({ error: 'Something went wrong' });
}

// Same 404 for "doesn't exist" and "belongs to someone else".
const notFound = (res) => res.status(404).json({ error: 'Monitor not found' });

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
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const requestedLimit = req.query.limit === undefined ? 10 : Number(req.query.limit);

    if (!Number.isSafeInteger(page) || page < 1) {
      return res.status(400).json({ error: 'page: must be a positive integer' });
    }

    if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
      return res.status(400).json({ error: 'limit: must be a positive integer' });
    }

    const limit = Math.min(requestedLimit, 50);
    const { monitors, total } = await monitorService.getMonitors(req.user.id, page, limit);

    res.status(200).json({ data: monitors, page, limit, total });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
}

async function getMonitor(req, res) {
  try {
    const monitor = await monitorService.getMonitor(req.user.id, req.params.id);
    if (!monitor) return notFound(res);
    res.json({ data: monitor });
  } catch (error) {
    handleError(res, error);
  }
}

async function getMonitorStats(req, res) {
  try {
    const monitor = await monitorService.getMonitor(req.user.id, req.params.id);
    if (!monitor) return notFound(res);

    const stats = await statsService.getStats(monitor.id);
    if (!stats) return notFound(res);

    res.json({ data: stats });
  } catch (error) {
    handleError(res, error);
  }
}

async function updateMonitor(req, res) {
  try {
    const monitor = await monitorService.updateMonitor(req.user.id, req.params.id, req.body);
    if (!monitor) return notFound(res);
    res.json({ data: monitor });
  } catch (error) {
    handleError(res, error);
  }
}

async function deleteMonitor(req, res) {
  try {
    const deleted = await monitorService.deleteMonitor(req.user.id, req.params.id);
    if (!deleted) return notFound(res);
    res.status(204).end();
  } catch (error) {
    handleError(res, error);
  }
}

module.exports = {
  createMonitor,
  getMonitors,
  getMonitor,
  getMonitorStats,
  updateMonitor,
  deleteMonitor,
};
