const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');

/* =========================================
   ROUTES
========================================= */

// BULK DELETE
router.post('/bulk-delete', productController.bulkDeleteProducts);

// SEARCH
router.get('/search/:query', productController.searchProducts);

// GET SINGLE
router.get('/:id', productController.getSingleProduct);

// GET ALL
router.get('/', productController.getAllProducts);

// CREATE PRODUCT
router.post(
  '/',
  upload.array('images', 5),
  productController.createProduct
);

// UPDATE PRODUCT
router.put(
  '/:id',
  upload.array('images', 5),
  productController.updateProduct
);

// DELETE PRODUCT
router.delete('/:id', productController.deleteProduct);

module.exports = router;