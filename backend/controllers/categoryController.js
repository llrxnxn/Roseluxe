// ============================================
// File: backend/controllers/categoryController.js
// ============================================

const Category = require('../models/Category');
const cloudinary = require('cloudinary').v2;

/* =========================================
   GET ALL CATEGORIES
========================================= */
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      categories,
      count: categories.length,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
    });
  }
};

/* =========================================
   GET SINGLE CATEGORY
========================================= */
exports.getSingleCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();

    if (!category || !category.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
    });
  }
};

/* =========================================
   CREATE CATEGORY
========================================= */
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Category image is required',
      });
    }

    // Check if category name already exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists',
      });
    }

    const newCategory = new Category({
      name: name.trim(),
      description: description.trim(),
      image: req.file.path, // Cloudinary URL
    });

    await newCategory.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: newCategory,
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating category',
    });
  }
};

/* =========================================
   UPDATE CATEGORY
========================================= */
exports.updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const categoryId = req.params.id;

    const category = await Category.findById(categoryId);

    if (!category || !category.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Check if new name already exists (and it's not the same category)
    if (name && name.trim() !== category.name) {
      const existingCategory = await Category.findOne({ name: name.trim() });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category name already exists',
        });
      }
    }

    if (name) category.name = name.trim();
    if (description) category.description = description.trim();

    // Replace image if new one uploaded
    if (req.file) {
      // Delete old image from Cloudinary
      if (category.image) {
        const publicId = category.image.split('/').pop().split('.')[0];
        try {
          await cloudinary.uploader.destroy(`roseluxe/categories/${publicId}`);
        } catch (err) {
          console.log('Cloudinary delete error:', err);
        }
      }

      category.image = req.file.path;
    }

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      category,
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category',
    });
  }
};

/* =========================================
   DELETE CATEGORY (SOFT DELETE)
========================================= */
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category || !category.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Delete image from Cloudinary
    if (category.image) {
      const publicId = category.image.split('/').pop().split('.')[0];
      try {
        await cloudinary.uploader.destroy(`roseluxe/categories/${publicId}`);
      } catch (err) {
        console.log('Cloudinary delete error:', err);
      }
    }

    category.isActive = false;
    await category.save();

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
    });
  }
};

/* =========================================
   SEARCH CATEGORIES
========================================= */
exports.searchCategories = async (req, res) => {
  try {
    const { query } = req.params;

    const categories = await Category.find({
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      categories,
      count: categories.length,
    });
  } catch (error) {
    console.error('Error searching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching categories',
    });
  }
};