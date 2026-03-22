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

const safeParseProduct = (product) => {
  try {
    if (!product || typeof product !== 'object') {
      console.warn('Invalid product object:', product);
      return null;
    }

    // Extract productId with all possible fallback paths
    const productId = product?.productId?._id || 
                      product?.productId || 
                      product?._id;
    
    if (!productId || typeof productId !== 'string') {
      console.warn('Product missing valid ID:', product);
      return null;
    }

    // Safe extraction of product fields with defaults
    const productName = (product?.productName || product?.name || 'Unknown Product').toString().trim();
    const imageUrl = product?.image || product?.productImage || 'https://via.placeholder.com/150';
    const price = Number(product?.price);
    const quantity = Number(product?.quantity);

    // Validate numeric fields
    if (isNaN(price) || price < 0) {
      console.warn('Invalid price:', product?.price);
      return null;
    }

    if (isNaN(quantity) || quantity < 1) {
      console.warn('Invalid quantity:', product?.quantity);
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
    console.error('Error parsing product:', error);
    return null;
  }
};

const ReviewScreen = ({ navigation }) => {
  const [toReviewItems, setToReviewItems] = useState([]);
  const [reviewedItems, setReviewedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('toReview'); // 'toReview' or 'reviewed'

  useEffect(() => {
    fetchReviewItems();

    // Refetch when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchReviewItems();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchReviewItems = async () => {
    try {
      setLoading(true);

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
      } catch {
        Alert.alert('Error', 'Corrupted user data. Please login again.');
        await AsyncStorage.multiRemove(['token', 'user']);
        navigation.navigate('Login');
        return;
      }

      const userId = parsedUser._id || parsedUser.id;
      if (!userId) throw new Error('User not found');

      // Fetch orders
      const ordersResponse = await fetch(`${API_ENDPOINTS.ORDERS}/${userId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!ordersResponse.ok) {
        if (ordersResponse.status === 401) {
          Alert.alert('Session Expired', 'Please login again.');
          await AsyncStorage.multiRemove(['token', 'user']);
          navigation.navigate('Login');
          return;
        }

        if (ordersResponse.status === 404) {
          Alert.alert(
            'Error',
            'Orders not found. Please contact support.'
          );
          return;
        }

        throw new Error('Failed to fetch orders');
      }

      const ordersData = await ordersResponse.json();

      if (!ordersData.success || !Array.isArray(ordersData.data)) {
        setToReviewItems([]);
        setReviewedItems([]);
        return;
      }

      // ================= FETCH USER REVIEWS =================
      let reviewsMap = {}; // Map of reviewKey -> review data

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
            reviewsData.data.forEach((review) => {
              const orderId = review.orderId?._id || review.orderId;
              const productId = review.productId?._id || review.productId;
              const reviewKey = `${orderId}_${productId}`;
              reviewsMap[reviewKey] = review;
            });
          }
        }
      } catch {
        // silent fail
      }

      // ================= FILTER DELIVERED ORDERS =================
      const deliveredOrders = ordersData.data.filter(
        (order) => order?.orderStatus === 'delivered'
      );

      // ================= BUILD TO REVIEW & REVIEWED ITEMS =================
      const toReviewList = [];
      const reviewedList = [];

      deliveredOrders.forEach((order) => {
        const products = Array.isArray(order.products) ? order.products :
                         Array.isArray(order.items) ? order.items : [];

        products.forEach((product, index) => {
          const parsedProduct = safeParseProduct(product);
          
          if (!parsedProduct) return;

          const reviewKey = `${order._id}_${parsedProduct.productId}`;
          const subtotal = parsedProduct.price * parsedProduct.quantity;

          const baseItem = {
            reviewKey,
            orderId: order._id,
            orderNumber: order.orderId,
            orderStatus: order.orderStatus,
            productIndex: index,
            productId: parsedProduct.productId,
            productName: parsedProduct.productName,
            image: parsedProduct.image,
            price: parsedProduct.price,
            quantity: parsedProduct.quantity,
            subtotal,
            orderTotalAmount: order.totals?.totalAmount || 0,
            shippingAddress: order.shippingInfo?.address || 'Not provided',
          };

          if (reviewsMap[reviewKey]) {
            // Product has been reviewed
            reviewedList.push({
              ...baseItem,
              review: reviewsMap[reviewKey],
              reviewId: reviewsMap[reviewKey]._id,
              rating: reviewsMap[reviewKey].rating,
              comment: reviewsMap[reviewKey].comment,
              createdAt: reviewsMap[reviewKey].createdAt,
            });
          } else {
            // Product hasn't been reviewed yet
            toReviewList.push(baseItem);
          }
        });
      });

      setToReviewItems(toReviewList);
      setReviewedItems(reviewedList);

    } catch (error) {
      console.error('fetchReviewItems error:', error.message);

      Alert.alert(
        'Error',
        error.message || 'Failed to load your orders.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleWriteReview = (item) => {
    navigation.navigate('ReviewForm', {
      orderId: item.orderId,
      productId: item.productId,
      productName: item.productName,
      orderNumber: item.orderNumber,
      product: {
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      },
    });
  };

  const handleEditReview = (item) => {
    navigation.navigate('ReviewForm', {
      orderId: item.orderId,
      productId: item.productId,
      productName: item.productName,
      orderNumber: item.orderNumber,
      reviewId: item.reviewId,
      isEditing: true,
      initialRating: item.rating,
      initialComment: item.comment,
      product: {
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      },
    });
  };

  const handleDeleteReview = (item) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => deleteReview(item.reviewId),
          style: 'destructive',
        },
      ]
    );
  };

  const deleteReview = async (reviewId) => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Error', 'Please login first');
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${API_ENDPOINTS.REVIEWS}/${reviewId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          Alert.alert('Session Expired', 'Please login again.');
          await AsyncStorage.multiRemove(['token', 'user']);
          navigation.navigate('Login');
          return;
        }

        if (response.status === 403) {
          Alert.alert(
            'Error',
            'You can only delete your own reviews.'
          );
          setLoading(false);
          return;
        }

        if (response.status === 404) {
          Alert.alert('Error', 'Review not found.');
          setLoading(false);
          return;
        }

        throw new Error('Failed to delete review');
      }

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Review deleted successfully');
        // Refresh the review items
        await fetchReviewItems();
      } else {
        Alert.alert('Error', data.message || 'Failed to delete review');
        setLoading(false);
      }
    } catch (error) {
      console.error('Delete review error:', error.message);
      Alert.alert('Error', error.message || 'Failed to delete review');
      setLoading(false);
    }
  };

  /**
   * Render individual "To Review" item card
   */
  const renderToReviewItem = ({ item }) => {
    return (
      <View style={styles.itemCard}>
        <Image
          source={{ uri: item.image }}
          style={styles.productImage}
          onError={() => console.log('Failed to load product image')}
        />

        <View style={styles.detailsContainer}>
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
              ₱{item.subtotal.toFixed(2)}
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

  /**
   * Render individual "Reviewed" item card
   */
  const renderReviewedItem = ({ item }) => {
    const stars = Array(5).fill(0).map((_, i) => i < item.rating ? 'star' : 'star-outline');

    return (
      <View style={styles.itemCard}>
        <Image
          source={{ uri: item.image }}
          style={styles.productImage}
          onError={() => console.log('Failed to load product image')}
        />

        <View style={styles.detailsContainer}>
          <View style={styles.orderBadge}>
            <Text style={styles.orderBadgeText}>Order: {item.orderNumber}</Text>
          </View>

          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>

          {/* Rating Stars */}
          <View style={styles.ratingContainer}>
            {stars.map((star, index) => (
              <MaterialCommunityIcons
                key={index}
                name={star}
                size={16}
                color="#FFB800"
                style={styles.starIcon}
              />
            ))}
            <Text style={styles.ratingText}>({item.rating}.0)</Text>
          </View>

          {/* Review Comment */}
          <Text style={styles.reviewComment} numberOfLines={2}>
            {item.comment || 'No comment'}
          </Text>

          {/* Reviewed Date */}
          <Text style={styles.reviewDate}>
            Reviewed on {new Date(item.createdAt).toLocaleDateString()}
          </Text>

          {/* Action Buttons Container */}
          <View style={styles.buttonContainer}>
            {/* Edit Button */}
            <TouchableOpacity
              style={[styles.editButton, { flex: 1, marginRight: 8 }]}
              onPress={() => handleEditReview(item)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="pencil"
                size={16}
                color="#fff"
              />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              style={[styles.deleteButton, { flex: 1 }]}
              onPress={() => handleDeleteReview(item)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={16}
                color="#fff"
              />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Empty state component
  const renderEmptyState = (message) => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name={activeTab === 'toReview' ? "star-outline" : "check-circle"}
        size={80}
        color="#B76E79"
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyTitle}>
        {activeTab === 'toReview' ? 'No Items to Review' : 'No Reviews Yet'}
      </Text>
      <Text style={styles.emptyText}>{message}</Text>
      {activeTab === 'toReview' && (
        <TouchableOpacity
          style={styles.continueShoppingButton}
          onPress={() => navigation.navigate('Products')}
          activeOpacity={0.8}
        >
          <Text style={styles.continueShoppingText}>Continue Shopping</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#B76E79" />
        <Text style={styles.loadingText}>Loading your items...</Text>
      </View>
    );
  }

  const currentItems = activeTab === 'toReview' ? toReviewItems : reviewedItems;
  const emptyMessage = activeTab === 'toReview'
    ? "You don't have any delivered items waiting for reviews yet."
    : "You haven't written any reviews yet. Start by reviewing your purchased items!";

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
        <Text style={styles.headerTitle}>Reviews</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'toReview' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('toReview')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'toReview' && styles.tabTextActive,
            ]}
          >
            To Review ({toReviewItems.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'reviewed' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('reviewed')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'reviewed' && styles.tabTextActive,
            ]}
          >
            Reviewed ({reviewedItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {currentItems.length === 0 ? (
        renderEmptyState(emptyMessage)
      ) : (
        <FlatList
          data={currentItems}
          renderItem={activeTab === 'toReview' ? renderToReviewItem : renderReviewedItem}
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

  // Tab Navigation Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 16,
  },

  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },

  tabActive: {
    borderBottomColor: '#B76E79',
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },

  tabTextActive: {
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

  // Reviewed Item Styles
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  starIcon: {
    marginRight: 2,
  },

  ratingText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginLeft: 6,
  },

  reviewComment: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 6,
    lineHeight: 16,
  },

  reviewDate: {
    fontSize: 10,
    color: '#999',
    marginBottom: 10,
  },

  // Button Container for Edit and Delete
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },

  editButton: {
    flexDirection: 'row',
    backgroundColor: '#7B6B7E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },

  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  deleteButton: {
    flexDirection: 'row',
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },

  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // Empty State
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