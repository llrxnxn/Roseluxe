import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { API_ENDPOINTS } from '../../config/api';

// ===== MEMOIZED INPUT FIELD COMPONENT (PREVENTS RE-RENDER) =====
const InputField = React.memo(({
  label,
  field,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  value,
  error,
  loading,
  onChange,
  onFocus,
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[
        styles.input,
        multiline && { height: 80, textAlignVertical: 'top' },
        error && styles.inputError,
      ]}
      placeholder={placeholder}
      value={value}
      onChangeText={onChange}
      onFocus={onFocus}
      multiline={multiline}
      keyboardType={keyboardType}
      editable={!loading}
      placeholderTextColor="#999"
      scrollEnabled={multiline}
    />
    {error && (
      <Text style={styles.errorText}>{error}</Text>
    )}
  </View>
));

InputField.displayName = 'InputField';

export default function AdminAddProduct({ navigation, route }) {
  const isEditing = !!route?.params?.product;
  const product = route?.params?.product;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    images: [],
  });

  const [categories, setCategories] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // UI-only errors (for form display)
  const [clientErrors, setClientErrors] = useState({});
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (isEditing && product) {
      initializeForm();
    }
  }, []);

  /* ================= FETCH CATEGORIES ================= */
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch(API_ENDPOINTS.CATEGORIES);
      const data = await response.json();

      if (data.success) {
        console.log('Categories loaded:', data.categories.length);
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  /* ================= INITIALIZE FORM (EDIT MODE) ================= */
  const initializeForm = () => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: String(product.price || ''),
        stock: String(product.stock || ''),
        category: product.category?._id || product.category || '',
        images: product.images || [],
      });

      console.log('Editing product:', {
        name: product.name,
        categoryId: product.category?._id || product.category,
      });
    }
  };

  /* ================= REQUEST CAMERA PERMISSION ================= */
  const requestCameraPermission = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Camera permission is required to take photos.'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Camera permission error:', error);
      return false;
    }
  };

  /* ================= REQUEST MEDIA LIBRARY PERMISSION ================= */
  const requestMediaLibraryPermission = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Media library permission is required to access photos.'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Media library permission error:', error);
      return false;
    }
  };

  /* ================= DETECT IMAGE MIME TYPE ================= */
  const detectImageMimeType = useCallback((uri) => {
    const uriParts = uri.split('.');
    const fileExtension = uriParts[uriParts.length - 1].toLowerCase();

    const mimeTypeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
      tiff: 'image/tiff',
      ico: 'image/x-icon',
      heic: 'image/heic',
    };

    return mimeTypeMap[fileExtension] || 'image/jpeg';
  }, []);

  /* ================= GET FILE EXTENSION FROM MIME TYPE ================= */
  const getFileExtensionFromMimeType = useCallback((mimeType) => {
    const extensionMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'image/svg+xml': 'svg',
      'image/tiff': 'tiff',
      'image/x-icon': 'ico',
      'image/heic': 'heic',
    };

    return extensionMap[mimeType] || 'jpg';
  }, []);

  /* ================= TAKE PHOTO WITH CAMERA ================= */
  const takePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const mimeType = detectImageMimeType(uri);

        const newImage = {
          uri,
          mimeType,
          isNew: true,
        };

        setSelectedImages([...selectedImages, newImage]);
        console.log('Photo taken successfully:', { uri, mimeType });
        setImagePickerModalVisible(false);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  /* ================= PICK IMAGES FROM LIBRARY ================= */
  const pickImageFromLibrary = async () => {
    try {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultiple: true,
      });

      if (!result.canceled) {
        const newImages = result.assets.map((asset) => {
          const mimeType = detectImageMimeType(asset.uri);
          return {
            uri: asset.uri,
            mimeType,
            isNew: true,
          };
        });

        setSelectedImages([...selectedImages, ...newImages]);
        console.log('Images selected:', {
          count: newImages.length,
          types: newImages.map(img => img.mimeType),
        });
        setImagePickerModalVisible(false);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  /* ================= REMOVE IMAGE ================= */
  const removeImage = useCallback((index, isNew) => {
    if (isNew) {
      setSelectedImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setFormData((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
    }
  }, []);

  /* ================= SELECT CATEGORY ================= */
  const selectCategory = useCallback((categoryId) => {
    console.log('Category selected:', categoryId);

    setFormData((prev) => ({
      ...prev,
      category: categoryId,
    }));

    setCategoryModalVisible(false);

    // Clear category error if exists
    setClientErrors((prev) => ({
      ...prev,
      category: '',
    }));
  }, []);

  /* ================= CLIENT-SIDE VALIDATION (UI ONLY) ================= */
  const validateFormUI = useCallback(() => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }

    if (!formData.price) {
      errors.price = 'Price is required';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    const totalImages = formData.images.length + selectedImages.length;
    if (totalImages === 0) {
      errors.images = 'At least one image is required';
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, selectedImages]);

  /* ================= SUBMIT FORM ================= */
  const handleSubmit = async () => {
    if (!validateFormUI()) {
      Alert.alert('Validation Error', 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      setClientErrors({});

      const formDataObj = new FormData();
      formDataObj.append('name', formData.name.trim());
      formDataObj.append('description', formData.description.trim());
      formDataObj.append('price', formData.price);
      formDataObj.append('stock', formData.stock || '0');
      formDataObj.append('category', formData.category);
      formDataObj.append('existingImages', JSON.stringify(formData.images));

      selectedImages.forEach((img, index) => {
        const fileExtension = getFileExtensionFromMimeType(img.mimeType);
        formDataObj.append('images', {
          uri: img.uri,
          type: img.mimeType,
          name: `product-${Date.now()}-${index}.${fileExtension}`,
        });
      });

      console.log('Submitting product:', {
        name: formData.name,
        category: formData.category,
        newImages: selectedImages.length,
        newImageTypes: selectedImages.map(img => img.mimeType),
        existingImages: formData.images.length,
      });

      const method = isEditing ? 'PUT' : 'POST';
      const endpoint = isEditing
        ? `${API_ENDPOINTS.PRODUCTS}/${product._id}`
        : API_ENDPOINTS.PRODUCTS;

      const response = await fetch(endpoint, {
        method,
        body: formDataObj,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && typeof data.errors === 'object') {
          setClientErrors(data.errors);
          Alert.alert('Validation Error', 'Please fix the errors below');
          return;
        }
        
        throw new Error(data.message || 'Failed to save product');
      }

      if (data.success) {
        Alert.alert(
          'Success',
          isEditing ? 'Product updated successfully' : 'Product created successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  /* ================= INPUT HANDLER ================= */
  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /* ================= CLEAR ERROR ON FOCUS ================= */
  const handleInputFocus = useCallback((field) => {
    setClientErrors((prev) => ({
      ...prev,
      [field]: '',
    }));
  }, []);

  /* ================= IMAGE PICKER MODAL COMPONENT ================= */
  const ImagePickerModal = () => (
    <Modal
      visible={imagePickerModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setImagePickerModalVisible(false)}
    >
      <SafeAreaView style={styles.pickerModalContainer}>
        <View style={styles.pickerModalContent}>
          <View style={styles.pickerModalHeader}>
            <Text style={styles.pickerModalTitle}>Add Product Image</Text>
            <TouchableOpacity
              onPress={() => setImagePickerModalVisible(false)}
            >
              <MaterialCommunityIcons
                name="close"
                size={28}
                color="#333"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerOptionsContainer}>
            <TouchableOpacity
              style={styles.pickerOption}
              onPress={takePhoto}
            >
              <View style={styles.pickerOptionIcon}>
                <MaterialCommunityIcons
                  name="camera"
                  size={48}
                  color="#fff"
                />
              </View>
              <View style={styles.pickerOptionText}>
                <Text style={styles.pickerOptionTitle}>Take a Photo</Text>
                <Text style={styles.pickerOptionDesc}>
                  Use your camera to capture a new photo
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={pickImageFromLibrary}
            >
              <View style={styles.pickerOptionIcon}>
                <MaterialCommunityIcons
                  name="image-multiple"
                  size={48}
                  color="#fff"
                />
              </View>
              <View style={styles.pickerOptionText}>
                <Text style={styles.pickerOptionTitle}>Upload Photos</Text>
                <Text style={styles.pickerOptionDesc}>
                  Choose from your photo gallery (any image type)
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.pickerCancelBtn}
            onPress={() => setImagePickerModalVisible(false)}
          >
            <Text style={styles.pickerCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  /* ================= LOADING STATE ================= */
  if (loadingCategories) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B76E79" />
          <Text style={{ marginTop: 12 }}>Loading categories...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* ========== HEADER ========== */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={28}
                color="#B76E79"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {/* ========== PRODUCT IMAGES ========== */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Images</Text>

            <View style={styles.imageGrid}>
              {formData.images.map((image, index) => (
                <View key={`existing-${index}`} style={styles.imageContainer}>
                  <Image
                    source={{ uri: image }}
                    style={styles.imagePreview}
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index, false)}
                  >
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={24}
                      color="#ff4444"
                    />
                  </TouchableOpacity>
                </View>
              ))}

              {selectedImages.map((image, index) => (
                <View key={`new-${index}`} style={styles.imageContainer}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.imagePreview}
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index, true)}
                  >
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={24}
                      color="#ff4444"
                    />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addImageBtn}
                onPress={() => setImagePickerModalVisible(true)}
                disabled={loading}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={32}
                  color="#B76E79"
                />
                <Text style={styles.addImageBtnText}>Add Image</Text>
              </TouchableOpacity>
            </View>

            {clientErrors.images && (
              <Text style={styles.errorText}>{clientErrors.images}</Text>
            )}
          </View>

          {/* ========== PRODUCT INFO ========== */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Information</Text>

            <InputField
              label="Product Name *"
              field="name"
              placeholder="e.g., Red Rose Bouquet"
              value={formData.name}
              error={clientErrors.name}
              loading={loading}
              onChange={(value) => handleInputChange('name', value)}
              onFocus={() => handleInputFocus('name')}
            />

            <InputField
              label="Description *"
              field="description"
              placeholder="Describe the product..."
              multiline
              value={formData.description}
              error={clientErrors.description}
              loading={loading}
              onChange={(value) => handleInputChange('description', value)}
              onFocus={() => handleInputFocus('description')}
            />

            <InputField
              label="Price *"
              field="price"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={formData.price}
              error={clientErrors.price}
              loading={loading}
              onChange={(value) => handleInputChange('price', value)}
              onFocus={() => handleInputFocus('price')}
            />

            <InputField
              label="Stock"
              field="stock"
              placeholder="0"
              keyboardType="number-pad"
              value={formData.stock}
              error={clientErrors.stock}
              loading={loading}
              onChange={(value) => handleInputChange('stock', value)}
              onFocus={() => handleInputFocus('stock')}
            />

            {/* Category Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  clientErrors.category && styles.inputError,
                ]}
                onPress={() => setCategoryModalVisible(true)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    !formData.category && styles.categoryButtonPlaceholder,
                  ]}
                >
                  {formData.category
                    ? categories.find((c) => c._id === formData.category)
                        ?.name || 'Select Category'
                    : 'Select Category'}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color="#B76E79"
                />
              </TouchableOpacity>
              {clientErrors.category && (
                <Text style={styles.errorText}>{clientErrors.category}</Text>
              )}
            </View>
          </View>

          {/* ========== SUBMIT BUTTON ========== */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color="#fff"
                />
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Update Product' : 'Create Product'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* ========== CANCEL BUTTON ========== */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ================= CATEGORY MODAL ================= */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        transparent={true}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setCategoryModalVisible(false)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={28}
                  color="#333"
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.categoryList}>
              {categories.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    No categories available. Create one first.
                  </Text>
                </View>
              ) : (
                categories.map((category) => (
                  <TouchableOpacity
                    key={category._id}
                    style={[
                      styles.categoryItem,
                      formData.category === category._id &&
                        styles.categoryItemSelected,
                    ]}
                    onPress={() => selectCategory(category._id)}
                  >
                    <Image
                      source={{ uri: category.image }}
                      style={styles.categoryItemImage}
                    />
                    <View style={styles.categoryItemInfo}>
                      <Text style={styles.categoryItemName}>
                        {category.name}
                      </Text>
                      <Text style={styles.categoryItemDesc}>
                        {category.description}
                      </Text>
                    </View>
                    {formData.category === category._id && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={24}
                        color="#B76E79"
                      />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ================= IMAGE PICKER MODAL ================= */}
      <ImagePickerModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ========== HEADER ==========
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },

  // ========== SECTIONS ==========
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
  },

  // ========== IMAGE GRID ==========
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageContainer: {
    width: '30%',
    aspectRatio: 1,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 50,
    elevation: 3,
  },
  addImageBtn: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: '#B76E79',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff5f7',
  },
  addImageBtnText: {
    color: '#B76E79',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },

  // ========== FORM INPUTS ==========
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },

  // ========== CATEGORY BUTTON ==========
  categoryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  categoryButtonPlaceholder: {
    color: '#999',
  },

  // ========== BUTTONS ==========
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#B76E79',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },

  // ========== IMAGE PICKER MODAL ==========
  pickerModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  pickerOptionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  pickerOptionIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#B76E79',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOptionText: {
    flex: 1,
  },
  pickerOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  pickerOptionDesc: {
    fontSize: 13,
    color: '#666',
  },
  pickerCancelBtn: {
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerCancelText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },

  // ========== CATEGORY MODAL ==========
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  categoryItemSelected: {
    backgroundColor: '#f5f0f1',
  },
  categoryItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  categoryItemInfo: {
    flex: 1,
  },
  categoryItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  categoryItemDesc: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
