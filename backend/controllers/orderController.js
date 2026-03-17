const Order = require("../models/Order");

// ======================== USER METHODS ========================

// CREATE ORDER
exports.createOrder = async (req, res) => {
  try {
    const { userId, items, shippingInfo, paymentMethod, totals } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No items in order",
      });
    }

    if (!shippingInfo) {
      return res.status(400).json({
        success: false,
        error: "Shipping information is required",
      });
    }

    if (!totals) {
      return res.status(400).json({
        success: false,
        error: "Order totals missing",
      });
    }

    // Generate unique order ID
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
          method: paymentMethod || "cod",
        },
      },
      totals: {
        subtotal: totals.subtotal || 0,
        tax: totals.tax || 0,
        shippingFee: totals.shippingFee || 0,
        totalAmount: totals.totalAmount || 0,
      },
      orderStatus: "pending", // Default status
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("Create order error:", error);
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

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
    });
  }
};

// GET SINGLE ORDER BY ORDER ID
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: "Order ID is required",
      });
    }

    // Try to find by custom orderId first, then MongoDB _id
    let order = await Order.findOne({ orderId });

    if (!order) {
      order = await Order.findById(orderId);
    }

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
    console.error("Get order by ID error:", error);
    res.status(500).json({
      success: false,
      error: "Error retrieving order",
    });
  }
};

// CANCEL ORDER (User - can only cancel pending orders)
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id || req.body.userId; // From auth middleware or body

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: "Order ID is required",
      });
    }

    // Find order by MongoDB _id or custom orderId
    let order = await Order.findById(orderId);

    if (!order) {
      order = await Order.findOne({ orderId });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    // Verify user owns this order (if userId provided)
    if (userId && order.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "You can only cancel your own orders",
      });
    }

    // Only allow cancellation if order is pending
    if (order.orderStatus !== "pending") {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel order. Order status is ${order.orderStatus}`,
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
      error: "Failed to cancel order",
    });
  }
};

// ======================== ADMIN METHODS ========================

// GET ALL ORDERS (Admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
    });
  }
};

// GET ORDERS BY STATUS (Admin only)
exports.getOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Status is required",
      });
    }

    const validStatuses = ["pending", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const orders = await Order.find({ orderStatus: status.toLowerCase() })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Get orders by status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
    });
  }
};

// UPDATE ORDER STATUS (Admin only) - FIXED: Cannot update cancelled orders
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: "Order ID is required",
      });
    }

    if (!orderStatus) {
      return res.status(400).json({
        success: false,
        error: "Order status is required",
      });
    }

    const validStatuses = ["pending", "shipped", "delivered"];
    if (!validStatuses.includes(orderStatus.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}. Cannot set to 'cancelled' via update.`,
      });
    }

    // Find the order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    // Check if order is already cancelled
    if (order.orderStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        error: "Cannot update a cancelled order. Cancelled orders cannot be modified.",
      });
    }

    // Update the status
    order.orderStatus = orderStatus.toLowerCase();
    await order.save();

    res.json({
      success: true,
      message: `Order status updated to ${orderStatus}`,
      data: order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update order status",
    });
  }
};

// DELETE/CANCEL ORDER (Admin only - can cancel any order EXCEPT already cancelled ones)
exports.deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: "Order ID is required",
      });
    }

    // Find the order first
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    // Check if order is already cancelled
    if (order.orderStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        error: "Order is already cancelled. Cannot cancel an already cancelled order.",
      });
    }

    // Update to cancelled
    order.orderStatus = "cancelled";
    order.cancelledAt = new Date();
    await order.save();

    // Optional: Process refund if payment was made
    // if (order.shippingInfo.payment.method === 'gcash') {
    //   await processRefund(order);
    // }

    res.json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    console.error("Delete order error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cancel order",
    });
  }
};

// GET ORDER STATISTICS (Admin only)
exports.getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();

    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totals.totalAmount" },
        },
      },
    ]);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        totalOrders,
        ordersByStatus: ordersByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        totalRevenue: totalRevenue[0]?.totalAmount || 0,
        recentOrders,
      },
    });
  } catch (error) {
    console.error("Get order stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics",
    });
  }
};