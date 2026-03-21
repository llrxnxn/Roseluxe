const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      trim: true,
    },
    images: [
      {
        public_id: String,
        url: String, 
      },
    ],
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
    helpfulBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

/**
 * IMPORTANT: This unique index prevents duplicate reviews
 * It ensures user can only review each PRODUCT once per ORDER
 */
reviewSchema.index({ orderId: 1, productId: 1, userId: 1 }, { unique: true });

reviewSchema.index({ userId: 1, createdAt: -1 }); // Get user's reviews
reviewSchema.index({ productId: 1, createdAt: -1 }); // Get product reviews
reviewSchema.index({ orderId: 1 }); // Get reviews for an order

module.exports = mongoose.model('Review', reviewSchema);