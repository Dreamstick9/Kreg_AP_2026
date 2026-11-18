const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const statsController = require('../controllers/stats.controller');

const router = express.Router();

router.use(auth);
router.get('/overview', asyncHandler(statsController.getOverview));

module.exports = router;
