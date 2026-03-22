import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AdminHeader from './AdminHeader';
import axios from 'axios';
import API_BASE_URL, { API_ENDPOINTS } from '../../config/api'; 

const AdminReviews = ({ navigation }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewsData, setReviewsData] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  const REVIEWS_LIMIT = 10;

  // =============== FETCH PRODUCTS FOR FILTER ===============
  useEffect(() => {
    fetchProductsForFilter();
  }, []);

  const fetchProductsForFilter = async () => {
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
        setProducts(allProducts);
        console.log('Products fetched:', allProducts.length);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Failed to load product filters');
    }
  };

  // =============== FETCH REVIEWS ===============
  useEffect(() => {
    fetchReviews();
  }, [selectedProduct, selectedRating, currentPage]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('token');

      const params = new URLSearchParams({
        page: currentPage,
        limit: REVIEWS_LIMIT,
        sort: '-createdAt',
      });

      if (selectedProduct) {
        params.append('productId', selectedProduct);
      }

      if (selectedRating) {
        params.append('rating', selectedRating);
      }

      const url = `${API_BASE_URL}/api/reviews/admin/all-reviews?${params.toString()}`;
      
      console.log('📡 Fetching reviews from:', url);

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        console.log('Reviews fetched successfully:', response.data.data.length, 'reviews');
        setReviewsData(response.data);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      label: 'Overview',
      icon: 'view-dashboard',
      onPress: () => navigation.navigate('AdminDashboard'),
    },
    {
      label: 'Users',
      icon: 'account-multiple',
      onPress: () => navigation.navigate('AdminUsers'),
    },
    {
      label: 'Products',
      icon: 'flower',
      onPress: () => navigation.navigate('AdminProducts'),
    },
    {
      label: 'Categories',
      icon: 'tag-multiple',
      onPress: () => navigation.navigate('AdminCategories'),
    },
    {
      label: 'Orders',
      icon: 'clipboard-list',
      onPress: () => navigation.navigate('AdminOrders'),
    },
    {
      label: 'Reviews',
      icon: 'star',
      onPress: () => navigation.navigate('AdminReviews'),
    },
    {
      label: 'Logout',
      icon: 'logout',
      onPress: async () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
          { text: 'Cancel' },
          {
            text: 'Logout',
            onPress: async () => {
              try {
                await AsyncStorage.removeItem('token');
                await AsyncStorage.removeItem('user');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                });
              } catch (error) {
                console.log('Logout error:', error);
              }
            },
          },
        ]);
      },
    },
  ];

  const StarRating = ({ rating, size = 14 }) => (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={size}
          color={star <= rating ? '#FFC107' : '#E0E0E0'}
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  );

  const RatingBar = ({ stars, count, percentage }) => (
    <View style={styles.ratingBarRow}>
      <Text style={styles.ratingBarLabel}>{stars}★</Text>
      <View style={styles.ratingBarContainer}>
        <View
          style={[
            styles.ratingBarFill,
            { width: `${percentage}%` },
          ]}
        />
      </View>
      <Text style={styles.ratingBarCount}>{count} ({percentage}%)</Text>
    </View>
  );

  if (loading && !reviewsData) {
    return (
      <SafeAreaView style={styles.container}>
        <AdminHeader
          menuItems={menuItems}
          onMenuPress={(isOpen) => setIsMenuOpen(isOpen)}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B76E79" />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = reviewsData?.stats || {
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: { count: 0, percentage: 0 }, 4: { count: 0, percentage: 0 }, 3: { count: 0, percentage: 0 }, 2: { count: 0, percentage: 0 }, 1: { count: 0, percentage: 0 } },
  };

  const reviews = reviewsData?.data || [];
  const pagination = reviewsData?.pagination || { page: 1, pages: 1, total: 0 };

  return (
    <SafeAreaView style={styles.container}>
      <AdminHeader
        menuItems={menuItems}
        onMenuPress={(isOpen) => setIsMenuOpen(isOpen)}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        scrollEnabled={!isMenuOpen}
      >
        {/* ========== STATS SECTION - COMPACT ========== */}
        <View style={styles.statsSection}>
          {/* Overall Rating */}
          <View style={styles.overallRatingCard}>
            <Text style={styles.overallRatingValue}>
              {stats.averageRating.toFixed(1)}
            </Text>
            <StarRating rating={Math.round(stats.averageRating)} size={16} />
            <Text style={styles.totalReviewsText}>
              {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Rating Distribution */}
          <View style={styles.ratingDistributionCard}>
            {[5, 4, 3, 2, 1].map((stars) => (
              <RatingBar
                key={stars}
                stars={stars}
                count={stats.ratingDistribution[stars]?.count || 0}
                percentage={stats.ratingDistribution[stars]?.percentage || 0}
              />
            ))}
          </View>
        </View>

        {/* ========== FILTERS SECTION - COMPACT ========== */}
        <View style={styles.filtersContainer}>
          {/* Filter by Product */}
          {products.length > 0 && (
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Product:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterScrollContent}
              >
                {products.map((product) => (
                  <TouchableOpacity
                    key={product._id || 'all'}
                    style={[
                      styles.filterButtonSmall,
                      selectedProduct === product._id && styles.filterButtonSmallActive,
                    ]}
                    onPress={() => {
                      setSelectedProduct(product._id);
                      setCurrentPage(1);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterButtonTextSmall,
                        selectedProduct === product._id && styles.filterButtonTextSmallActive,
                      ]}
                      numberOfLines={1}
                    >
                      {product.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Filter by Rating */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>Rating:</Text>
            <View style={styles.ratingFilterContainer}>
              {[5, 4, 3, 2, 1].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingFilterButtonSmall,
                    selectedRating === rating && styles.ratingFilterButtonSmallActive,
                  ]}
                  onPress={() => {
                    setSelectedRating(selectedRating === rating ? null : rating);
                    setCurrentPage(1);
                  }}
                >
                  <Text
                    style={[
                      styles.ratingFilterTextSmall,
                      selectedRating === rating && styles.ratingFilterTextSmallActive,
                    ]}
                  >
                    {rating}★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ========== REVIEWS LIST ========== */}
        <View style={styles.reviewsSection}>
          <Text style={styles.reviewsTitle}>
            Reviews ({pagination.total})
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#B76E79" style={{ marginVertical: 20 }} />
          ) : reviews.length > 0 ? (
            <>
              {reviews.map((review) => (
                <View key={review._id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAuthor}>
                      <Text style={styles.reviewAuthorName}>
                        {review.userId?.fullName || 'Anonymous'}
                      </Text>
                      <Text style={styles.reviewDate}>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <StarRating rating={review.rating} size={14} />
                  </View>

                  <Text style={styles.reviewProductName}>
                    {review.productId?.name}
                  </Text>

                  <Text style={styles.reviewText}>{review.comment}</Text>

                  {review.images && review.images.length > 0 && (
                    <View style={styles.reviewImagesContainer}>
                      {review.images.slice(0, 3).map((image, index) => (
                        <Image
                          key={index}
                          source={{ uri: image.url }}
                          style={styles.reviewImage}
                        />
                      ))}
                    </View>
                  )}

                  <View style={styles.reviewFooter}>
                    <Text style={styles.helpfulCount}>
                      👍 {review.helpful || 0}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <View style={styles.paginationContainer}>
                  <TouchableOpacity
                    disabled={currentPage === 1}
                    onPress={() => setCurrentPage(currentPage - 1)}
                    style={[
                      styles.paginationButtonSmall,
                      currentPage === 1 && styles.paginationButtonDisabled,
                    ]}
                  >
                    <Text style={styles.paginationButtonText}>← Prev</Text>
                  </TouchableOpacity>

                  <Text style={styles.paginationText}>
                    {pagination.page}/{pagination.pages}
                  </Text>

                  <TouchableOpacity
                    disabled={currentPage === pagination.pages}
                    onPress={() => setCurrentPage(currentPage + 1)}
                    style={[
                      styles.paginationButtonSmall,
                      currentPage === pagination.pages && styles.paginationButtonDisabled,
                    ]}
                  >
                    <Text style={styles.paginationButtonText}>Next →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="star-outline"
                size={40}
                color="#D4A5A9"
              />
              <Text style={styles.emptyStateText}>No reviews found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { paddingHorizontal: 12, paddingVertical: 12, paddingBottom: 20 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#666',
  },

  // ========== STATS SECTION ==========
  statsSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  overallRatingCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  overallRatingValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#B76E79',
  },
  starContainer: { flexDirection: 'row', marginVertical: 4 },
  totalReviewsText: { fontSize: 11, color: '#999', marginTop: 4 },

  ratingDistributionCard: {
    flex: 1.2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingBarLabel: { width: 24, fontSize: 11, color: '#333', fontWeight: '600' },
  ratingBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    marginHorizontal: 6,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#B76E79',
    borderRadius: 3,
  },
  ratingBarCount: { fontSize: 10, color: '#999', width: 50, textAlign: 'right' },

  // ========== FILTERS SECTION ==========
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  filterGroup: {
    gap: 6,
  },
  filterGroupTitle: { fontSize: 12, fontWeight: '600', color: '#333' },

  filterScroll: { marginHorizontal: -10 },
  filterScrollContent: { paddingHorizontal: 10, gap: 6 },

  filterButtonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D4A5A9',
    backgroundColor: '#FFFFFF',
  },
  filterButtonSmallActive: {
    backgroundColor: '#B76E79',
    borderColor: '#B76E79',
  },
  filterButtonTextSmall: { fontSize: 12, color: '#666', fontWeight: '500', maxWidth: 60 },
  filterButtonTextSmallActive: { color: '#FFFFFF' },

  ratingFilterContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  ratingFilterButtonSmall: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D4A5A9',
    backgroundColor: '#FFFFFF',
  },
  ratingFilterButtonSmallActive: {
    backgroundColor: '#B76E79',
    borderColor: '#B76E79',
  },
  ratingFilterTextSmall: { fontSize: 11, color: '#B76E79', fontWeight: '600' },
  ratingFilterTextSmallActive: { color: '#FFFFFF' },

  // ========== REVIEWS SECTION ==========
  reviewsSection: { marginBottom: 10 },
  reviewsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },

  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewAuthor: { flex: 1 },
  reviewAuthorName: { fontSize: 13, fontWeight: '600', color: '#333' },
  reviewDate: { fontSize: 10, color: '#999', marginTop: 2 },

  reviewProductName: { fontSize: 11, color: '#B76E79', fontWeight: '500', marginBottom: 6 },
  reviewText: { fontSize: 12, color: '#666', lineHeight: 16, marginBottom: 8 },

  reviewImagesContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },

  reviewFooter: {
    borderTopWidth: 0.5,
    borderTopColor: '#E8E8E8',
    paddingTop: 6,
  },
  helpfulCount: { fontSize: 10, color: '#999' },

  errorContainer: {
    backgroundColor: '#FFE0E0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  errorText: { fontSize: 12, color: '#D32F2F' },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  emptyStateText: { fontSize: 12, color: '#999', marginTop: 8 },

  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  paginationButtonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#B76E79',
  },
  paginationButtonDisabled: {
    backgroundColor: '#D4A5A9',
    opacity: 0.5,
  },
  paginationButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 11 },
  paginationText: { fontSize: 12, color: '#333', fontWeight: '500' },
});

export default AdminReviews;