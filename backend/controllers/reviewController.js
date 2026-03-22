const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Products');
const Order = require('../models/Order');
const cloudinary = require('cloudinary').v2;
const { filterBadWords } = require('../utils/badWordsFilter');

/**
 * =====================================================================
 * CREATE REVIEW
 * =====================================================================
 */
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

    const filteredComment = filterBadWords(trimmedComment);

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
    const review = new Review({
      orderId,
      userId,
      productId,
      rating: ratingNumber,
      comment: filteredComment,
      images,
      isVerifiedPurchase: true,
    });

    await review.save();

    await review.populate([
      { path: 'userId', select: 'fullName email' },
      { path: 'productId', select: 'name images' },
      { path: 'orderId', select: 'orderId orderDate' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  } catch (error) {
    // =============== ERROR HANDLING ===============

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      console.warn('Duplicate review attempt for:', error.keyValue);
      return res.status(400).json({
        success: false,
        message:
          'You have already reviewed this product for this order. You can edit your existing review instead.',
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
 * =====================================================================
 * GET PRODUCT REVIEWS
 * =====================================================================
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
      .populate('userId', 'fullName email')
      .populate('productId', 'name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ productId });

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

    console.log('Product reviews fetched:', {
      productId,
      count: reviews.length,
      total,
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
 * =====================================================================
 * GET USER REVIEWS
 * =====================================================================
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
      .populate('userId', 'fullName email')
      .populate('productId', 'name images')
      .populate('orderId', 'orderId orderDate orderStatus')
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
 * =====================================================================
 * GET REVIEW BY ID
 * =====================================================================
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
      .populate('userId', 'fullName email')
      .populate('productId', 'name')
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

/**
 * =====================================================================
 * UPDATE REVIEW
 * =====================================================================
 */
exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // =============== VALIDATION ===============

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID format',
      });
    }

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      const ratingNumber = Number(rating);
      if (isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be a number between 1 and 5',
        });
      }
    }

    // Validate comment if provided
    if (comment !== undefined && comment !== null) {
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
          message: 'Comment must be 1000 characters or less',
        });
      }
    }

    // =============== AUTHORIZATION ===============

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Verify user owns this review
    if (review.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own review',
      });
    }

    // =============== UPDATE FIELDS ===============

    if (rating !== undefined && rating !== null) {
      review.rating = Number(rating);
    }

    if (comment !== undefined && comment !== null) {
      const trimmedComment = String(comment).trim();
      review.comment = filterBadWords(trimmedComment);
    }

    // =============== IMAGE HANDLING ===============

    if (req.files && req.files.length > 0) {
      // Validate image count
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
            console.log('Deleted image from Cloudinary:', image.public_id);
          } catch (deleteError) {
            console.error('Failed to delete image:', deleteError);
            // Don't fail the whole request if one image delete fails
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
              max_file_size: 5242880, // 5MB per file
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
            message: 'Failed to upload image(s)',
            details:
              process.env.NODE_ENV === 'development'
                ? uploadError.message
                : undefined,
          });
        }
      }

      review.images = newImages;
    }

    // =============== SAVE & RESPOND ===============

    await review.save();

    await review.populate([
      { path: 'userId', select: 'fullName email' },
      { path: 'productId', select: 'name images' },
      { path: 'orderId', select: 'orderId orderDate' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review,
    });
  } catch (error) {
    console.error('Update review error:', error);

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

    res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * =====================================================================
 * MARK HELPFUL
 * =====================================================================
 * PUT /reviews/:reviewId/helpful
 * Toggle helpful vote on a review
 */
exports.markHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

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

    // Check if user already marked as helpful
    const alreadyMarked = review.helpfulBy.includes(userId);

    if (alreadyMarked) {
      // Remove vote
      review.helpfulBy = review.helpfulBy.filter(
        (id) => id.toString() !== userId
      );
    } else {
      // Add vote
      review.helpfulBy.push(userId);
    }

    // Update helpful count
    review.helpful = review.helpfulBy.length;

    await review.save();

    res.status(200).json({
      success: true,
      message: alreadyMarked ? 'Removed helpful vote' : 'Marked as helpful',
      helpful: review.helpful,
      isHelpful: !alreadyMarked,
    });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update helpful status',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * =====================================================================
 * DELETE REVIEW
 * =====================================================================
 * DELETE /reviews/:reviewId
 * Deletes a review (only owner or admin can delete)
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
          console.log('Deleted image:', image.public_id);
        } catch (deleteError) {
          console.error('Cloudinary delete error:', deleteError);
          // Continue - don't fail if image delete fails
        }
      }
    }

    // Delete review from database
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
 * =====================================================================
 * ADMIN: GET ALL REVIEWS WITH FILTERING & PAGINATION
 * =====================================================================
 */
