import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';


import { API_ENDPOINTS } from '../config/api';

const ReviewFormScreen = ({ route, navigation }) => {
  
  const { orderId, productId, productName, product } = route.params;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  
  const [displayProduct, setDisplayProduct] = useState(null);

  useEffect(() => {
    // Validate that we have product data
    if (!product || !product.productId) {
      console.error('Missing product data:', product);
      Alert.alert('Error', 'Product information not found');
      navigation.goBack();
      return;
    }

    console.log('Product loaded:', {
      productId: product.productId,
      productName: product.productName,
      price: product.price,
      quantity: product.quantity,
      image: product.image,
    });

    setDisplayProduct(product);
    setLoading(false);
  }, [route, product]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - images.length, // Max 5 images
      });

      if (!result.canceled) {
        const newImages = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
        }));
        setImages([...images, ...newImages]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    // =============== VALIDATION ===============

    if (!rating || rating === 0) {
      Alert.alert('Validation Error', 'Please select a rating');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Validation Error', 'Please enter a review comment');
      return;
    }

    if (comment.trim().length < 3) {
      Alert.alert('Validation Error', 'Comment must be at least 3 characters');
      return;
    }

    if (comment.trim().length > 1000) {
      Alert.alert('Validation Error', 'Comment must be 1000 characters or less');
      return;
    }

    try {
      setSubmitting(true);

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        navigation.navigate('Login');
        return;
      }

      // =============== PREPARE FORM DATA ===============

  
      const formData = new FormData();
      formData.append('orderId', orderId);
      formData.append('productId', productId); // Use exact productId from params
      formData.append('rating', parseInt(rating)); // rating to number
      formData.append('comment', comment.trim());

      // Add images
      if (images.length > 0) {
        images.forEach((image, index) => {
          formData.append('images', {
            uri: image.uri,
            type: image.type || 'image/jpeg',
            name: `review_image_${index}.jpg`,
          });
        });
      }

      // =============== SUBMIT REVIEW ===============

      console.log('Submitting review:');
      console.log('   orderId:', orderId);
      console.log('   productId:', productId);
      console.log('   rating:', rating, '(type:', typeof parseInt(rating), ')');
      console.log('   comment length:', comment.trim().length);
      console.log('   images:', images.length);

      const response = await fetch(API_ENDPOINTS.REVIEWS, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - let FormData handle it
        },
        body: formData,
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to create review';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Error response:', errorData);
        } catch (parseError) {
          const errorText = await response.text();
          console.error('Error text:', errorText);
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('Review created successfully:', responseData.data._id);

      Alert.alert('Success', 'Review submitted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to ReviewScreen which will refresh
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Submit review error:', error);
      
      // Handle specific errors
      if (error.message.includes('already reviewed')) {
        Alert.alert(
          'Review Already Exists',
          'You have already reviewed this product for this order.'
        );
      } else if (error.message.includes('delivered')) {
        Alert.alert(
          'Cannot Review',
          'Only delivered orders can be reviewed.'
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to submit review');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#B76E79" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  if (!displayProduct) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle" size={60} color="#B76E79" />
        <Text style={styles.errorTitle}>Product Not Found</Text>
        <Text style={styles.errorText}>
          Could not load product information. Please try again.
        </Text>
        <TouchableOpacity
          style={styles.backButton2}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Write Review</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Card */}
        <View style={styles.productCard}>
          <Image
            source={{ uri: displayProduct.image }}
            style={styles.productImage}
            onError={() => console.log('Product image failed to load')}
          />
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {displayProduct.productName}
            </Text>
            <Text style={styles.productPrice}>₱{displayProduct.price.toFixed(2)}</Text>
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityText}>Qty: {displayProduct.quantity}</Text>
            </View>
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rate this product</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <MaterialCommunityIcons
                  name={rating >= star ? 'star' : 'star-outline'}
                  size={40}
                  color={rating >= star ? '#FFB800' : '#ddd'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingText}>
            {rating > 0 ? `${rating} ${rating === 1 ? 'star' : 'stars'}` : 'Select rating'}
          </Text>
        </View>

        {/* Comment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Review</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Share your experience with this product..."
            placeholderTextColor="#999"
            value={comment}
            onChangeText={setComment}
            maxLength={1000}
            multiline
            numberOfLines={6}
          />
          <Text style={styles.charCount}>{comment.length}/1000</Text>
        </View>

        {/* Images Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Photos (Optional)</Text>
          <TouchableOpacity
            style={[
              styles.uploadButton,
              images.length >= 5 && styles.uploadButtonDisabled,
            ]}
            onPress={handlePickImage}
            disabled={images.length >= 5}
          >
            <MaterialCommunityIcons
              name="cloud-upload"
              size={24}
              color={images.length >= 5 ? '#ccc' : '#B76E79'}
            />
            <Text
              style={[
                styles.uploadButtonText,
                images.length >= 5 && styles.uploadButtonTextDisabled,
              ]}
            >
              {images.length >= 5
                ? 'Maximum images reached'
                : `Add Photos (${images.length}/5)`}
            </Text>
          </TouchableOpacity>

          {/* Image Preview */}
          {images.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              {images.map((image, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.previewImage}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <MaterialCommunityIcons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitReview}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.submitButtonText}>Submitting...</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Review</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
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

  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },

  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  backButton2: {
    marginTop: 20,
    backgroundColor: '#B76E79',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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

  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 20,
  },

  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },

  productImage: {
    width: 80,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
    resizeMode: 'cover',
  },

  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },

  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },

  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B76E79',
    marginBottom: 8,
  },

  quantityBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },

  quantityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },

  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },

  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },

  starButton: {
    padding: 4,
  },

  ratingText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    marginBottom: 6,
  },

  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
  },

  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#B76E79',
    borderRadius: 8,
    paddingVertical: 16,
    gap: 8,
  },

  uploadButtonDisabled: {
    borderColor: '#ddd',
    opacity: 0.6,
  },

  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B76E79',
  },

  uploadButtonTextDisabled: {
    color: '#ccc',
  },

  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },

  imagePreview: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },

  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },

  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#B76E79',
    justifyContent: 'center',
    alignItems: 'center',
  },

  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#B76E79',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ReviewFormScreen;