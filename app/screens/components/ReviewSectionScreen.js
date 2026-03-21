import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../../config/api';

const ReviewSection = ({ productId, navigation }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
  });

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // ================================
  // FETCH REVIEWS
  // ================================
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_ENDPOINTS.REVIEWS}/product/${productId}`);

      console.log('Reviews Response:', res.data);

      if (res.data.success) {
        const reviewsWithUserData = res.data.data.map((review) => {
          console.log('Review data:', {
            id: review._id,
            userId: review.userId,
            userName: review.userId?.fullName,
            userEmail: review.userId?.email,
          });
          return review;
        });

        setReviews(reviewsWithUserData);
        setStats(res.data.stats || {
          averageRating: 0,
          totalReviews: 0,
        });
      }
    } catch (error) {
      console.log('Fetch reviews error:', error);
      console.log('Error response:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // GET CURRENT USER ID
  // ================================
  const getCurrentUserId = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUserId(user._id);
        console.log('Current user ID:', user._id);
      }
    } catch (error) {
      console.log('Get user ID error:', error);
    }
  };

  // ================================
  // LIFECYCLE
  // ================================
  useEffect(() => {
    if (productId) {
      fetchReviews();
      getCurrentUserId();
    }
  }, [productId]);

  // ================================
  // DELETE REVIEW
  // ================================
  const handleDeleteReview = (reviewId) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const res = await axios.delete(
                `${API_ENDPOINTS.REVIEWS}/${reviewId}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              if (res.data.success) {
                Alert.alert('Success', 'Review deleted successfully');
                fetchReviews();
              }
            } catch (error) {
              console.log('Delete review error:', error);
              Alert.alert('Error', 'Failed to delete review');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  // ================================
  // EDIT REVIEW
  // ================================
  const openEditModal = (review) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment);
    setShowEditModal(true);
  };

  const handleUpdateReview = async () => {
    if (!editRating || editRating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (!editComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    try {
      setIsUpdating(true);
      const token = await AsyncStorage.getItem('token');

      const res = await axios.put(
        `${API_ENDPOINTS.REVIEWS}/${editingReview._id}`,
        {
          rating: parseInt(editRating),
          comment: editComment.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        Alert.alert('Success', 'Review updated successfully');
        setShowEditModal(false);
        setEditingReview(null);
        fetchReviews();
      }
    } catch (error) {
      console.log('Update review error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update review');
    } finally {
      setIsUpdating(false);
    }
  };

  // ================================
  // HELPFUL REACTION
  // ================================
  const handleHelpful = async (reviewId) => {
    try {
      const token = await AsyncStorage.getItem('token');

      const res = await axios.put(
        `${API_ENDPOINTS.REVIEWS}/${reviewId}/helpful`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        setReviews((prevReviews) =>
          prevReviews.map((r) =>
            r._id === reviewId
              ? {
                  ...r,
                  helpful: res.data.helpful,
                  isHelpful: res.data.isHelpful,
                }
              : r
          )
        );
      }
    } catch (error) {
      console.log('Helpful error:', error.response?.data || error);
    }
  };

  // ================================
  // GET USER FULL NAME
  // ================================
  const getUserFullName = (review) => {
    if (review.userId?.fullName) {
      return review.userId.fullName;
    }
    if (review.userId?.fullName) {
      return `${review.userId.fullName}`;
    }
    if (review.userId?.fullName) {
      return review.userId.fullName;
    }
    if (typeof review.userId === 'string') {
      return 'Anonymous User';
    }
    return 'Unknown User';
  };

  // ================================
  // GET USER EMAIL
  // ================================
  const getUserEmail = (review) => {
    if (review.userId?.email) {
      return review.userId.email;
    }
    if (review.userEmail) {
      return review.userEmail;
    }
    return 'No email provided';
  };

  // ================================
  // RENDER STAR RATING
  // ================================
  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialCommunityIcons
            key={star}
            name={rating >= star ? 'star' : 'star-outline'}
            size={14}
            color={rating >= star ? '#FFB800' : '#ddd'}
          />
        ))}
      </View>
    );
  };

  // ================================
  // RENDER REVIEW ITEM
  // ================================
  const renderReviewItem = ({ item }) => {
    const isOwnReview = currentUserId && 
      (item.userId?._id === currentUserId || item.userId === currentUserId);

    console.log('Rendering review:', {
      reviewId: item._id,
      itemUserId: item.userId?._id || item.userId,
      currentUserId,
      isOwn: isOwnReview,
    });

    return (
      <View style={styles.reviewCard}>
        {/* Review Header */}
        <View style={styles.reviewHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {getUserFullName(item)}
            </Text>
            <Text style={styles.userEmail}>
              {getUserEmail(item)}
            </Text>
          </View>

          <View style={styles.ratingAndActions}>
            <View style={styles.ratingContainer}>
              {renderStars(item.rating)}
              <Text style={styles.ratingText}>{item.rating}.0</Text>
            </View>

            {isOwnReview && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => openEditModal(item)}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={18}
                    color="#B76E79"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleDeleteReview(item._id)}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color="#ff6b6b"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Review Comment */}
        <Text style={styles.comment}>{item.comment}</Text>

        {/* Review Images */}
        {item.images && item.images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagesContainer}
          >
            {item.images.map((img, index) => (
              <Image
                key={index}
                source={{ uri: img.url || img }}
                style={styles.reviewImage}
              />
            ))}
          </ScrollView>
        )}

        {/* Review Footer - Helpful & Verified Badge */}
        <View style={styles.reviewFooter}>
          <TouchableOpacity
            style={[
              styles.helpfulBtn,
              item.isHelpful && styles.helpfulBtnActive,
            ]}
            onPress={() => handleHelpful(item._id)}
          >
            <MaterialCommunityIcons
              name={item.isHelpful ? 'thumb-up' : 'thumb-up-outline'}
              size={16}
              color={item.isHelpful ? '#fff' : '#999'}
            />
            <Text
              style={[
                styles.helpfulText,
                item.isHelpful && styles.helpfulTextActive,
              ]}
            >
              {item.helpful || 0}
            </Text>
          </TouchableOpacity>

          {item.isVerifiedPurchase && (
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons
                name="check-circle"
                size={12}
                color="#4caf50"
              />
              <Text style={styles.verifiedText}>Verified Purchase</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ================================
  // RENDER EDIT MODAL
  // ================================
  const renderEditModal = () => {
    if (!editingReview) return null;

    return (
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={styles.editModalContainer}>
          <View style={styles.editModalHeader}>
            <TouchableOpacity
              onPress={() => setShowEditModal(false)}
              style={styles.closeBtn}
            >
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>Edit Review</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.editModalContent}>
            {/* Rating */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Rating</Text>
              <View style={styles.editRatingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setEditRating(star)}
                    style={styles.editStarBtn}
                  >
                    <MaterialCommunityIcons
                      name={editRating >= star ? 'star' : 'star-outline'}
                      size={32}
                      color={editRating >= star ? '#FFB800' : '#ddd'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.editRatingText}>
                {editRating > 0 ? `${editRating} stars` : 'Select rating'}
              </Text>
            </View>

            {/* Comment */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Comment</Text>
              <TextInput
                style={styles.editCommentInput}
                placeholder="Update your comment..."
                placeholderTextColor="#999"
                value={editComment}
                onChangeText={setEditComment}
                multiline
                numberOfLines={5}
                maxLength={1000}
              />
              <Text style={styles.charCount}>
                {editComment.length}/1000
              </Text>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Update Button */}
          <View style={styles.editModalFooter}>
            <TouchableOpacity
              style={[
                styles.updateBtn,
                isUpdating && styles.updateBtnDisabled,
              ]}
              onPress={handleUpdateReview}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.updateBtnText}>Updating...</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="check"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.updateBtnText}>Update Review</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // ================================
  // MAIN RENDER
  // ================================
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#B76E79" />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Reviews Header with Stats */}
      <View style={styles.reviewsHeaderContainer}>
        <View style={styles.reviewsHeader}>
          <Text style={styles.reviewsTitle}>Customer Reviews</Text>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.ratingStats}>
            <Text style={styles.averageRating}>
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
            </Text>
            <View style={styles.statsRight}>
              {renderStars(Math.round(stats.averageRating || 0))}
              <Text style={styles.totalReviews}>
                {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="comment-multiple-outline"
            size={40}
            color="#ccc"
          />
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>Be the first to review this product</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Edit Modal */}
      {renderEditModal()}
    </View>
  );
};

