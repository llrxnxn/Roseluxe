// utils/AdminService.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';

class AdminService {
  /**
   * Get authentication token from storage
   */
  static async getToken() {
    try {
      return await AsyncStorage.getItem('token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Get authorization headers with token
   */
  static async getHeaders(isFormData = false) {
    const token = await this.getToken();
    const headers = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    // Only add Content-Type for non-FormData requests
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  /**
   * Make authenticated API call
   */
  static async apiCall(endpoint, method = 'GET', body = null, isFormData = false) {
    try {
      const headers = await this.getHeaders(isFormData);

      const config = {
        method,
        headers,
      };

      if (body && !isFormData) {
        config.body = JSON.stringify(body);
      } else if (body && isFormData) {
        config.body = body;
      }

      console.log(`[API] ${method} ${endpoint}`);

      const response = await fetch(endpoint, config);

      if (response.status === 401) {
        await AsyncStorage.removeItem('token');
        throw new Error('Session expired. Please login again.');
      }

      const data = await response.json();

      console.log(`[API Response]`, data);

      if (!response.ok) {
        throw new Error(data.message || 'API Error');
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error.message);
      throw error;
    }
  }

  // ==================== USERS ====================

  /**
   * Get all users
   */
  static async getAllUsers() {
    const response = await this.apiCall(API_ENDPOINTS.USERS);
    // Response structure: { success: true, users: [...] }
    return {
      users: response?.users || [],
    };
  }

  /**
   * Update user (role and/or status)
   */
  static async updateUser(userId, updateData) {
    return this.apiCall(
      `${API_ENDPOINTS.USERS}/${userId}`,
      'PUT',
      updateData
    );
  }

  /**
   * Update user role
   */
  static async updateUserRole(userId, role) {
    return this.apiCall(
      `${API_ENDPOINTS.USERS}/${userId}/role`,
      'PUT',
      { role }
    );
  }

  /**
   * Update user status
   */
  static async updateUserStatus(userId, isActive) {
    return this.apiCall(
      `${API_ENDPOINTS.USERS}/${userId}/status`,
      'PUT',
      { isActive }
    );
  }

  // ==================== PRODUCTS ====================

  /**
   * Get all products with filters
   */
  static async getAllProducts(filters = {}) {
    let url = API_ENDPOINTS.PRODUCTS;
    
    // Build query string if filters provided
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await this.apiCall(url);
    // Response structure: { success: true, products: [...] }
    return {
      products: response?.products || [],
    };
  }

  /**
   * Get single product
   */
  static async getSingleProduct(productId) {
    return this.apiCall(`${API_ENDPOINTS.PRODUCTS}/${productId}`);
  }

  /**
   * Create product
   */
  static async createProduct(productData, imageFiles) {
    const token = await this.getToken();
    const formData = new FormData();

    // Add text fields
    formData.append('name', productData.name);
    formData.append('description', productData.description);
    formData.append('price', productData.price);
    formData.append('stock', productData.stock);
    formData.append('category', productData.category);

    // Add images
    if (imageFiles && imageFiles.length > 0) {
      imageFiles.forEach((file, index) => {
        formData.append('images', {
          uri: file.uri,
          type: file.type || 'image/jpeg',
          name: file.name || `image_${index}.jpg`,
        });
      });
    }

    const headers = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    // FormData sets Content-Type automatically

    const response = await fetch(API_ENDPOINTS.PRODUCTS, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create product');
    }

    return response.json();
  }

  /**
   * Update product
   */
  static async updateProduct(productId, updateData, newImageFiles = []) {
    const token = await this.getToken();
    const formData = new FormData();

    // Add text fields
    if (updateData.name) formData.append('name', updateData.name);
    if (updateData.description)
      formData.append('description', updateData.description);
    if (updateData.price) formData.append('price', updateData.price);
    if (updateData.stock !== undefined) formData.append('stock', updateData.stock);
    if (updateData.category) formData.append('category', updateData.category);

    // Add new images if provided
    if (newImageFiles && newImageFiles.length > 0) {
      newImageFiles.forEach((file, index) => {
        formData.append('images', {
          uri: file.uri,
          type: file.type || 'image/jpeg',
          name: file.name || `image_${index}.jpg`,
        });
      });
    }

    const headers = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const response = await fetch(
      `${API_ENDPOINTS.PRODUCTS}/${productId}`,
      {
        method: 'PUT',
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update product');
    }

    return response.json();
  }

  /**
   * Delete product
   */
  static async deleteProduct(productId) {
    return this.apiCall(
      `${API_ENDPOINTS.PRODUCTS}/${productId}`,
      'DELETE'
    );
  }

  /**
   * Bulk delete products
   */
  static async bulkDeleteProducts(productIds) {
    return this.apiCall(
      `${API_ENDPOINTS.PRODUCTS}/bulk-delete`,
      'POST',
      { productIds }
    );
  }

  /**
   * Search products
   */
  static async searchProducts(query) {
    return this.apiCall(`${API_ENDPOINTS.PRODUCTS}/search/${query}`);
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(categoryId) {
    const response = await this.apiCall(`${API_ENDPOINTS.PRODUCTS}?category=${categoryId}`);
    return {
      products: response?.products || [],
    };
  }

  // ==================== CATEGORIES ====================

  /**
   * Get all categories
   */
  static async getAllCategories() {
    const response = await this.apiCall(API_ENDPOINTS.CATEGORIES);
    // Response structure: { success: true, categories: [...] }
    return {
      categories: response?.categories || [],
    };
  }

  /**
   * Get single category
   */
  static async getSingleCategory(categoryId) {
    return this.apiCall(`${API_ENDPOINTS.CATEGORIES}/${categoryId}`);
  }

  /**
   * Create category
   */
  static async createCategory(categoryData, imageFile) {
    const token = await this.getToken();
    const formData = new FormData();

    formData.append('name', categoryData.name);
    formData.append('description', categoryData.description);

    if (imageFile) {
      formData.append('image', {
        uri: imageFile.uri,
        type: imageFile.type || 'image/jpeg',
        name: imageFile.name || 'category_image.jpg',
      });
    }

    const headers = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const response = await fetch(API_ENDPOINTS.CATEGORIES, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create category');
    }

    return response.json();
  }

  /**
   * Update category
   */
  static async updateCategory(categoryId, updateData, imageFile = null) {
    const token = await this.getToken();
    const formData = new FormData();

    if (updateData.name) formData.append('name', updateData.name);
    if (updateData.description)
      formData.append('description', updateData.description);

    if (imageFile) {
      formData.append('image', {
        uri: imageFile.uri,
        type: imageFile.type || 'image/jpeg',
        name: imageFile.name || 'category_image.jpg',
      });
    }

    const headers = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const response = await fetch(
      `${API_ENDPOINTS.CATEGORIES}/${categoryId}`,
      {
        method: 'PUT',
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update category');
    }

    return response.json();
  }

  /**
   * Delete category
   */
  static async deleteCategory(categoryId) {
    return this.apiCall(
      `${API_ENDPOINTS.CATEGORIES}/${categoryId}`,
      'DELETE'
    );
  }

  /**
   * Search categories
   */
  static async searchCategories(query) {
    const response = await this.apiCall(`${API_ENDPOINTS.CATEGORIES}/search/${query}`);
    return {
      categories: response?.categories || [],
    };
  }

  /**
   * Get products by category
   */
  static async getCategoryProducts(categoryId) {
    const response = await this.apiCall(
      `${API_ENDPOINTS.CATEGORIES}/${categoryId}/products`
    );
    return {
      products: response?.products || [],
    };
  }

  // ==================== ORDERS ====================

  /**
   * Get all orders (admin)
   */
  static async getAllOrders() {
  const response = await this.apiCall(API_ENDPOINTS.ADMIN_GET_ALL_ORDERS);

  console.log("ORDERS RESPONSE:", response);

  return {
    orders:
      response?.orders ||        // normal
      response?.data ||          // alternative
      response?.orders?.docs ||  // pagination
      [],
  };
}

  /**
   * Get order statistics (admin)
   */
  static async getOrderStats() {
    try {
      const response = await this.apiCall(`${API_ENDPOINTS.ORDERS}/admin/stats/dashboard`);
      return response;
    } catch (error) {
      console.log('Stats endpoint not available, calculating from orders');
      const orders = await this.getAllOrders();
      return this.calculateStats(orders);
    }
  }

  /**
   * Calculate stats from orders data
   */
  static calculateStats(ordersData) {
    const orders = ordersData?.orders || [];

    const stats = {
      pending: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      totalRevenue: 0,
    };

    orders.forEach(order => {
      if (order.orderStatus) {
        stats[order.orderStatus] = (stats[order.orderStatus] || 0) + 1;
      }
      if (order.orderStatus !== 'cancelled' && order.totals?.totalAmount) {
        stats.totalRevenue += order.totals.totalAmount;
      }
    });

    return stats;
  }

  /**
   * Get orders by status (admin)
   */
  static async getOrdersByStatus(status) {
    const response = await this.apiCall(
      `${API_ENDPOINTS.ORDERS}/admin/by-status/${status}`
    );
    return {
      orders: response?.orders || [],
    };
  }

  /**
   * Update order status (admin)
   */
  static async updateOrderStatus(orderId, newStatus) {
    return this.apiCall(
      API_ENDPOINTS.ADMIN_UPDATE_ORDER_STATUS(orderId),
      'PATCH',
      { orderStatus: newStatus }
    );
  }

  /**
   * Delete order (admin)
   */
  static async deleteOrder(orderId) {
    return this.apiCall(
      API_ENDPOINTS.ADMIN_DELETE_ORDER(orderId),
      'DELETE'
    );
  }

  /**
   * Get order by ID
   */
  static async getOrderById(orderId) {
    return this.apiCall(`${API_ENDPOINTS.ORDERS}/order/${orderId}`);
  }

  /**
   * Get user orders
   */
  static async getUserOrders(userId) {
    const response = await this.apiCall(`${API_ENDPOINTS.ORDERS}/${userId}`);
    return {
      orders: response?.orders || [],
    };
  }

  /**
   * Cancel order (user endpoint)
   */
  static async cancelOrder(orderId) {
    return this.apiCall(`${API_ENDPOINTS.ORDERS}/${orderId}/cancel`, 'PUT');
  }

  // ==================== REVIEWS ====================

  /**
   * Get all reviews (user - my reviews)
   */
  static async getUserReviews() {
    return this.apiCall(API_ENDPOINTS.REVIEWS_USER);
  }

  /**
   * Get reviews for a specific product
   */
  static async getProductReviews(productId) {
    return this.apiCall(API_ENDPOINTS.REVIEWS_PRODUCT(productId));
  }

  /**
   * Create review
   */
  static async createReview(reviewData) {
    return this.apiCall(API_ENDPOINTS.REVIEWS, 'POST', reviewData);
  }

  /**
   * Update review
   */
  static async updateReview(reviewId, updateData) {
    return this.apiCall(
      API_ENDPOINTS.REVIEWS_UPDATE(reviewId),
      'PUT',
      updateData
    );
  }

  /**
   * Delete review
   */
  static async deleteReview(reviewId) {
    return this.apiCall(API_ENDPOINTS.REVIEWS_DELETE(reviewId), 'DELETE');
  }

  /**
   * Get all reviews (admin)
   */
  static async getAllReviews() {
    return this.apiCall(API_ENDPOINTS.ADMIN_REVIEWS_ALL);
  }

  /**
   * Get products for filter (admin)
   */
  static async getProductsForFilter() {
    return this.apiCall(API_ENDPOINTS.ADMIN_REVIEWS_PRODUCTS_FILTER);
  }

  // ==================== DASHBOARD DATA ====================

  /**
   * Fetch all dashboard data at once
   */
  static async getDashboardData() {
    try {
      console.log('[Dashboard] Fetching dashboard data...');
      
      const [usersRes, productsRes, categoriesRes, ordersRes] = await Promise.all([
        this.getAllUsers().catch(err => {
          console.error('Error fetching users:', err);
          return { users: [] };
        }),
        this.getAllProducts().catch(err => {
          console.error('Error fetching products:', err);
          return { products: [] };
        }),
        this.getAllCategories().catch(err => {
          console.error('Error fetching categories:', err);
          return { categories: [] };
        }),
        this.getAllOrders().catch(err => {
          console.error('Error fetching orders:', err);
          return { orders: [] };
        }),
      ]);

      console.log('[Dashboard] Data fetched:', {
        users: usersRes?.users?.length || 0,
        products: productsRes?.products?.length || 0,
        categories: categoriesRes?.categories?.length || 0,
        orders: ordersRes?.orders?.length || 0,
      });

      return {
        users: usersRes,
        products: productsRes,
        categories: categoriesRes,
        orders: ordersRes,
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }
}

export default AdminService;