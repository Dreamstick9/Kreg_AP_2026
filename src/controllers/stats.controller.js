const statsService = require('../services/stats.service');

async function getOverview(req, res) {
  try {
    const overview = await statsService.getOverview(req.user.id);
    res.json({ data: overview });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
}

module.exports = { getOverview };
