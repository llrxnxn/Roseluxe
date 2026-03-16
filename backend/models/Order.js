const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  image: String,
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [orderItemSchema],

    shippingInfo: {
      fullName: { type: String, required: true },
      email: String,
      phone: { type: String, required: true },
      address: { type: String, required: true },
      country: { type: String, default: "Philippines" },
      payment: {
        method: { type: String, enum: ["cod", "gcash"], default: "cod" },
      },
    },

    totals: {
        subtotal: { type: Number, required: true },
        tax: { type: Number, required: true },
        shippingFee: { type: Number, required: true },
        totalAmount: { type: Number, required: true },
        },

    orderStatus: {
      type: String,
      enum: ["pending", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);