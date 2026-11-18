const statsService = require('../services/stats.service');

async function getOverview(req, res) {
  try {
    const ranking = await statsService.getOverview(req.user.id);
    res.json({ data: { ranking } });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
}

module.exports = { getOverview };
