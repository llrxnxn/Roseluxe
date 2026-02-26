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

// ✅ SEARCH - must come FIRST before /:id routes
router.get('/search/:query', categoryController.searchCategories);

// ✅ GET SINGLE category - uses :id parameter
router.get('/:id', categoryController.getSingleCategory);

// ✅ GET ALL categories - generic route
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