export default ReviewSection;

// ================================
// STYLES
// ================================

const styles = StyleSheet.create({
  mainContainer: {
    marginTop: 24,
    marginHorizontal: -16,
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
  },

  loadingContainer: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },

  /* REVIEWS HEADER CONTAINER */
  reviewsHeaderContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  reviewsHeader: {
    marginBottom: 12,
  },

  reviewsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    letterSpacing: 0.5,
  },

  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#B76E79',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  ratingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  averageRating: {
    fontSize: 36,
    fontWeight: '900',
    color: '#B76E79',
  },

  statsRight: {
    flex: 1,
  },

  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 6,
  },

  totalReviews: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    fontWeight: '600',
  },

  /* REVIEW CARD */
  reviewCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },

  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  userInfo: {
    flex: 1,
    marginRight: 12,
  },

  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },

  userEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  ratingAndActions: {
    alignItems: 'flex-end',
    gap: 8,
  },

  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginLeft: 4,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },

  actionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },

  comment: {
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
    marginBottom: 12,
  },

  imagesContainer: {
    marginBottom: 12,
  },

  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#e8e8e8',
  },

  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },

  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },

  helpfulBtnActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },

  helpfulText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },

  helpfulTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#e8f5e9',
  },

  verifiedText: {
    fontSize: 11,
    color: '#4caf50',
    fontWeight: '600',
  },

  separator: {
    height: 0,
  },

  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },

  emptySubtext: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 4,
  },

  /* EDIT MODAL */
  editModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },

  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },

  closeBtn: {
    padding: 6,
  },

  editModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },

  editModalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  editSection: {
    marginBottom: 20,
  },

  editSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },

  editRatingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },

  editStarBtn: {
    padding: 4,
  },

  editRatingText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },

  editCommentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    color: '#333',
    textAlignVertical: 'top',
    marginBottom: 6,
  },

  charCount: {
    textAlign: 'right',
    fontSize: 11,
    color: '#999',
  },

  editModalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },

  updateBtn: {
    backgroundColor: '#B76E79',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  updateBtnDisabled: {
    backgroundColor: '#ccc',
  },

  updateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});