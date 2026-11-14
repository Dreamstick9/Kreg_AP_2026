const express = require('express');
const { gethealth } = require('../controllers/health.controller');

const router = express.Router();

router.get('/', gethealth)

module.exports = router;