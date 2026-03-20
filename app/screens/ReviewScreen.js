import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_ENDPOINTS, API_BASE_URL } from '../config/api';

/**
 * ✅ FIX #1: Safe product extraction with validation
 * Handles multiple possible data structures from backend
 * Returns parsed product or null if invalid
 */
const safeParseProduct = (product) => {
  try {
    if (!product || typeof product !== 'object') {
      console.warn('⚠️ Invalid product object:', product);
      return null;
    }

    // Extract productId with all possible fallback paths
    const productId = product?.productId?._id || 
                      product?.productId || 
                      product?._id;
    
    if (!productId || typeof productId !== 'string') {
      console.warn('⚠️ Product missing valid ID:', product);
      return null;
    }

    // Safe extraction of product fields with defaults
    const productName = (product?.productName || product?.name || 'Unknown Product').toString().trim();
    const imageUrl = product?.image || product?.productImage || 'https://via.placeholder.com/150';
    const price = Number(product?.price);
    const quantity = Number(product?.quantity);

    // Validate numeric fields
    if (isNaN(price) || price < 0) {
      console.warn('⚠️ Invalid price:', product?.price);
      return null;
    }

    if (isNaN(quantity) || quantity < 1) {
      console.warn('⚠️ Invalid quantity:', product?.quantity);
      return null;
    }

    return {
      productId,
      productName,
      image: String(imageUrl),
      price: parseFloat(price.toFixed(2)),
      quantity: parseInt(quantity),
    };
  } catch (error) {
    console.error('❌ Error parsing product:', error);
    return null;
  }
};

/**
 * ✅ FIX #2: Flatten order data into individual product review items
 * This converts orders with multiple products into separate review items
 * So user can review each product independently
 */
const flattenOrdersToProducts = (orders, reviewedProductIds) => {
  const reviewItems = [];

  orders.forEach((order) => {
    // Get products array (could be 'products' or 'items')
    const products = Array.isArray(order.products) ? order.products :
                     Array.isArray(order.items) ? order.items : [];

    if (!products.length) {
      console.warn('⚠️ Order has no products:', order._id);
      return;
    }

    // Create a review item for each product in the order
    products.forEach((product, index) => {
      const parsedProduct = safeParseProduct(product);
      
      if (!parsedProduct) {
        console.warn('⚠️ Could not parse product at index', index, 'in order', order._id);
        return;
      }

      // Create unique key combining order ID and product ID
      const reviewKey = `${order._id}_${parsedProduct.productId}`;

      // Check if this specific product has already been reviewed
      const alreadyReviewed = reviewedProductIds.includes(reviewKey);

      if (!alreadyReviewed) {
        reviewItems.push({
          // Item metadata
          reviewKey, // Unique identifier for this review item
          orderId: order._id,
          orderNumber: order.orderId, // e.g., "ORD-318323354"
          orderStatus: order.orderStatus,
          productIndex: index, // Which product in the order (0, 1, 2, etc.)
          
          // Product info
          productId: parsedProduct.productId,
          productName: parsedProduct.productName,
          image: parsedProduct.image,
          price: parsedProduct.price,
          quantity: parsedProduct.quantity,
          
          // Order totals (for context)
          orderTotalAmount: order.totals?.totalAmount || 0,
          
          // Shipping info (for order context)
          shippingAddress: order.shippingInfo?.address || 'Not provided',
        });
      }
    });
  });

  return reviewItems;
};

