const Product = require('../models/Products');
const cloudinary = require('cloudinary').v2;

/* =========================================
   GET ALL PRODUCTS
========================================= */
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('category', 'name description image') // ✅ POPULATE CATEGORY
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      products,
      count: products.length,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message,
    });
  }
};

/* =========================================
   GET SINGLE PRODUCT
========================================= */
exports.getSingleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name description image') // ✅ POPULATE CATEGORY
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
   CREATE PRODUCT - ✅ FIXED VERSION
========================================= */
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;

    // ✅ BETTER VALIDATION with clear messages
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['name', 'description', 'price', 'category'],
        received: { name, description, price, category },
      });
    }

    // Validate price
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid positive number',
      });
    }

    // Validate stock (optional, defaults to 0)
    let productStock = 0;
    if (stock !== undefined && stock !== null && stock !== '') {
      productStock = parseInt(stock);
      if (isNaN(productStock) || productStock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Stock must be a non-negative number',
        });
      }
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required',
      });
    }

    // ✅ Log for debugging
    console.log('Creating product with data:', {
      name,
      description,
      price: parsedPrice,
      stock: productStock,
      category,
      imagesCount: req.files.length,
    });

    const imageUrls = req.files.map((file) => file.path);

    const newProduct = new Product({
      name: name.trim(),
      description: description.trim(),
      price: parsedPrice,
      stock: productStock,
      category: category, // ✅ Now expects ObjectId
      images: imageUrls,
    });

    await newProduct.save();

    // ✅ Populate category before response
    const savedProduct = await Product.findById(newProduct._id)
      .populate('category', 'name description image');

    console.log('✅ Product created successfully:', newProduct._id);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: savedProduct,
    });
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message,
    });
  }
};

/* =========================================
   UPDATE PRODUCT - ✅ FIXED VERSION
========================================= */
exports.updateProduct = async (req, res) => {
  try {
    console.log('\n🟦 UPDATE PRODUCT REQUEST');
    console.log('Product ID:', req.params.id);
    console.log('Body:', req.body);
    console.log('Files:', req.files?.length || 0);

    const { name, description, price, stock, category } = req.body;
    const productId = req.params.id;

    // ✅ Find product (use exec() to ensure it's not lean)
    const product = await Product.findById(productId);

    if (!product) {
      console.error('❌ Product not found:', productId);
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (!product.isActive) {
      console.error('❌ Product is not active:', productId);
      return res.status(404).json({
        success: false,
        message: 'Product not found or is inactive',
      });
    }

    console.log('✅ Product found:', product._id);

    // ✅ Update fields (only if provided)
    if (name && name.trim()) {
      product.name = name.trim();
      console.log('Updated name to:', product.name);
    }

    if (description && description.trim()) {
      product.description = description.trim();
      console.log('Updated description');
    }

    if (price !== undefined && price !== null && price !== '') {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a valid positive number',
        });
      }
      product.price = parsedPrice;
      console.log('Updated price to:', product.price);
    }

    if (stock !== undefined && stock !== null && stock !== '') {
      const parsedStock = parseInt(stock);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Stock must be a non-negative number',
        });
      }
      product.stock = parsedStock;
      console.log('Updated stock to:', product.stock);
    }

    // ✅ Update category (now as ObjectId)
    if (category && category.trim()) {
      product.category = category.trim(); // ✅ Expects ObjectId
      console.log('Updated category to:', product.category);
    }

    // ✅ Handle image updates
    if (req.files && req.files.length > 0) {
      console.log('🖼️  Updating images...');

      // Delete old images from Cloudinary
      console.log('Deleting old images from Cloudinary...');
      for (const imageUrl of product.images) {
        try {
          const publicId = imageUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`roseluxe/products/${publicId}`);
          console.log('Deleted from Cloudinary:', publicId);
        } catch (err) {
          console.log('⚠️  Cloudinary delete error:', err.message);
        }
      }

      // Set new images
      product.images = req.files.map((file) => file.path);
      console.log('Set new images:', product.images.length, 'images');
    } else {
      console.log('No new images provided, keeping old images');
    }

    // ✅ CRITICAL: Save the product
    console.log('💾 Saving product to MongoDB...');
    await product.save();
    console.log('✅ Product saved successfully!');

    // ✅ Verify it was saved and populate category
    const savedProduct = await Product.findById(productId)
      .populate('category', 'name description image');
    console.log('✅ Verified saved product:', savedProduct.name);

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: savedProduct,
    });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    console.error('Error stack:', error.stack);
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
    for (const imageUrl of product.images) {
      const publicId = imageUrl.split('/').pop().split('.')[0];
      try {
        await cloudinary.uploader.destroy(`roseluxe/products/${publicId}`);
      } catch (err) {
        console.log('Cloudinary delete error:', err);
      }
    }

    product.isActive = false;

    await product.save();

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

    for (const product of products) {
      for (const imageUrl of product.images) {
        const publicId = imageUrl.split('/').pop().split('.')[0];
        try {
          await cloudinary.uploader.destroy(`roseluxe/products/${publicId}`);
        } catch (err) {
          console.log('Cloudinary delete error:', err);
        }
      }
    }

    await Product.updateMany(
      { _id: { $in: productIds } },
      { isActive: false }
    );

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

    const products = await Product.find({
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    })
      .populate('category', 'name description image') // ✅ POPULATE CATEGORY
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

    console.log('🟦 Getting products for category:', categoryId);

    // ✅ FIXED: Query by ObjectId reference
    const products = await Product.find({
      isActive: true,
      category: categoryId, // ✅ Now compares ObjectId directly
    })
      .populate('category', 'name description image') // ✅ POPULATE CATEGORY
      .sort({ createdAt: -1 })
      .lean();

    console.log('✅ Found products:', products.length);

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