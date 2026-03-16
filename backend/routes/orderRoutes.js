const express = require("express");
const router = express.Router();

const {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
} = require("../controllers/orderController");

// CREATE ORDER
router.post("/", createOrder);

// CANCEL ORDER (put this before :userId to avoid route conflicts)
router.put("/cancel/:orderId", cancelOrder);

// GET SINGLE ORDER by orderId
router.get("/order/:orderId", getOrderById);

// GET USER ORDERS (put this last since :userId is generic)
router.get("/:userId", getUserOrders);

module.exports = router;