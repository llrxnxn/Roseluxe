const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");

// IMPORT CONTROLLERS
const {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  getOrdersByStatus,
  updateOrderStatus,
  deleteOrder,
  getOrderStats,
} = require("../controllers/orderController");

// IMPORT MIDDLEWARE (if you have auth middleware)
// const { verifyToken, verifyAdmin } = require("../middleware/auth");

// ================= ADMIN ROUTES (MUST BE FIRST) =================

// GET ORDER STATISTICS
router.get("/admin/stats/dashboard", authenticateToken, getOrderStats);
router.get("/admin/all-orders", authenticateToken, getAllOrders);

// UPDATE ORDER STATUS (Admin only - cannot set to 'cancelled' via this endpoint, cannot update already cancelled orders)
router.patch("/admin/:orderId/update-status", authenticateToken, updateOrderStatus);

// DELETE/CANCEL ORDER (Admin only - cannot cancel already cancelled orders)
router.delete("/admin/:orderId", authenticateToken, deleteOrder);

// GET ORDERS BY STATUS
router.get("/admin/by-status/:status", authenticateToken, getOrdersByStatus);



// ================= USER ROUTES (AFTER ADMIN) =================

// CREATE ORDER
router.post("/", createOrder);

// GET SINGLE ORDER (by orderId in body/params)
router.get("/order/:orderId", getOrderById);

// CANCEL ORDER (User can only cancel pending orders)
router.put("/:orderId/cancel", cancelOrder);

// GET USER ORDERS (MUST BE LAST - generic :userId)
router.get("/:userId", getUserOrders);

module.exports = router;