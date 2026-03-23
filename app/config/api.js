const API_BASE_URL = 'https://roseluxe.onrender.com';

export const API_ENDPOINTS = {
  AUTH: `${API_BASE_URL}/api/auth`,
  CATEGORIES: `${API_BASE_URL}/api/categories`,
  PRODUCTS: `${API_BASE_URL}/api/products`,
  ORDERS: `${API_BASE_URL}/api/orders`,
  USERS: `${API_BASE_URL}/api/users`,
  DISCOUNTS: `${API_BASE_URL}/api/discounts`,
  DISCOUNT_BY_ID: (id) => `${API_BASE_URL}/api/discounts/${id}`,
  DISCOUNT_TOGGLE: (id) => `${API_BASE_URL}/api/discounts/${id}/toggle-status`,
  DISCOUNT_BULK_DELETE: `${API_BASE_URL}/api/discounts/bulk-delete`,

    // REVIEW ENDPOINTS
  REVIEWS: `${API_BASE_URL}/api/reviews`,
  REVIEWS_PRODUCT: (productId) => `${API_BASE_URL}/api/reviews/product/${productId}`,
  REVIEWS_BY_ID: (reviewId) => `${API_BASE_URL}/api/reviews/${reviewId}`,
  REVIEWS_USER: `${API_BASE_URL}/api/reviews/user/my-reviews`,
  REVIEWS_UPDATE: (reviewId) => `${API_BASE_URL}/api/reviews/${reviewId}`,
  REVIEWS_DELETE: (reviewId) => `${API_BASE_URL}/api/reviews/${reviewId}`,
  
  // ADMIN REVIEW ENDPOINTS
  ADMIN_REVIEWS_ALL: `${API_BASE_URL}/api/reviews/admin/all-reviews`,
  ADMIN_REVIEWS_PRODUCTS_FILTER: `${API_BASE_URL}/api/reviews/admin/products-for-filter`,

  // ADMIN ENDPOINTS
  ADMIN_GET_ALL_ORDERS: `${API_BASE_URL}/api/orders/admin/all-orders`,
  ADMIN_UPDATE_ORDER_STATUS: (id) =>
    `${API_BASE_URL}/api/orders/admin/${id}/update-status`,
  ADMIN_DELETE_ORDER: (id) =>
    `${API_BASE_URL}/api/orders/admin/${id}`,
};

export default API_BASE_URL;