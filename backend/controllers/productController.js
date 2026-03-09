const Product = require('../models/Products');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary to auto-convert unsupported formats
cloudinary.config({
  // Your existing config is here
  // Add these settings for better image handling:
  secure: true,
  api_version: 'v1_1',
});

/* =========================================
   VALIDATION HELPERS
========================================= */

const validateProductData = (data) => {
  const errors = {};

  // Name validation
  if (!data.name || !data.name.trim()) {
    errors.name = 'Product name is required';
  } else if (data.name.trim().length < 1) {
    errors.name = 'Product name must be at least 1 character';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Product name cannot exceed 100 characters';
  }

  // Description validation
  if (!data.description || !data.description.trim()) {
    errors.description = 'Description is required';
  } else if (data.description.trim().length < 1) {
    errors.description = 'Description must be at least 1 character';
  }

  // Price validation
  if (data.price === undefined || data.price === null || data.price === '') {
    errors.price = 'Price is required';
  } else {
    const parsedPrice = parseFloat(data.price);
    if (isNaN(parsedPrice)) {
      errors.price = 'Price must be a valid number';
    } else if (parsedPrice < 0) {
      errors.price = 'Price cannot be negative';
    } else if (parsedPrice === 0) {
      errors.price = 'Price must be greater than 0';
    }
  }

  // Stock validation (optional, but if provided must be valid)
  if (data.stock !== undefined && data.stock !== null && data.stock !== '') {
    const parsedStock = parseInt(data.stock);
    if (isNaN(parsedStock)) {
      errors.stock = 'Stock must be a valid number';
    } else if (parsedStock < 0) {
      errors.stock = 'Stock cannot be negative';
    }
  }

  // Category validation
  if (!data.category || !data.category.trim()) {
    errors.category = 'Category is required';
  }

  return errors;
};

/* =========================================
   CLOUDINARY UPLOAD WITH HEIC CONVERSION
========================================= */

/**
 * Upload image to Cloudinary with auto-conversion for HEIC files
 * @param {Buffer} fileBuffer - File content from multer
 * @param {String} fileName - Original file name
 * @param {String} mimeType - File MIME type
 * @returns {Promise} Cloudinary response with image URL
 */
const uploadToCloudinary = (fileBuffer, fileName, mimeType) => {
  return new Promise((resolve, reject) => {

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'roseluxe/products',
        quality: 'auto',
        timeout: 60000
      },
      (error, result) => {

        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result);
        }

      }
    );

    uploadStream.end(fileBuffer);

  });
};

/* =========================================
   GET ALL PRODUCTS
========================================= */
exports.getAllProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice } = req.query;

    let filter = { isActive: true };

    // SEARCH
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    // CATEGORY
    if (category && category !== "All") {
      filter.category = category;
    }

    // PRICE RANGE
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(filter)
      .populate("category", "name description image")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      products,
      count: products.length
    });

  } catch (error) {
    console.error("Error fetching products:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message
    });
  }
};

/* =========================================
   GET SINGLE PRODUCT
========================================= */
exports.getSingleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name description image')
      .lean();

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message,
    });
  }
};

/* =========================================
   CREATE PRODUCT
========================================= */
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;

    console.log('CREATE PRODUCT REQUEST');
    console.log('Data received:', { name, description, price, stock, category });
    console.log('Files received:', {
      count: req.files?.length || 0,
      details: req.files?.map(f => ({
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size
      })) || []
    });

    // VALIDATION
    const errors = validateProductData({
      name,
      description,
      price,
      stock,
      category,
    });

    if (Object.keys(errors).length > 0) {
      console.log('Validation errors:', errors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // IMAGE VALIDATION
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: {
          images: 'At least one image is required',
        },
      });
    }

    // Log image types
    console.log('Processing images for upload:');
    req.files.forEach((file, index) => {
      console.log(`  [${index}] ${file.originalname} - ${file.mimetype} (${(file.size / 1024).toFixed(2)} KB)`);
    });

    // Upload images to Cloudinary
    const imageUrls = [];
    const uploadPromises = req.files.map(async (file) => {
      try {
        const result = await uploadToCloudinary(
          file.buffer,
          file.originalname,
          file.mimetype
        );
        imageUrls.push(result.secure_url);
      } catch (uploadError) {
        throw new Error(`Failed to upload image ${file.originalname}: ${uploadError.message}`);
      }
    });

    await Promise.all(uploadPromises);

    console.log(`Uploaded ${imageUrls.length} images to Cloudinary`);

    // Create new product
    const newProduct = new Product({
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      stock: stock ? parseInt(stock) : 0,
      category: category.trim(),
      images: imageUrls,
    });

    await newProduct.save();

    // Fetch populated product
    const savedProduct = await Product.findById(newProduct._id)
      .populate('category', 'name description image');

    console.log('Product created successfully:', {
      id: newProduct._id,
      name: newProduct.name,
      imageCount: imageUrls.length,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: savedProduct,
    });

  } catch (error) {
    console.error('Error creating product:', error);

    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message,
    });
  }
};

