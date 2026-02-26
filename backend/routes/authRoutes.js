const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.post('/register', upload.single('picture'), authController.register);
router.post('/login', authController.login);
router.post('/google-login', authController.googleLogin);

// Protected routes
router.get('/me', authenticateToken, authController.getCurrentUser);
router.put('/update-profile', authenticateToken, upload.single('picture'), authController.updateProfile);  // ← ADD THIS

module.exports = router;