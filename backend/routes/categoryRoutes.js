// ============================================
// File: backend/routes/categoryRoutes.js
// ============================================

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

/* =========================================
   🔥 CLOUDINARY STORAGE CONFIG
========================================= */

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'roseluxe/categories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp',"heic"],
    transformation: [{ width: 1000, crop: 'limit' }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

/* =========================================
   📦 ROUTES - CORRECT ORDER (SPECIFIC FIRST)
=========================================
   ⚠️ IMPORTANT: Routes are matched in order!
   - Specific routes MUST come BEFORE :id routes
   - Generic routes come LAST
========================================= */

// ✅ SEARCH - specific route, comes FIRST
router.get('/search/:query', categoryController.searchCategories);

// ✅ GET PRODUCTS BY CATEGORY - specific route with nested resource
router.get('/:categoryId/products', categoryController.getProductsByCategory);

// ✅ GET SINGLE category - uses :id parameter, comes before POST
router.get('/:id', categoryController.getSingleCategory);

// ✅ GET ALL categories - generic route, must come AFTER :id
router.get('/', categoryController.getAllCategories);

// ✅ CREATE category (with image upload)
router.post(
  '/',
  upload.single('image'), // field name must be "image"
  categoryController.createCategory
);

// ✅ UPDATE category (optional new image)
router.put(
  '/:id',
  upload.single('image'),
  categoryController.updateCategory
);

// ✅ DELETE category
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;