exports.adminGetAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt', productId, rating } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // =============== BUILD FILTER QUERY ===============

    const filterQuery = {};

    // Filter by productId if provided
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      filterQuery.productId = new mongoose.Types.ObjectId(productId);
    }

    // Filter by rating if provided
    if (rating !== undefined && rating !== null) {
      const ratingNumber = Number(rating);
      if (!isNaN(ratingNumber) && ratingNumber >= 1 && ratingNumber <= 5) {
        filterQuery.rating = ratingNumber;
      }
    }

    console.log('Admin fetching reviews with filter:', filterQuery, 'Page:', pageNum, 'Limit:', limitNum);

    // =============== FETCH REVIEWS ===============

    const reviews = await Review.find(filterQuery)
      .populate('userId', 'fullName email')
      .populate('productId', 'name images')
      .populate('orderId', 'orderId')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Review.countDocuments(filterQuery);

    console.log('Reviews found:', reviews.length, 'Total:', total);

    // =============== CALCULATE RATING STATS FOR ALL REVIEWS ===============

    const ratingStats = await Review.aggregate([
      { $match: filterQuery },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          counts_5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          counts_4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          counts_3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          counts_2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          counts_1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        },
      },
    ]);

    // =============== FORMAT RESPONSE ===============

    let stats = {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: {
        5: { count: 0, percentage: 0 },
        4: { count: 0, percentage: 0 },
        3: { count: 0, percentage: 0 },
        2: { count: 0, percentage: 0 },
        1: { count: 0, percentage: 0 },
      },
    };

    if (ratingStats.length > 0) {
      const aggregated = ratingStats[0];
      const totalForPercentage = aggregated.totalReviews || 1;

      stats = {
        averageRating: parseFloat(aggregated.averageRating.toFixed(1)),
        totalReviews: aggregated.totalReviews,
        ratingDistribution: {
          5: {
            count: aggregated.counts_5,
            percentage: Math.round((aggregated.counts_5 / totalForPercentage) * 100),
          },
          4: {
            count: aggregated.counts_4,
            percentage: Math.round((aggregated.counts_4 / totalForPercentage) * 100),
          },
          3: {
            count: aggregated.counts_3,
            percentage: Math.round((aggregated.counts_3 / totalForPercentage) * 100),
          },
          2: {
            count: aggregated.counts_2,
            percentage: Math.round((aggregated.counts_2 / totalForPercentage) * 100),
          },
          1: {
            count: aggregated.counts_1,
            percentage: Math.round((aggregated.counts_1 / totalForPercentage) * 100),
          },
        },
      };
    }

    console.log('Stats calculated:', stats);

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
      stats,
      filters: {
        productId: productId || null,
        rating: rating ? Number(rating) : null,
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
 * =====================================================================
 * ADMIN: GET PRODUCTS FOR FILTER DROPDOWN
 * =====================================================================
 */
exports.adminGetProductsForFilter = async (req, res) => {
  try {
    console.log('📡 Fetching products for filter...');

    // Get all unique products that have reviews
    const products = await Review.aggregate([
      {
        $group: {
          _id: '$productId',
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $project: {
          _id: '$product._id',
          name: '$product.name', 
          images: '$product.images', 
        },
      },
      {
        $sort: { name: 1 },  
      },
    ]);

    console.log('Products for filter fetched:', products.length);

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Admin get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};