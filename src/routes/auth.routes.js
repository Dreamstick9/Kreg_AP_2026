const auth = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.get('/me', auth, authController.me);

module.exports = router;