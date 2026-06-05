const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegistration, validateLogin, handleValidation } = require('../middleware/validate');
const authenticate = require('../middleware/auth');

router.post('/register', validateRegistration, handleValidation, authController.register);
router.post('/login', validateLogin, handleValidation, authController.login);
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;