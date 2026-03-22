import { configureStore } from '@reduxjs/toolkit';
import ordersReducer from './slices/ordersSlice';
import productsReducer from './slices/productSlice';
import ReviewReducer from './slices/reviewSlice';

export const store = configureStore({
  reducer: {
    orders: ordersReducer,
    products: productsReducer,
    reviews: ReviewReducer,
  },
});

export default store;