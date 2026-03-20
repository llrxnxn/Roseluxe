import { configureStore } from '@reduxjs/toolkit';
import ordersReducer from './slices/ordersSlice';
import productsReducer from './slices/productSlice';

export const store = configureStore({
  reducer: {
    orders: ordersReducer,
    products: productsReducer,
    // Later add:
    // reviews: reviewsReducer,
  },
});

export default store;