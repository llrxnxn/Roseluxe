const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.post('/register', upload.single('picture'), authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/me', authenticateToken, authController.getCurrentUser);
router.put('/update-profile', authenticateToken, upload.single('picture'), authController.updateProfile); 
router.delete('/delete-account', authenticateToken, authController.deleteAccount);

module.exports = router;