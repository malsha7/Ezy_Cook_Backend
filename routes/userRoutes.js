const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const  authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // multer for profile image


// POST routes
router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.post('/forgot-password', userController.sendOtp); // renamed to match controller
//router.post('/verify-otp', userController.resetPassword); //  depending on flow

// PUT routes
router.put('/reset-password', userController.resetPassword);
//router.put('/profile', userController.updateProfile);

//get profile
router.get("/profile", authMiddleware, userController.getProfile);

// Profile
router.put('/profile', authMiddleware, upload.single('profileImage'), userController.updateProfile);

module.exports = router;