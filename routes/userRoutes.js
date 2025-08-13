const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// POST routes
router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.post('/forgot-password', userController.sendOtp); // renamed to match controller
router.post('/verify-otp', userController.resetPassword); // optional depending on flow

// PUT routes
router.put('/reset-password', userController.resetPassword);
router.put('/profile', userController.updateProfile);

module.exports = router;