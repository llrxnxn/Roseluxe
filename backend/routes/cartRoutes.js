const express = require('express');
const router = express.Router();
const {
  addToCart,
  getCart,
  updateQuantity,
  removeItem,
  clearCart,
  getCartItem
} = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

router.post('/:customerId', authenticateToken, addToCart);
router.get('/:customerId', authenticateToken, getCart);
router.put('/:customerId/:productId', authenticateToken, updateQuantity);
router.delete('/:customerId/:productId', authenticateToken, removeItem);
router.delete('/:customerId', authenticateToken, clearCart);

module.exports = router;