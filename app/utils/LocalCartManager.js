import AsyncStorage from "@react-native-async-storage/async-storage";

const CART_KEY = "roseluxe_cart";

/**
 * LocalCartManager - Manage cart using AsyncStorage
 * Single source of truth for all cart operations
 */
class LocalCartManager {
  /**
   * Get entire cart from AsyncStorage
   * @returns {Promise<{items: Array, lastUpdated: string}>}
   */
  static async getCart() {
    try {
      const cartData = await AsyncStorage.getItem(CART_KEY);
      
      if (!cartData) {
        return {
          items: [],
          lastUpdated: new Date().toISOString(),
        };
      }

      return JSON.parse(cartData);
    } catch (error) {
      console.error("[LocalCartManager] Error getting cart:", error);
      return {
        items: [],
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Add or update item in cart
   * @param {string} productId - Product ID
   * @param {Object} productData - { productName, price, image }
   * @param {number} quantity - Quantity to add
   * @returns {Promise<{success: boolean, message: string, cart: Object}>}
   */
  static async addToCart(productId, productData, quantity = 1) {
    try {
      if (!productId || !productData || quantity < 1) {
        return {
          success: false,
          message: "Invalid product or quantity",
          cart: null,
        };
      }

      const cart = await this.getCart();

      // Check if item already exists
      const existingItemIndex = cart.items.findIndex(
        (item) => item.productId === productId
      );

      if (existingItemIndex >= 0) {
        // Update quantity if exists
        cart.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        cart.items.push({
          productId,
          productName: productData.productName,
          price: productData.price,
          quantity,
          image: productData.image || "",
        });
      }

      cart.lastUpdated = new Date().toISOString();
      await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));

      console.log(`[LocalCartManager] Added/Updated product: ${productId}`);

      return {
        success: true,
        message: "Item added to cart",
        cart: cart,
      };
    } catch (error) {
      console.error("[LocalCartManager] Error adding to cart:", error);
      return {
        success: false,
        message: error.message,
        cart: null,
      };
    }
  }

  /**
   * Update quantity of specific item
   * @param {string} productId - Product ID
   * @param {number} newQuantity - New quantity
   * @returns {Promise<{success: boolean, message: string, cart: Object}>}
   */
  static async updateQuantity(productId, newQuantity) {
    try {
      if (!productId || newQuantity < 1) {
        return {
          success: false,
          message: "Invalid product or quantity",
          cart: null,
        };
      }

      const cart = await this.getCart();
      const itemIndex = cart.items.findIndex(
        (item) => item.productId === productId
      );

      if (itemIndex < 0) {
        return {
          success: false,
          message: "Item not found in cart",
          cart: null,
        };
      }

      cart.items[itemIndex].quantity = newQuantity;
      cart.lastUpdated = new Date().toISOString();
      await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));

      console.log(
        `[LocalCartManager] Updated quantity for product: ${productId}`
      );

      return {
        success: true,
        message: "Quantity updated",
        cart: cart,
      };
    } catch (error) {
      console.error("[LocalCartManager] Error updating quantity:", error);
      return {
        success: false,
        message: error.message,
        cart: null,
      };
    }
  }

  /**
   * Remove single item from cart
   * @param {string} productId - Product ID
   * @returns {Promise<{success: boolean, message: string, cart: Object}>}
   */
  static async removeFromCart(productId) {
    try {
      if (!productId) {
        return {
          success: false,
          message: "Invalid product ID",
          cart: null,
        };
      }

      const cart = await this.getCart();
      const initialLength = cart.items.length;

      cart.items = cart.items.filter((item) => item.productId !== productId);

      if (cart.items.length === initialLength) {
        return {
          success: false,
          message: "Item not found in cart",
          cart: null,
        };
      }

      cart.lastUpdated = new Date().toISOString();
      await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));

      console.log(`[LocalCartManager] Removed product: ${productId}`);

      return {
        success: true,
        message: "Item removed",
        cart: cart,
      };
    } catch (error) {
      console.error("[LocalCartManager] Error removing from cart:", error);
      return {
        success: false,
        message: error.message,
        cart: null,
      };
    }
  }

  /**
   * Clear entire cart
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async clearCart() {
    try {
      await AsyncStorage.removeItem(CART_KEY);
      console.log("[LocalCartManager] Cart cleared");

      return {
        success: true,
        message: "Cart cleared",
      };
    } catch (error) {
      console.error("[LocalCartManager] Error clearing cart:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Delete specific items from cart after successful checkout
   * Only removes the items that were ordered
   * @param {Array<string>} productIds - Array of product IDs to remove
   * @returns {Promise<{success: boolean, message: string, cart: Object}>}
   */
  static async deleteCartAfterCheckout(productIds) {
    try {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return {
          success: false,
          message: "Invalid product IDs",
          cart: null,
        };
      }

      const cart = await this.getCart();

      // Remove only the ordered items
      const idsSet = new Set(productIds);
      const initialLength = cart.items.length;
      cart.items = cart.items.filter((item) => !idsSet.has(item.productId));

      // If cart is now empty, delete the entire cart
      if (cart.items.length === 0) {
        await AsyncStorage.removeItem(CART_KEY);
        console.log("[LocalCartManager] Cart completely cleared after checkout");

        return {
          success: true,
          message: "Cart cleared after checkout",
          cart: { items: [] },
        };
      }

      cart.lastUpdated = new Date().toISOString();
      await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));

      console.log(
        `[LocalCartManager] Removed ${initialLength - cart.items.length} items after checkout`
      );

      return {
        success: true,
        message: "Ordered items removed from cart",
        cart: cart,
      };
    } catch (error) {
      console.error("[LocalCartManager] Error deleting cart after checkout:", error);
      return {
        success: false,
        message: error.message,
        cart: null,
      };
    }
  }

  /**
   * Get cart count (total items quantity)
   * @returns {Promise<number>}
   */
  static async getCartCount() {
    try {
      const cart = await this.getCart();
      return cart.items.reduce((total, item) => total + item.quantity, 0);
    } catch (error) {
      console.error("[LocalCartManager] Error getting cart count:", error);
      return 0;
    }
  }

  /**
   * Calculate totals (subtotal, tax, total)
   * @returns {Promise<{subtotal: number, tax: number, total: number}>}
   */
  static async calculateTotals() {
    try {
      const cart = await this.getCart();

      const subtotal = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const tax = subtotal * 0.12;
      const total = subtotal + tax;

      return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
      };
    } catch (error) {
      console.error("[LocalCartManager] Error calculating totals:", error);
      return {
        subtotal: 0,
        tax: 0,
        total: 0,
      };
    }
  }

  /**
   * Check if product exists in cart
   * @param {string} productId - Product ID
   * @returns {Promise<boolean>}
   */
  static async isProductInCart(productId) {
    try {
      const cart = await this.getCart();
      return cart.items.some((item) => item.productId === productId);
    } catch (error) {
      console.error("[LocalCartManager] Error checking product:", error);
      return false;
    }
  }

  /**
   * Get specific item from cart
   * @param {string} productId - Product ID
   * @returns {Promise<Object|null>}
   */
  static async getCartItem(productId) {
    try {
      const cart = await this.getCart();
      return cart.items.find((item) => item.productId === productId) || null;
    } catch (error) {
      console.error("[LocalCartManager] Error getting cart item:", error);
      return null;
    }
  }
}

export default LocalCartManager;