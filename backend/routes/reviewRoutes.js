const express = require('express');
const router = express.Router();
const {
  createReview,
  getProductReviews,
  getUserReviews,
  getReviewById,
  updateReview,
  deleteReview,
  adminGetAllReviews,
  adminDeleteReview,
} = require('../controllers/reviewController');

const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth'); // ✅ FIXED IMPORT

// Admin routes
router.get('/admin/all-reviews', authenticateToken, adminGetAllReviews);
router.delete('/admin/:reviewId', authenticateToken, adminDeleteReview);

// User routes - MUST come before /:reviewId
router.get('/user/my-reviews', authenticateToken, getUserReviews);

// Public routes
router.get('/product/:productId', getProductReviews);

// CRUD
router.post('/', authenticateToken, upload.array('images', 5), createReview);
router.put('/:reviewId', authenticateToken, upload.array('images', 5), updateReview);
router.delete('/:reviewId', authenticateToken, deleteReview);

// Must be LAST
router.get('/:reviewId', getReviewById);

module.exports = router;