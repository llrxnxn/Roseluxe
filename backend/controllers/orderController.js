const Order = require("../models/Order");
const Cart = require("../models/Cart");

// CREATE ORDER
exports.createOrder = async (req, res) => {
  try {
    const {
      userId,
      items,
      shippingInfo,
      paymentMethod,
      totals,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No items in order",
      });
    }

    if (!totals) {
      return res.status(400).json({
        success: false,
        error: "Order totals missing",
      });
    }

    // Generate order ID
    const orderId =
      "ORD-" +
      Date.now().toString().slice(-6) +
      Math.floor(Math.random() * 1000);

    const order = new Order({
      orderId,
      userId,
      items,
      shippingInfo: {
        ...shippingInfo,
        payment: {
          method: paymentMethod,
        },
      },
      totals: {
        subtotal: totals.subtotal,
        tax: totals.tax,
        shippingFee: totals.shippingFee,
        totalAmount: totals.totalAmount,
      },
    });

    await order.save();

    // remove ordered items from cart
    await Cart.updateOne(
      { userId },
      {
        $pull: {
          items: {
            productId: { $in: items.map((i) => i.productId) },
          },
        },
      }
    );

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.log("Create order error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to create order",
    });
  }
};

// GET USER ORDERS
exports.getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
    });
  }
};

// GET SINGLE ORDER
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error retrieving order",
    });
  }
};

// CANCEL ORDER
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find order by MongoDB _id
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Only allow cancellation if order is pending
    if (order.orderStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order. Order status is ${order.orderStatus}`,
      });
    }

    // Update order status to cancelled
    order.orderStatus = "cancelled";
    order.cancelledAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
    });
  }
};