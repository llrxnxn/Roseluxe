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
  adminGetProductsForFilter,
  markHelpful,
} = require('../controllers/reviewController');

const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');

/**
 * ===================================================================
 * ADMIN ROUTES
 * ===================================================================
 * These must come first to avoid being caught by /:reviewId pattern
 */
router.get('/admin/all-reviews', authenticateToken, adminGetAllReviews);
router.get('/admin/products-for-filter', authenticateToken, adminGetProductsForFilter);

/**
 * ===================================================================
 * USER ROUTES
 * ===================================================================
 * These must come before /:reviewId to avoid param conflicts
 */
router.get('/user/my-reviews', authenticateToken, getUserReviews);

/**
 * ===================================================================
 * PUBLIC ROUTES
 * ===================================================================
 * Anyone can view product reviews
 */
router.get('/product/:productId', getProductReviews);

/**
 * ===================================================================
 * CRUD ROUTES
 * ===================================================================
 */

// CREATE: POST /reviews
router.post(
  '/',
  authenticateToken,
  upload.array('images', 5),
  createReview
);

// UPDATE: PATCH /reviews/:reviewId
// User can update their own review (rating, comment, images)
router.patch(
  '/:reviewId',
  authenticateToken,
  upload.array('images', 5),
  updateReview
);

// MARK HELPFUL: PUT /reviews/:reviewId/helpful
router.put(
  '/:reviewId/helpful',
  authenticateToken,
  markHelpful
);

// DELETE: DELETE /reviews/:reviewId
// User can delete their own review
router.delete(
  '/:reviewId',
  authenticateToken,
  deleteReview
);

/**
 * ===================================================================
 * DETAIL ROUTE
 * ===================================================================
 * Must be LAST to avoid conflicts with /:reviewId pattern
 * GET /reviews/:reviewId - Public, anyone can view a review
 */
router.get('/:reviewId', getReviewById);

module.exports = router;