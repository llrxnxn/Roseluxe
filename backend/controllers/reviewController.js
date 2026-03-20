const mongoose = require('mongoose');
const Review = require('../models/Review');
const Order = require('../models/Order');
const cloudinary = require('cloudinary').v2;


exports.createReview = async (req, res) => {
  try {
    const { orderId, productId, rating, comment } = req.body;
    const userId = req.user.id; // from auth middleware

    // =============== VALIDATION ===============

    // Check all required fields present
    if (!orderId || !productId || rating === undefined || rating === null || !comment) {
      const missingFields = [];
      if (!orderId) missingFields.push('orderId');
      if (!productId) missingFields.push('productId');
      if (rating === undefined || rating === null) missingFields.push('rating');
      if (!comment) missingFields.push('comment');

      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields,
      });
    }

    // ✅ FIXED: Convert rating to number (handles string from FormData)
    const ratingNumber = Number(rating);
    
    // Validate rating is a number between 1-5
    if (isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be a number between 1 and 5',
      });
    }

    // Validate comment
    const trimmedComment = String(comment).trim();
    if (trimmedComment.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Review comment cannot be empty',
      });
    }
    if (trimmedComment.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Review comment must be 1000 characters or less',
      });
    }

    // Validate MongoDB ObjectIds format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    // =============== BUSINESS LOGIC ===============

    // Check if order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Verify user owns this order
    if (order.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only review your own orders',
      });
    }

    // Check if order is delivered
    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: `Cannot review order with status "${order.orderStatus}". Only delivered orders can be reviewed.`,
      });
    }

    // =============== IMAGE UPLOAD ===============

    let images = [];
    if (req.files && req.files.length > 0) {
      // Enforce image limit
      if (req.files.length > 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 images allowed per review',
        });
      }

      for (const file of req.files) {
        try {
          // Upload to Cloudinary
          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            {
              folder: 'roseluxe/reviews',
              resource_type: 'auto',
              max_file_size: 5242880, // 5MB per file
            }
          );

          images.push({
            public_id: result.public_id,
            url: result.secure_url,
          });
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          return res.status(400).json({
            success: false,
            message: 'Failed to upload image(s)',
            details:
              process.env.NODE_ENV === 'development'
                ? uploadError.message
                : undefined,
          });
        }
      }
    }

    // =============== CREATE REVIEW ===============

    // Let MongoDB handle uniqueness via the compound index
    // This prevents race conditions that manual checks don't catch
    const review = new Review({
      orderId,
      userId,
      productId,
      rating: ratingNumber, // ✅ Use converted number
      comment: trimmedComment,
      images,
      isVerifiedPurchase: true,
    });

    await review.save();

    // ✅ FIXED: Populate user data properly with fullName field
    await review.populate([
      { path: 'userId', select: 'fullName email' },
      { path: 'productId', select: 'productName productImage' },
      { path: 'orderId', select: 'orderId orderDate' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  } catch (error) {
    // =============== ERROR HANDLING ===============

    // Handle MongoDB duplicate key error (E11000)
    if (error.code === 11000) {
      console.warn('⚠️ Duplicate review attempt for:', error.keyValue);
      return res.status(400).json({
        success: false,
        message:
          'You have already reviewed this product for this order. Each order can only be reviewed once.',
      });
    }

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.entries(error.errors).map(
        ([field, err]) => `${field}: ${err.message}`
      );
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessages,
      });
    }

    // Handle MongoDB cast errors (invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `Invalid ${error.path} format`,
      });
    }

    // Generic server error
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create review',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET ALL REVIEWS FOR A PRODUCT
 * GET /api/reviews/product/:productId
 * ✅ FIXED: Properly populates fullName and email fields
 */
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const skip = (page - 1) * limit;

    // Validate productId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    const reviews = await Review.find({ productId })
      .populate('userId', 'fullName email') // ← ✅ FIXED: Select fullName field
      .populate('productId', 'productName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ productId });

    // Calculate average rating and stats
    // ✅ FIXED: Properly convert to ObjectId for aggregation
    const ratingStats = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating',
          },
        },
      },
    ]);

    console.log('Reviews populated:', {
      count: reviews.length,
      firstReview: reviews[0] ? {
        id: reviews[0]._id,
        userId: reviews[0].userId,
        userName: reviews[0].userId?.fullName,
        userEmail: reviews[0].userId?.email,
      } : null,
    });

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
      stats: ratingStats[0] || {
        averageRating: 0,
        totalReviews: 0,
      },
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET USER'S REVIEWS
 * GET /api/reviews/user/my-reviews
 * Returns all reviews created by the authenticated user
 * ✅ FIXED: Properly populates fullName field
 */
exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID not found in authentication token',
      });
    }

    const reviews = await Review.find({ userId })
      .populate('userId', 'fullName email') // ← ✅ FIXED: Select fullName field
      .populate('productId', 'productName productImage')
      .populate('orderId', 'orderId orderDate')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your reviews',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET SINGLE REVIEW BY ID
 * GET /api/reviews/:reviewId
 * ✅ FIXED: Properly populates fullName field
 */
exports.getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Validate reviewId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID format',
      });
    }

    const review = await Review.findById(reviewId)
      .populate('userId', 'fullName email') // ← ✅ FIXED: Select fullName field
      .populate('productId', 'productName')
      .populate('orderId', 'orderId orderDate');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Validate reviewId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID format',
      });
    }

    // Validation for optional fields
    if (rating !== undefined && rating !== null) {
      const ratingNumber = Number(rating);
      if (isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
        return res.status(400).json({
          success: false,
          message: 'If provided, rating must be a number between 1 and 5',
        });
      }
    }

    if (comment && String(comment).trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Comment must be 1000 characters or less',
      });
    }

    // Find review
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check if user owns the review
    if (review.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own review',
      });
    }

    // Update fields (only if provided)
    if (rating !== undefined && rating !== null) review.rating = Number(rating);
    if (comment) review.comment = String(comment).trim();

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      // Limit to 5 images
      if (req.files.length > 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 images allowed per review',
        });
      }

      // Delete old images from Cloudinary
      if (review.images && review.images.length > 0) {
        for (const image of review.images) {
          try {
            await cloudinary.uploader.destroy(image.public_id);
          } catch (deleteError) {
            console.error('Cloudinary delete error:', deleteError);
            // Continue - don't fail if old image delete fails
          }
        }
      }

      // Upload new images
      let newImages = [];
      for (const file of req.files) {
        try {
          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            {
              folder: 'roseluxe/reviews',
              resource_type: 'auto',
              max_file_size: 5242880,
            }
          );

          newImages.push({
            public_id: result.public_id,
            url: result.secure_url,
          });
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          return res.status(400).json({
            success: false,
            message: 'Failed to upload images',
            details:
              process.env.NODE_ENV === 'development'
                ? uploadError.message
                : undefined,
          });
        }
      }

      review.images = newImages;
    }

    await review.save();

    // ✅ FIXED: Populate with fullName field
    await review.populate([
      { path: 'userId', select: 'fullName email' },
      { path: 'productId', select: 'productName' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review,
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * DELETE REVIEW
 * DELETE /api/reviews/:reviewId
 * User can only delete their own review
 * ✅ VERIFIED: Correct implementation
 */
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    // Validate reviewId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID format',
      });
    }

    // Find review
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check if user owns the review
    if (review.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own review',
      });
    }

    // Delete images from Cloudinary
    if (review.images && review.images.length > 0) {
      for (const image of review.images) {
        try {
          await cloudinary.uploader.destroy(image.public_id);
        } catch (deleteError) {
          console.error('Cloudinary delete error:', deleteError);
          // Continue - don't fail if image delete fails
        }
      }
    }

    // Delete review
    await Review.findByIdAndDelete(reviewId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * ADMIN - GET ALL REVIEWS
 * GET /api/reviews/admin/all-reviews
 * ✅ FIXED: Properly populates fullName field
 */
exports.adminGetAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const skip = (page - 1) * limit;

    // ✅ FIXED: Populate user data with fullName field
    const reviews = await Review.find()
      .populate('userId', 'fullName email') // ← ✅ FIXED: Select fullName field
      .populate('productId', 'productName')
      .populate('orderId', 'orderId')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments();

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * ADMIN - DELETE REVIEW
 * DELETE /api/reviews/admin/:reviewId
 * ✅ VERIFIED: Correct implementation
 */
exports.adminDeleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Validate reviewId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID format',
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Delete images from Cloudinary
    if (review.images && review.images.length > 0) {
      for (const image of review.images) {
        try {
          await cloudinary.uploader.destroy(image.public_id);
        } catch (deleteError) {
          console.error('Cloudinary delete error:', deleteError);
        }
      }
    }

    await Review.findByIdAndDelete(reviewId);

    res.status(200).json({
      success: true,
      message: 'Review deleted by admin',
    });
  } catch (error) {
    console.error('Admin delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};