import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { API_ENDPOINTS } from '../../config/api';

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
  const [errors, setErrors] = useState({});
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

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
        categoryName: product.category?.name || 'N/A',
      });
    }
  };

  /* ================= PICK IMAGES ================= */
  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultiple: true,
      });

      if (!result.canceled) {
        const newImages = result.assets.map((asset) => ({
          uri: asset.uri,
          isNew: true,
        }));

        setSelectedImages([...selectedImages, ...newImages]);
        console.log('Images selected:', newImages.length);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  /* ================= REMOVE IMAGE ================= */
  const removeImage = (index, isNew) => {
    if (isNew) {
      setSelectedImages(selectedImages.filter((_, i) => i !== index));
    } else {
      setFormData((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
    }
  };

  /* ================= SELECT CATEGORY ================= */
  const selectCategory = (categoryId, categoryName) => {
    console.log('Category selected:', {
      categoryId,
      categoryName,
    });

    setFormData((prev) => ({
      ...prev,
      category: categoryId,
    }));

    setCategoryModalVisible(false);

    // Clear category error if exists
    if (errors.category) {
      setErrors((prev) => ({
        ...prev,
        category: '',
      }));
    }
  };

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.description.trim())
      newErrors.description = 'Description is required';
    if (!formData.price || isNaN(parseFloat(formData.price)))
      newErrors.price = 'Valid price is required';
    if (!formData.category) newErrors.category = 'Category is required';

    // Image validation
    const totalImages = formData.images.length + selectedImages.length;
    if (totalImages === 0) {
      newErrors.images = 'At least one image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= SUBMIT FORM ================= */
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);

      const formDataObj = new FormData();
      formDataObj.append('name', formData.name.trim());
      formDataObj.append('description', formData.description.trim());
      formDataObj.append('price', parseFloat(formData.price));
      formDataObj.append('stock', parseInt(formData.stock) || 0);
      formDataObj.append('category', formData.category); 

      console.log('Submitting product:', {
        name: formData.name,
        category: formData.category,
        newImages: selectedImages.length,
        existingImages: formData.images.length,
      });

      // Add new images
      selectedImages.forEach((img) => {
        formDataObj.append('images', {
          uri: img.uri,
          type: 'image/jpeg',
          name: `product-${Date.now()}.jpg`,
        });
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
      console.error(' Submit error:', error);
      Alert.alert('Error', error.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  /* ================= INPUT HANDLER ================= */
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  /* ================= INPUT FIELD COMPONENT ================= */
  const InputField = ({
    label,
    field,
    placeholder,
    multiline = false,
    keyboardType = 'default',
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && { height: 80, textAlignVertical: 'top' },
          errors[field] && styles.inputError,
        ]}
        placeholder={placeholder}
        value={formData[field]}
        onChangeText={(value) => handleInputChange(field, value)}
        multiline={multiline}
        keyboardType={keyboardType}
        editable={!loading}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  /* ================= LOADING ================= */
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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

          {/* Image Grid */}
          <View style={styles.imageGrid}>
            {/* Existing Images */}
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

            {/* New Images */}
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

            {/* Add Image Button */}
            <TouchableOpacity
              style={styles.addImageBtn}
              onPress={pickImages}
              disabled={loading}
            >
              <MaterialCommunityIcons
                name="plus"
                size={32}
                color="#B76E79"
              />
            </TouchableOpacity>
          </View>

          {errors.images && (
            <Text style={styles.errorText}>{errors.images}</Text>
          )}
        </View>

        {/* ========== PRODUCT INFO ========== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Information</Text>

          <InputField
            label="Product Name *"
            field="name"
            placeholder="e.g., Red Rose Bouquet"
          />

          <InputField
            label="Description *"
            field="description"
            placeholder="Describe the product..."
            multiline
          />

          <InputField
            label="Price *"
            field="price"
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <InputField
            label="Stock"
            field="stock"
            placeholder="0"
            keyboardType="number-pad"
          />

          {/* Category Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                errors.category && styles.inputError,
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
            {errors.category && (
              <Text style={styles.errorText}>{errors.category}</Text>
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
                    onPress={() =>
                      selectCategory(category._id, category.name)
                    }
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