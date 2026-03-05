const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        image: {
          type: String,
        },
      },
    ],
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate totals before saving
cartSchema.pre('save', function () {
  if (this.items.length === 0) {
    this.subtotal = 0;
    this.tax = 0;
    this.total = 0;
    return;
  }

  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  // Calculate tax (12% VAT)
  this.tax = this.subtotal * 0.12;

  // Calculate total
  this.total = this.subtotal + this.tax;
});

const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
module.exports = Cart;