/* =========================================
   UPDATE PRODUCT
========================================= */

exports.updateProduct = async (req, res) => {
  try {
    console.log('UPDATE PRODUCT REQUEST');
    console.log('Product ID:', req.params.id);

    const { name, description, price, stock, category } = req.body;
    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    /* ================= VALIDATION ================= */

    let errors = {};

    if (name !== undefined) {
      if (!name || !name.trim()) {
        errors.name = 'Product name is required';
      } else if (name.trim().length > 100) {
        errors.name = 'Product name cannot exceed 100 characters';
      }
    }

    if (description !== undefined) {
      if (!description || !description.trim()) {
        errors.description = 'Description is required';
      }
    }

    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice)) {
        errors.price = 'Price must be a valid number';
      } else if (parsedPrice <= 0) {
        errors.price = 'Price must be greater than 0';
      }
    }

    if (stock !== undefined && stock !== '') {
      const parsedStock = parseInt(stock);
      if (isNaN(parsedStock)) {
        errors.stock = 'Stock must be a valid number';
      } else if (parsedStock < 0) {
        errors.stock = 'Stock cannot be negative';
      }
    }

    if (category !== undefined) {
      if (!category || !category.trim()) {
        errors.category = 'Category is required';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    /* ================= UPDATE FIELDS ================= */

    if (name) product.name = name.trim();
    if (description) product.description = description.trim();
    if (price !== undefined && price !== '') product.price = parseFloat(price);
    if (stock !== undefined && stock !== '') product.stock = parseInt(stock);
    if (category) product.category = category.trim();

    /* ================= IMAGE HANDLING ================= */

    if (req.files && req.files.length > 0) {

      console.log('Uploading new images...');

      const newImageUrls = [];

      const uploadPromises = req.files.map(async (file) => {

        const result = await uploadToCloudinary(
          file.buffer,
          file.originalname,
          file.mimetype
        );

        newImageUrls.push(result.secure_url);

      });

      await Promise.all(uploadPromises);

      // IMPORTANT: KEEP OLD + ADD NEW
      product.images = [...product.images, ...newImageUrls];

      console.log('Total images after update:', product.images.length);

    } else {

      console.log('No new images uploaded. Keeping existing images.');

    }

    /* ================= SAVE ================= */

    await product.save();

    const savedProduct = await Product.findById(productId)
      .populate('category', 'name description image');

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: savedProduct,
    });

  } catch (error) {

    console.error('Error updating product:', error);

    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message,
    });

  }
};

/* =========================================
   DELETE PRODUCT (SOFT DELETE)
========================================= */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Delete images from Cloudinary
    console.log('Deleting product images from Cloudinary...');
    const deletionPromises = product.images.map(async (imageUrl) => {
      try {
        const publicId = imageUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`roseluxe/products/${publicId}`);
        console.log('Deleted:', publicId);
      } catch (err) {
        console.log('Cloudinary delete error:', err);
      }
    });

    await Promise.all(deletionPromises);

    // Soft delete
    product.isActive = false;
    await product.save();

    console.log('Product deleted successfully:', req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message,
    });
  }
};

/* =========================================
   BULK DELETE (SOFT)
========================================= */
exports.bulkDeleteProducts = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product IDs',
      });
    }

    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
    });

    console.log('Bulk deleting products:', productIds.length);

    // Delete all images from Cloudinary
    for (const product of products) {
      const deletionPromises = product.images.map(async (imageUrl) => {
        try {
          const publicId = imageUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`roseluxe/products/${publicId}`);
        } catch (err) {
          console.log('Cloudinary delete error:', err);
        }
      });

      await Promise.all(deletionPromises);
    }

    // Soft delete all products
    await Product.updateMany(
      { _id: { $in: productIds } },
      { isActive: false }
    );

    console.log('Bulk deleted successfully:', products.length, 'products');

    res.json({
      success: true,
      message: `${products.length} products deleted successfully`,
      deletedCount: products.length,
    });
  } catch (error) {
    console.error('Error bulk deleting products:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting products',
      error: error.message,
    });
  }
};

/* =========================================
   SEARCH PRODUCTS
========================================= */
exports.searchProducts = async (req, res) => {
  try {
    const { query } = req.params;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
    }

    const products = await Product.find({
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    })
      .populate('category', 'name description image')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      products,
      count: products.length,
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching products',
      error: error.message,
    });
  }
};

/* =========================================
   GET BY CATEGORY
========================================= */
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    console.log('Getting products for category:', categoryId);

    const products = await Product.find({
      isActive: true,
      category: categoryId,
    })
      .populate('category', 'name description image')
      .sort({ createdAt: -1 })
      .lean();

    console.log('Found products:', products.length);

    res.json({
      success: true,
      products,
      count: products.length,
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message,
    });
  }
};