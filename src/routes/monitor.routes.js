const express = require('express');
const { createMonitor, getMonitors } = require('../controllers/monitor.controller');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// TEMP: removed in KL-17
router.use((req, res, next) => { req.user = { id: 1 }; next(); });

router.post('/', asyncHandler(createMonitor));
router.get('/', asyncHandler(getMonitors));

module.exports = router;
