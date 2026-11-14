const express = require('express');
const { createMonitor, getMonitors } = require('../controllers/monitor.controller');

const router = express.Router();

// TEMP: removed in KL-17
router.use((req, res, next) => { req.user = { id: 1 }; next(); });

router.post('/', createMonitor);
router.get('/', getMonitors);

module.exports = router;
