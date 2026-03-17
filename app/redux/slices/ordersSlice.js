import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_ENDPOINTS } from '../../config/api';

// ================= ASYNC THUNKS =================
// Fetch all orders
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (authToken, { rejectWithValue }) => {
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_GET_ALL_ORDERS, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Transform orders
        const transformedOrders = (data.data || []).map((order) => ({
          _id: order._id,
          orderId: order.orderId,
          orderStatus: order.orderStatus,
          createdAt: order.createdAt,
          paymentMethod: order.shippingInfo?.payment?.method || 'N/A',
          totalAmount: order.totals?.totalAmount || 0,
          items: (order.items || []).map(item => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
          })),
          user: {
            fullname: order.shippingInfo?.fullName || 'N/A',
            phone: order.shippingInfo?.phone || 'N/A',
            address: order.shippingInfo?.address || 'N/A',
            country: order.shippingInfo?.country || 'PH',
          },
        }));
        return transformedOrders;
      } else {
        return rejectWithValue(data.error || 'Failed to fetch orders');
      }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Update order status
export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ orderId, status, authToken }, { rejectWithValue }) => {
    try {
      const res = await fetch(
        API_ENDPOINTS.ADMIN_UPDATE_ORDER_STATUS(orderId),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ orderStatus: status }),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        return { orderId, status };
      } else {
        return rejectWithValue(data.error || 'Failed to update order');
      }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ================= INITIAL STATE =================
const initialState = {
  items: [],
  loading: false,
  refreshing: false,
  error: null,
  success: false,
  updating: false,
};

// ================= SLICE =================
const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    // Synchronous actions
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setSuccess: (state, action) => {
      state.success = action.payload;
    },
    clearSuccess: (state) => {
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    // Fetch Orders
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Order Status
    builder
      .addCase(updateOrderStatus.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.updating = false;
        state.success = true;
        // Find and update the order in the items array
        const orderIndex = state.items.findIndex(
          (order) => order._id === action.payload.orderId
        );
        if (orderIndex !== -1) {
          state.items[orderIndex].orderStatus = action.payload.status;
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      });
  },
});

export const { setError, clearError, setSuccess, clearSuccess } = ordersSlice.actions;
export default ordersSlice.reducer;