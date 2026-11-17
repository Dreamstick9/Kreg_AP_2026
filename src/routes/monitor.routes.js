const express = require('express');
const {
  createMonitor,
  getMonitors,
  getMonitor,
  getMonitorStats,
  updateMonitor,
  deleteMonitor,
} = require('../controllers/monitor.controller');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// TEMP: removed in KL-17
router.use((req, res, next) => { req.user = { id: 1 }; next(); });

router.post('/', asyncHandler(createMonitor));
router.get('/', asyncHandler(getMonitors));
router.get('/:id/stats', asyncHandler(getMonitorStats));
router.get('/:id', asyncHandler(getMonitor));
router.patch('/:id', asyncHandler(updateMonitor));
router.delete('/:id', asyncHandler(deleteMonitor));

module.exports = router;
