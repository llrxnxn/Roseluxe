const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { authenticateToken } = require('../middleware/auth');

/* =========================================
   ROUTES
========================================= */

// BULK DELETE
router.post('/bulk-delete', authenticateToken, discountController.bulkDeleteDiscounts);

// GET ALL
router.get('/', discountController.getAllDiscounts);

// GET SINGLE
router.get('/:id', discountController.getSingleDiscount);

// CREATE DISCOUNT
router.post('/', authenticateToken, discountController.createDiscount);

// UPDATE DISCOUNT
router.put('/:id', authenticateToken, discountController.updateDiscount);

// DELETE DISCOUNT
router.delete('/:id', authenticateToken, discountController.deleteDiscount);

// TOGGLE STATUS
router.patch('/:id/toggle-status', authenticateToken, discountController.toggleDiscountStatus);

module.exports = router;
