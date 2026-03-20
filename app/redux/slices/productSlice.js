import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_ENDPOINTS } from '../../config/api';

// Async thunks
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🟦 FETCHING PRODUCTS FROM:', API_ENDPOINTS.PRODUCTS);
      const response = await fetch(API_ENDPOINTS.PRODUCTS);
      console.log('🟦 RESPONSE STATUS:', response.status);

      const data = await response.json();
      console.log('🟦 RESPONSE DATA:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error('❌ RESPONSE NOT OK:', data.message);
        return rejectWithValue(data.message || 'Failed to fetch products');
      }

      if (data.success && data.products) {
        console.log('✅ PRODUCTS LOADED:', data.products.length, 'items');
        return data.products;
      } else {
        console.warn('⚠️ UNEXPECTED RESPONSE FORMAT:', data);
        return rejectWithValue('Unexpected response format from server');
      }
    } catch (error) {
      console.error('❌ FETCH ERROR:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/deleteProduct',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.PRODUCTS}/${productId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message);
      }

      if (data.success) {
        return productId;
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const bulkDeleteProducts = createAsyncThunk(
  'products/bulkDeleteProducts',
  async (productIds, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.PRODUCTS}/bulk-delete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message);
      }

      if (data.success) {
        return { deletedCount: data.deletedCount, productIds };
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    filteredItems: [],
    loading: false,
    refreshing: false,
    error: null,
    searchQuery: '',
    selectedItems: [],
    selectionMode: false,
    selectedProduct: null,
    currentImageIndex: 0,
  },
  reducers: {
    // Search and filter actions
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      filterProducts(state);
    },
    
    filterProducts: (state) => {
      filterProducts(state);
    },

    // Selection actions
    toggleItemSelection: (state, action) => {
      const productId = action.payload;
      const index = state.selectedItems.indexOf(productId);
      if (index > -1) {
        state.selectedItems.splice(index, 1);
      } else {
        state.selectedItems.push(productId);
      }
    },

    toggleSelectAll: (state) => {
      if (state.selectedItems.length === state.filteredItems.length) {
        state.selectedItems = [];
      } else {
        state.selectedItems = state.filteredItems.map((p) => p._id);
      }
    },

    setSelectionMode: (state, action) => {
      state.selectionMode = action.payload;
    },

    clearSelection: (state) => {
      state.selectedItems = [];
      state.selectionMode = false;
    },

    // Modal and product detail actions
    setSelectedProduct: (state, action) => {
      state.selectedProduct = action.payload;
      state.currentImageIndex = 0;
    },

    setCurrentImageIndex: (state, action) => {
      state.currentImageIndex = action.payload;
    },

    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
      state.currentImageIndex = 0;
    },

    // Error handling
    clearError: (state) => {
      state.error = null;
    },

    setRefreshing: (state, action) => {
      state.refreshing = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch products
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        filterProducts(state);
        state.refreshing = false;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.refreshing = false;
      });

    // Delete single product
    builder
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((p) => p._id !== action.payload);
        filterProducts(state);
        state.selectedProduct = null;
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Bulk delete products
    builder
      .addCase(bulkDeleteProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkDeleteProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(
          (p) => !action.payload.productIds.includes(p._id)
        );
        filterProducts(state);
        state.selectedItems = [];
        state.selectionMode = false;
      })
      .addCase(bulkDeleteProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Helper function to filter products
function filterProducts(state) {
  if (!state.searchQuery.trim()) {
    state.filteredItems = state.items;
    return;
  }

  const query = state.searchQuery.toLowerCase();
  state.filteredItems = state.items.filter((product) => {
    const categoryName =
      typeof product.category === 'object'
        ? product.category?.name
        : product.category;

    return (
      product.name?.toLowerCase().includes(query) ||
      categoryName?.toLowerCase().includes(query)
    );
  });
}

export const {
  setSearchQuery,
  toggleItemSelection,
  toggleSelectAll,
  setSelectionMode,
  clearSelection,
  setSelectedProduct,
  setCurrentImageIndex,
  clearSelectedProduct,
  clearError,
  setRefreshing,
} = productsSlice.actions;

export default productsSlice.reducer;