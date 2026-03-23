const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 3,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    maxAmount: {
      type: Number,
      default: null,
    },
    minPurchaseAmount: {
      type: Number,
      default: 0,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    maxUsagePerUser: {
      type: Number,
      default: null,
    },
    totalUsageLimit: {
      type: Number,
      default: null,
    },
    totalUsed: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding active discounts
discountSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });

const Discount = mongoose.models.Discount || mongoose.model('Discount', discountSchema);
module.exports = Discount;
