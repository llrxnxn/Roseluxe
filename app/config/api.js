const API_BASE_URL = 'https://jeana-unchiselled-remunerably.ngrok-free.dev';

export const API_ENDPOINTS = {
  AUTH: `${API_BASE_URL}/api/auth`,
  CATEGORIES: `${API_BASE_URL}/api/categories`,
  PRODUCTS: `${API_BASE_URL}/api/products`,
  ORDERS: `${API_BASE_URL}/api/orders`,
  USERS: `${API_BASE_URL}/api/users`,
  ORDERS: `${API_BASE_URL}/api/orders`,

  // ADMIN ENDPOINTS
  ADMIN_GET_ALL_ORDERS: `${API_BASE_URL}/api/orders/admin/all-orders`,
  ADMIN_UPDATE_ORDER_STATUS: (id) =>
    `${API_BASE_URL}/api/orders/admin/${id}/update-status`,
  ADMIN_DELETE_ORDER: (id) =>
    `${API_BASE_URL}/api/orders/admin/${id}`,
};

export default API_BASE_URL;