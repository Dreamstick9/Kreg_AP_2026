const express = require('express');

const {
    createMonitor,
    getMonitors,
    updateMonitor
} = require('../controllers/monitor.controller');

const asyncHandler = require('../middleware/asyncHandler');
const validateMonitor = require('../middleware/validateMonitor');

const router = express.Router();

// Temporary authentication until KL-17
router.use((req, res, next) => {
    req.user = { id: 1 };
    next();
});

router.post('/', validateMonitor, asyncHandler(createMonitor));
router.get('/', asyncHandler(getMonitors));
router.patch('/:id', validateMonitor, asyncHandler(updateMonitor));

module.exports = router;