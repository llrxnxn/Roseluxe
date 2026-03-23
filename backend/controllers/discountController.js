const Discount = require('../models/Discount');
const Product = require('../models/Products');
const Category = require('../models/Category');

// Validation helper
const validateDiscountData = (data) => {
  const errors = {};

  if (!data.code || !data.code.trim()) {
    errors.code = 'Discount code is required';
  } else if (data.code.trim().length < 3) {
    errors.code = 'Discount code must be at least 3 characters';
  }

  if (!data.description || !data.description.trim()) {
    errors.description = 'Description is required';
  }

  if (!data.discountType || !['percentage', 'fixed'].includes(data.discountType)) {
    errors.discountType = 'Discount type must be percentage or fixed';
  }

  if (data.discountValue === undefined || data.discountValue === null || data.discountValue === '') {
    errors.discountValue = 'Discount value is required';
  } else {
    const parsedValue = parseFloat(data.discountValue);
    if (isNaN(parsedValue)) {
      errors.discountValue = 'Discount value must be a valid number';
    } else if (parsedValue < 0) {
      errors.discountValue = 'Discount value cannot be negative';
    }
  }

  if (!data.validFrom) {
    errors.validFrom = 'Valid from date is required';
  } else {
    // ✅ FIX: Compare dates at midnight to avoid timezone issues
    const validFromDate = new Date(data.validFrom);
    validFromDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Allow today or future dates (only reject if truly in past)
    if (validFromDate < today) {
      errors.validFrom = 'Valid from date cannot be before today';
    }
  }

  if (!data.validUntil) {
    errors.validUntil = 'Valid until date is required';
  } else if (new Date(data.validUntil) <= new Date(data.validFrom)) {
    errors.validUntil = 'Valid until date must be after valid from date';
  }

  return errors;
};

// ============= CREATE DISCOUNT =============
exports.createDiscount = async (req, res) => {
  try {
    const { code, description, discountType, discountValue, maxAmount, minPurchaseAmount, products, categories, validFrom, validUntil, maxUsagePerUser, totalUsageLimit } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate data
    const errors = validateDiscountData({ code, description, discountType, discountValue, validFrom, validUntil });
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    // Check if code already exists
    const existingDiscount = await Discount.findOne({ code: code.toUpperCase() });
    if (existingDiscount) {
      return res.status(400).json({ message: 'Discount code already exists' });
    }

    // Validate products if provided
    if (products && products.length > 0) {
      const validProducts = await Product.find({ _id: { $in: products } });
      if (validProducts.length !== products.length) {
        return res.status(400).json({ message: 'Some products do not exist' });
      }
    }

    // Validate categories if provided
    if (categories && categories.length > 0) {
      const validCategories = await Category.find({ _id: { $in: categories } });
      if (validCategories.length !== categories.length) {
        return res.status(400).json({ message: 'Some categories do not exist' });
      }
    }

    const newDiscount = new Discount({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      maxAmount: maxAmount || null,
      minPurchaseAmount: minPurchaseAmount || 0,
      products: products || [],
      categories: categories || [],
      validFrom,
      validUntil,
      maxUsagePerUser: maxUsagePerUser || null,
      totalUsageLimit: totalUsageLimit || null,
      createdBy: userId,
    });

    await newDiscount.save();
    res.status(201).json({
      message: 'Discount created successfully',
      discount: newDiscount,
    });
  } catch (error) {
    console.log('Create discount error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============= GET ALL DISCOUNTS =============
exports.getAllDiscounts = async (req, res) => {
  try {
    const { isActive, search } = req.query;
    let filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const discounts = await Discount.find(filter)
      .populate('products', 'name price')
      .populate('categories', 'name')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Discounts fetched successfully',
      discounts,
    });
  } catch (error) {
    console.log('Get all discounts error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============= GET SINGLE DISCOUNT =============
exports.getSingleDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await Discount.findById(id)
      .populate('products', 'name price')
      .populate('categories', 'name')
      .populate('createdBy', 'fullName email');

    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    res.json({
      message: 'Discount fetched successfully',
      discount,
    });
  } catch (error) {
    console.log('Get single discount error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============= UPDATE DISCOUNT =============
exports.updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, description, discountType, discountValue, maxAmount, minPurchaseAmount, products, categories, validFrom, validUntil, maxUsagePerUser, totalUsageLimit, isActive } = req.body;

    const discount = await Discount.findById(id);
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    // Validate data if updating discount fields
    if (code || description || discountType || discountValue !== undefined || validFrom || validUntil) {
      const errors = validateDiscountData({
        code: code || discount.code,
        description: description || discount.description,
        discountType: discountType || discount.discountType,
        discountValue: discountValue !== undefined ? discountValue : discount.discountValue,
        validFrom: validFrom || discount.validFrom,
        validUntil: validUntil || discount.validUntil,
      });
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ errors });
      }

      // Check if new code already exists (and is different from current)
      if (code && code.toUpperCase() !== discount.code) {
        const existingDiscount = await Discount.findOne({ code: code.toUpperCase() });
        if (existingDiscount) {
          return res.status(400).json({ message: 'Discount code already exists' });
        }
      }
    }

    // Validate products if provided
    if (products) {
      const validProducts = await Product.find({ _id: { $in: products } });
      if (validProducts.length !== products.length) {
        return res.status(400).json({ message: 'Some products do not exist' });
      }
    }

    // Validate categories if provided
    if (categories) {
      const validCategories = await Category.find({ _id: { $in: categories } });
      if (validCategories.length !== categories.length) {
        return res.status(400).json({ message: 'Some categories do not exist' });
      }
    }

    // Update fields
    if (code) discount.code = code.toUpperCase();
    if (description) discount.description = description;
    if (discountType) discount.discountType = discountType;
    if (discountValue !== undefined) discount.discountValue = discountValue;
    if (maxAmount !== undefined) discount.maxAmount = maxAmount;
    if (minPurchaseAmount !== undefined) discount.minPurchaseAmount = minPurchaseAmount;
    if (products) discount.products = products;
    if (categories) discount.categories = categories;
    if (validFrom) discount.validFrom = validFrom;
    if (validUntil) discount.validUntil = validUntil;
    if (maxUsagePerUser !== undefined) discount.maxUsagePerUser = maxUsagePerUser;
    if (totalUsageLimit !== undefined) discount.totalUsageLimit = totalUsageLimit;
    if (isActive !== undefined) discount.isActive = isActive;

    await discount.save();
    res.json({
      message: 'Discount updated successfully',
      discount,
    });
  } catch (error) {
    console.log('Update discount error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============= DELETE DISCOUNT =============
exports.deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await Discount.findByIdAndDelete(id);
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    res.json({
      message: 'Discount deleted successfully',
      discount,
    });
  } catch (error) {
    console.log('Delete discount error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============= TOGGLE DISCOUNT STATUS =============
exports.toggleDiscountStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await Discount.findById(id);
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    discount.isActive = !discount.isActive;
    await discount.save();

    res.json({
      message: 'Discount status updated',
      discount,
    });
  } catch (error) {
    console.log('Toggle discount status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============= BULK DELETE DISCOUNTS =============
exports.bulkDeleteDiscounts = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No discount IDs provided' });
    }

    const result = await Discount.deleteMany({ _id: { $in: ids } });

    res.json({
      message: 'Discounts deleted successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.log('Bulk delete discounts error:', error);
    res.status(500).json({ message: error.message });
  }
};