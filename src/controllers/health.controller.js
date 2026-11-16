const prisma = require('../config/db');

const gethealth = async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
};

module.exports = { gethealth };