const ReviewScreen = ({ navigation }) => {
  const [toReviewItems, setToReviewItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchToReviewItems();

    // Refetch when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchToReviewItems();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchToReviewItems = async () => {
    try {
      setLoading(true);

      // Get stored credentials
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');

      if (!token || !userData) {
        Alert.alert('Error', 'Please login first');
        navigation.navigate('Login');
        return;
      }

      let parsedUser;
      try {
        parsedUser = JSON.parse(userData);
      } catch (parseError) {
        console.error('❌ Failed to parse user data:', parseError);
        Alert.alert('Error', 'Corrupted user data. Please login again.');
        await AsyncStorage.multiRemove(['token', 'user']);
        navigation.navigate('Login');
        return;
      }

      const userId = parsedUser._id || parsedUser.id;

      if (!userId) {
        throw new Error('User ID not found in stored credentials');
      }

      // Build URL
      const ordersUrl = `${API_ENDPOINTS.ORDERS}/${userId}`;
      console.log('📤 Fetching orders from:', ordersUrl);

      // Fetch user's orders
      const ordersResponse = await fetch(ordersUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Orders response status:', ordersResponse.status);

      // Handle HTTP errors
      if (!ordersResponse.ok) {
        if (ordersResponse.status === 401) {
          // Token expired
          console.warn('⚠️ Unauthorized - token may have expired');
          Alert.alert('Session Expired', 'Please login again.');
          await AsyncStorage.multiRemove(['token', 'user']);
          navigation.navigate('Login');
          return;
        }

        let errorText = '';
        try {
          errorText = await ordersResponse.text();
        } catch (e) {
          errorText = 'Unable to read error response';
        }

        console.error(`❌ HTTP ${ordersResponse.status} error:`, errorText);
        
        if (ordersResponse.status === 404) {
          console.error('❌ 404 NOT FOUND - Common causes:');
          console.error('   1. orderRoutes not registered in server.js');
          console.error('   2. GET /:userId endpoint not defined');
          console.error('   3. Wrong API base URL in config/api.js');
          Alert.alert(
            'Server Configuration Error',
            'Orders endpoint not found (404). Please check your backend configuration.'
          );
          return;
        }

        throw new Error(`HTTP ${ordersResponse.status}: ${errorText || 'Unknown error'}`);
      }

      // Parse response
      let ordersData;
      try {
        ordersData = await ordersResponse.json();
      } catch (parseError) {
        console.error('❌ Failed to parse orders response:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      // Validate response structure
      if (!ordersData.success) {
        console.warn('⚠️ API returned success: false');
        console.warn('Response:', ordersData);
        setToReviewItems([]);
        return;
      }

      if (!Array.isArray(ordersData.data)) {
        console.error('❌ Orders data is not an array:', ordersData.data);
        throw new Error('Invalid response format from server');
      }

      console.log(`✅ Fetched ${ordersData.data.length} orders`);

      // Fetch user's existing reviews to exclude from list
      console.log('📝 Fetching existing reviews from:', API_ENDPOINTS.REVIEWS_USER);
      let reviewedProductIds = []; // Array of "orderId_productId" strings

      try {
        const reviewsResponse = await fetch(API_ENDPOINTS.REVIEWS_USER, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          if (reviewsData.success && Array.isArray(reviewsData.data)) {
            // Create keys in format "orderId_productId" to uniquely identify reviewed products
            reviewedProductIds = reviewsData.data.map((review) => {
              const orderId = review.orderId?._id || review.orderId;
              const productId = review.productId?._id || review.productId;
              return `${orderId}_${productId}`;
            });
            console.log(`✅ User has ${reviewedProductIds.length} existing reviews`);
          }
        } else {
          console.warn(`⚠️ Failed to fetch reviews: HTTP ${reviewsResponse.status}`);
          // Continue anyway - we'll still show items even if reviews fetch fails
        }
      } catch (reviewError) {
        console.warn('⚠️ Error fetching reviews:', reviewError.message);
        // Continue - don't block on reviews fetch
      }

      // Filter to delivered orders only
      const deliveredOrders = ordersData.data.filter(
        (order) => order?.orderStatus === 'delivered'
      );

      console.log(`📊 Statistics:
        - Total orders: ${ordersData.data.length}
        - Delivered orders: ${deliveredOrders.length}
        - Already reviewed products: ${reviewedProductIds.length}`);

      // ✅ FIX: Flatten orders with multiple products into individual review items
      const reviewItems = flattenOrdersToProducts(deliveredOrders, reviewedProductIds);

      console.log(`✅ Total products to review: ${reviewItems.length}`);
      
      setToReviewItems(reviewItems);
    } catch (error) {
      console.error('❌ Error fetching review items:', error);
      Alert.alert(
        'Error Loading Items to Review',
        error.message || 'Failed to load your delivered orders. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigate to ReviewForm screen with order and product info
   * ✅ FIXED: Pass complete product data so ReviewFormScreen can access it directly
   */
  const handleWriteReview = (item) => {
    navigation.navigate('ReviewForm', {
      orderId: item.orderId,
      productId: item.productId,
      productName: item.productName,
      orderNumber: item.orderNumber,
      // ✅ FIXED: Pass complete product object with all details
      product: {
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      },
    });
  };

  /**
   * Render individual review item card
   */
  const renderToReviewItem = ({ item }) => {
    const subtotal = item.price * item.quantity;

    return (
      <View style={styles.itemCard}>
        <Image
          source={{ uri: item.image }}
          style={styles.productImage}
          onError={() => console.log('⚠️ Failed to load product image')}
        />

        <View style={styles.detailsContainer}>
          {/* Order number badge */}
          <View style={styles.orderBadge}>
            <Text style={styles.orderBadgeText}>Order: {item.orderNumber}</Text>
          </View>

          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>

          <View style={styles.qtyContainer}>
            <Text style={styles.labelText}>Qty:</Text>
            <Text style={styles.qtyText}>{item.quantity}</Text>
          </View>

          <View style={styles.subtotalContainer}>
            <Text style={styles.labelText}>Price:</Text>
            <Text style={styles.subtotalText}>
              ₱{item.price.toFixed(2)}
            </Text>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalAmount}>
              ₱{subtotal.toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => handleWriteReview(item)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="star-outline"
              size={18}
              color="#fff"
            />
            <Text style={styles.reviewButtonText}>Write Review</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#B76E79" />
        <Text style={styles.loadingText}>Loading your items...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#B76E79" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>To Review</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Content */}
      {toReviewItems.length === 0 ? (
        // Empty state
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="check-circle"
            size={80}
            color="#B76E79"
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>No Items to Review</Text>
          <Text style={styles.emptyText}>
            You don't have any delivered items waiting for reviews yet.
          </Text>
          <TouchableOpacity
            style={styles.continueShoppingButton}
            onPress={() => navigation.navigate('Products')}
            activeOpacity={0.8}
          >
            <Text style={styles.continueShoppingText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // List of products to review
        <FlatList
          data={toReviewItems}
          renderItem={renderToReviewItem}
          keyExtractor={(item) => item.reviewKey}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 20,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginTop: 40,
  },

  backButton: {
    padding: 4,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#B76E79',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 90,
  },

  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    flexDirection: 'row',
  },

  productImage: {
    width: 120,
    height: 140,
    backgroundColor: '#f0f0f0',
    resizeMode: 'cover',
  },

  detailsContainer: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },

  orderBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },

  orderBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B76E79',
  },

  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },

  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  labelText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginRight: 6,
  },

  qtyText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },

  subtotalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  subtotalText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },

  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },

  totalLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginRight: 6,
  },

  totalAmount: {
    fontSize: 16,
    color: '#B76E79',
    fontWeight: '700',
  },

  reviewButton: {
    flexDirection: 'row',
    backgroundColor: '#B76E79',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },

  reviewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  emptyIcon: {
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  continueShoppingButton: {
    backgroundColor: '#B76E79',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },

  continueShoppingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ReviewScreen;