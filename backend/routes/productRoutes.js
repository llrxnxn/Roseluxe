const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

/* =========================================
   🔥 CLOUDINARY STORAGE CONFIG
========================================= */

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'roseluxe/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1000, crop: 'limit' }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

/* =========================================
   📦 ROUTES - CORRECT ORDER (SPECIFIC FIRST)
========================================= */

// ✅ BULK DELETE - must come before /:id routes
router.post('/bulk-delete', productController.bulkDeleteProducts);

// ✅ SEARCH - must come before /:id routes
router.get('/search/:query', productController.searchProducts);

// ✅ GET SINGLE - uses :id parameter
router.get('/:id', productController.getSingleProduct);

// ✅ GET ALL - generic route, must come after specific ones
router.get('/', productController.getAllProducts);

// ✅ CREATE (with image upload)
router.post(
  '/',
  upload.array('images', 5), // field name must be "images"
  productController.createProduct
);

// ✅ UPDATE (optional new images)
router.put(
  '/:id',
  upload.array('images', 5),
  productController.updateProduct
);

// ✅ DELETE single
router.delete('/:id', productController.deleteProduct);

module.exports = router;