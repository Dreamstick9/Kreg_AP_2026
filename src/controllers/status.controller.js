const { getPublicStatus } = require('../services/stats.service');

const getStatus = async (req, res) => {
  try {
    const rows = await getPublicStatus();
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = { getStatus };
