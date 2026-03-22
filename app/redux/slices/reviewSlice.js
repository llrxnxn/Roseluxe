import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../../config/api';

// =============== ASYNC THUNKS ===============

export const fetchProductsForFilter = createAsyncThunk(
  'reviews/fetchProductsForFilter',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const url = `${API_BASE_URL}/api/reviews/admin/products-for-filter`;

      console.log('Fetching products from:', url);

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const allProducts = [
          { _id: null, name: 'All Products', images: null },
          ...response.data.data,
        ];
        console.log('Products fetched:', allProducts.length);
        return allProducts;
      }
    } catch (err) {
      console.error('Error fetching products:', err.response?.data || err.message);
      return rejectWithValue(err.response?.data?.message || 'Failed to load products');
    }
  }
);

export const fetchReviews = createAsyncThunk(
  'reviews/fetchReviews',
  async ({ selectedProduct, selectedRating, currentPage, limit = 10 }, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('token');

      const params = new URLSearchParams({
        page: currentPage,
        limit,
        sort: '-createdAt',
      });

      if (selectedProduct) {
        params.append('productId', selectedProduct);
      }

      if (selectedRating) {
        params.append('rating', selectedRating);
      }

      const url = `${API_BASE_URL}/api/reviews/admin/all-reviews?${params.toString()}`;

      console.log('Fetching reviews from:', url);

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        console.log('Reviews fetched:', response.data.data.length, 'reviews');
        return response.data;
      }
    } catch (err) {
      console.error('Error fetching reviews:', err.response?.data || err.message);
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch reviews');
    }
  }
);

// =============== INITIAL STATE ===============

const initialState = {
  // UI State
  isMenuOpen: false,
  selectedProduct: null,
  selectedRating: null,
  currentPage: 1,

  // Products
  products: [],
  productsLoading: false,
  productsError: null,

  // Reviews
  reviews: [],
  reviewsData: null,
  reviewsLoading: true,
  reviewsError: null,

  // Stats
  stats: {
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: {
      5: { count: 0, percentage: 0 },
      4: { count: 0, percentage: 0 },
      3: { count: 0, percentage: 0 },
      2: { count: 0, percentage: 0 },
      1: { count: 0, percentage: 0 },
    },
  },

  // Pagination
  pagination: {
    page: 1,
    pages: 1,
    total: 0,
    limit: 10,
  },
};

// =============== REDUX SLICE ===============

const reviewSlice = createSlice({
  name: 'reviews', 
  initialState,
  reducers: {
    // ========== UI Actions ==========
    setMenuOpen: (state, action) => {
      state.isMenuOpen = action.payload;
    },

    setSelectedProduct: (state, action) => {
      state.selectedProduct = action.payload;
      state.currentPage = 1; // Reset pagination when filter changes
    },

    setSelectedRating: (state, action) => {
      state.selectedRating = action.payload;
      state.currentPage = 1; // Reset pagination when filter changes
    },

    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },

    // ========== Reset Actions ==========
    resetFilters: (state) => {
      state.selectedProduct = null;
      state.selectedRating = null;
      state.currentPage = 1;
      state.reviewsError = null;
    },

    clearErrors: (state) => {
      state.productsError = null;
      state.reviewsError = null;
    },
  },

  extraReducers: (builder) => {
    // ========== FETCH PRODUCTS ==========
    builder
      .addCase(fetchProductsForFilter.pending, (state) => {
        state.productsLoading = true;
        state.productsError = null;
      })
      .addCase(fetchProductsForFilter.fulfilled, (state, action) => {
        state.productsLoading = false;
        state.products = action.payload;
        state.productsError = null;
      })
      .addCase(fetchProductsForFilter.rejected, (state, action) => {
        state.productsLoading = false;
        state.productsError = action.payload;
        state.products = [];
      });

    // ========== FETCH REVIEWS ==========
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.reviewsLoading = true;
        state.reviewsError = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.reviewsLoading = false;
        state.reviewsData = action.payload;
        state.reviews = action.payload.data || [];
        state.stats = action.payload.stats || state.stats;
        state.pagination = action.payload.pagination || state.pagination;
        state.reviewsError = null;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.reviewsLoading = false;
        state.reviewsError = action.payload;
        state.reviews = [];
      });
  },
});

// =============== EXPORTS - ACTIONS ===============

export const {
  setMenuOpen,
  setSelectedProduct,
  setSelectedRating,
  setCurrentPage,
  resetFilters,
  clearErrors,
} = reviewSlice.actions;

// =============== EXPORTS - REDUCER (DEFAULT) ===============

export default reviewSlice.reducer;

// =============== SELECTORS ===============

export const selectIsMenuOpen = (state) => state.reviews.isMenuOpen;
export const selectSelectedProduct = (state) => state.reviews.selectedProduct;
export const selectSelectedRating = (state) => state.reviews.selectedRating;
export const selectCurrentPage = (state) => state.reviews.currentPage;

export const selectProducts = (state) => state.reviews.products;
export const selectProductsLoading = (state) => state.reviews.productsLoading;
export const selectProductsError = (state) => state.reviews.productsError;

export const selectReviews = (state) => state.reviews.reviews;
export const selectReviewsLoading = (state) => state.reviews.reviewsLoading;
export const selectReviewsError = (state) => state.reviews.reviewsError;

export const selectStats = (state) => state.reviews.stats;
export const selectPagination = (state) => state.reviews.pagination;