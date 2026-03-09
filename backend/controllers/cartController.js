const Product = require('../models/Products');
const Cart = require('../models/Cart');
const mongoose = require('mongoose');

/* ========================================
   CREATE - Add item to cart
======================================== */
const addToCart = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { productId, quantity } = req.body;

    console.log(`[ADD TO CART] customerId: ${customerId}, productId: ${productId}, quantity: ${quantity}`);

    if (!customerId || customerId === 'undefined') {
      return res.status(400).json({
        success: false,
        error: "Invalid or missing customerId"
      });
    }

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid product or quantity"
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found"
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        error: "Not enough stock"
      });
    }

    let customerObjectId, productObjectId;
    try {
      customerObjectId = new mongoose.Types.ObjectId(customerId);
      productObjectId = new mongoose.Types.ObjectId(productId);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid ID format"
      });
    }

    let cart = await Cart.findOne({ customerId: customerObjectId });

    if (!cart) {
      cart = new Cart({
        customerId: customerObjectId,
        items: []
      });
    }

    const existingItem = cart.items.find(
      item => item.productId.toString() === productObjectId.toString()
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          error: "Quantity exceeds available stock"
        });
      }

      existingItem.quantity = newQuantity;
    } else {
      cart.items.push({
        productId: productObjectId,
        productName: product.name,
        price: product.price,
        quantity,
        image: product.images?.[0] || ""
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item added to cart",
      data: cart.items,
      summary: {
        subtotal: cart.subtotal,
        tax: cart.tax,
        total: cart.total
      }
    });

  } catch (error) {
    console.error("[ADD TO CART ERROR]:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/* ========================================
   READ - Get cart
======================================== */
const getCart = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId || customerId === 'undefined') {
      return res.status(400).json({
        success: false,
        error: "Invalid or missing customerId"
      });
    }

    const customerObjectId = new mongoose.Types.ObjectId(customerId);

    const cart = await Cart.findOne({ customerId: customerObjectId });

    if (!cart) {
      return res.json({
        success: true,
        data: [],
        summary: {
          subtotal: 0,
          tax: 0,
          total: 0
        }
      });
    }

    res.json({
      success: true,
      data: cart.items,
      summary: {
        subtotal: cart.subtotal,
        tax: cart.tax,
        total: cart.total
      }
    });

  } catch (error) {
    console.error("[GET CART ERROR]:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/* ========================================
   READ - Single item
======================================== */
const getCartItem = async (req, res) => {
  try {
    const { customerId, productId } = req.params;

    const customerObjectId = new mongoose.Types.ObjectId(customerId);
    const productObjectId = new mongoose.Types.ObjectId(productId);

    const cart = await Cart.findOne({ customerId: customerObjectId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Cart not found"
      });
    }

    const item = cart.items.find(
      item => item.productId.toString() === productObjectId.toString()
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Item not found"
      });
    }

    res.json({
      success: true,
      data: item
    });

  } catch (error) {
    console.error("[GET CART ITEM ERROR]:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/* ========================================
   UPDATE - Quantity
======================================== */
const updateQuantity = async (req, res) => {
  try {
    const { customerId, productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid quantity"
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found"
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        error: "Quantity exceeds stock"
      });
    }

    const customerObjectId = new mongoose.Types.ObjectId(customerId);
    const productObjectId = new mongoose.Types.ObjectId(productId);

    const cart = await Cart.findOne({ customerId: customerObjectId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Cart not found"
      });
    }

    const item = cart.items.find(
      item => item.productId.toString() === productObjectId.toString()
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Item not in cart"
      });
    }

    item.quantity = quantity;

    await cart.save();

    res.json({
      success: true,
      message: "Quantity updated",
      data: cart.items,
      summary: {
        subtotal: cart.subtotal,
        tax: cart.tax,
        total: cart.total
      }
    });

  } catch (error) {
    console.error("[UPDATE QUANTITY ERROR]:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/* ========================================
   DELETE - Remove item
======================================== */
const removeItem = async (req, res) => {
  try {
    const { customerId, productId } = req.params;

    const customerObjectId = new mongoose.Types.ObjectId(customerId);
    const productObjectId = new mongoose.Types.ObjectId(productId);

    const cart = await Cart.findOne({ customerId: customerObjectId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Cart not found"
      });
    }

    const initialLength = cart.items.length;

    cart.items = cart.items.filter(
      item => item.productId.toString() !== productObjectId.toString()
    );

    if (cart.items.length === initialLength) {
      return res.status(404).json({
        success: false,
        error: "Item not found in cart"
      });
    }

    // 🔴 If no items left → delete cart
    if (cart.items.length === 0) {
      await Cart.deleteOne({ customerId: customerObjectId });

      return res.json({
        success: true,
        message: "Item removed and cart deleted",
        data: [],
        summary: {
          subtotal: 0,
          tax: 0,
          total: 0
        }
      });
    }

    await cart.save();

    res.json({
      success: true,
      message: "Item removed",
      data: cart.items,
      summary: {
        subtotal: cart.subtotal,
        tax: cart.tax,
        total: cart.total
      }
    });

  } catch (error) {
    console.error("[REMOVE ITEM ERROR]:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/* ========================================
   DELETE - Clear cart
======================================== */
const clearCart = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customerObjectId = new mongoose.Types.ObjectId(customerId);

    const cart = await Cart.findOne({ customerId: customerObjectId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Cart not found"
      });
    }

    // 🔴 Delete entire cart
    await Cart.deleteOne({ customerId: customerObjectId });

    res.json({
      success: true,
      message: "Cart deleted",
      data: [],
      summary: {
        subtotal: 0,
        tax: 0,
        total: 0
      }
    });

  } catch (error) {
    console.error("[CLEAR CART ERROR]:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  getCartItem,
  updateQuantity,
  removeItem,
  clearCart
};