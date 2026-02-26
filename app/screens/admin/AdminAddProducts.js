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
  FlatList,
} from 'react-native';
import { Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { API_ENDPOINTS } from '../../config/api';
import AdminHeader from './AdminHeader';

export default function AdminAddProduct({ route, navigation }) {
  const editingProduct = route.params?.product;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '0',
    stock: '0',
    category: '',
    images: [],
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(true);

  // ✅ Fetch categories from database
  useEffect(() => {
    fetchCategories();
  }, []);

  // ✅ Pre-fill form if editing
  useEffect(() => {
    if (editingProduct) {
      console.log('📝 EDITING PRODUCT:', editingProduct._id);
      console.log('📝 EXISTING IMAGES:', editingProduct.images.length);
      
      setFormData({
        name: editingProduct.name,
        description: editingProduct.description,
        price: editingProduct.price.toString(),
        stock: editingProduct.stock.toString(),
        category: editingProduct.category,
        images: editingProduct.images.map(uri => ({
          uri,
          isNew: false,
        })),
      });
    }
  }, [editingProduct]);

  /* ================= FETCH CATEGORIES ================= */
  const fetchCategories = async () => {
    try {
      setCategoryLoading(true);
      // ✅ Fetch from your categories API endpoint
      // Adjust endpoint if different
      const response = await fetch(`${API_ENDPOINTS.CATEGORIES || 'http://localhost:5000/api/categories'}`);
      const data = await response.json();

      if (data.success && data.categories) {
        setCategories(data.categories);
        console.log('✅ Categories loaded:', data.categories.length);
      } else {
        console.warn('⚠️ Could not load categories');
      }
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
    } finally {
      setCategoryLoading(false);
    }
  };

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price < 0) {
      newErrors.price = 'Price must be a valid positive number';
    }

    const stock = parseInt(formData.stock);
    if (formData.stock && (isNaN(stock) || stock < 0)) {
      newErrors.stock = 'Stock must be a valid non-negative number';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!editingProduct && (!formData.images || formData.images.length === 0)) {
      newErrors.images = 'At least one image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= IMAGE PICKER ================= */
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultiple: true,
      });

      if (!result.canceled) {
        const newImages = result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.fileName || `image-${Date.now()}-${index}.jpg`,
          type: 'image/jpeg',
          isNew: true,
        }));

        console.log('📸 Multiple images selected:', newImages.length);

        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...newImages],
        }));
        
        console.log('✅ Added:', newImages.length, 'images');
      }
    } catch (error) {
      console.log('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  /* ================= REMOVE IMAGE ================= */
  const removeImage = (index) => {
    console.log('🗑️  Removing image:', index);
    
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
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

  /* ================= SELECT CATEGORY ================= */
  const selectCategory = (categoryName) => {
    setFormData((prev) => ({
      ...prev,
      category: categoryName,
    }));
    setShowCategoryDropdown(false);
    
    if (errors.category) {
      setErrors((prev) => ({
        ...prev,
        category: '',
      }));
    }
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
      formDataObj.append('price', formData.price.toString());
      formDataObj.append('stock', formData.stock.toString());
      formDataObj.append('category', formData.category.trim());

      const newImages = formData.images.filter(img => img.isNew);
      
      if (newImages.length > 0) {
        newImages.forEach((image, index) => {
          formDataObj.append('images', {
            uri: image.uri,
            type: 'image/jpeg',
            name: image.name || `product-${Date.now()}-${index}.jpg`,
          });
        });
      }

      const isEditing = !!editingProduct;
      const endpoint = isEditing
        ? `${API_ENDPOINTS.PRODUCTS}/${editingProduct._id}`
        : API_ENDPOINTS.PRODUCTS;

      const method = isEditing ? 'PUT' : 'POST';

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
              onPress: () => {
                setFormData({
                  name: '',
                  description: '',
                  price: '0',
                  stock: '0',
                  category: '',
                  images: [],
                });
                setErrors({});
                navigation.goBack();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('❌ SUBMIT ERROR:', error);
      Alert.alert('Error', error.message || 'Failed to save product');
    } finally {
      setLoading(false);
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
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AdminHeader onMenuPress={setSidebarOpen} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </Text>
          </View>
        </View>

        {/* Product Image Section */}
        <View style={styles.section}>
          <View style={styles.imageSectionHeader}>
            <Text style={styles.sectionTitle}>Product Images ({formData.images.length})</Text>
          </View>

          {formData.images.length > 0 ? (
            <View style={styles.imagePreviewContainer}>
              {formData.images.map((image, index) => (
                <View key={index} style={styles.imagePreviewItem}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.previewImage}
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index)}
                  >
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={32}
                      color="#ff4444"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.addMoreButton}
            onPress={pickImage}
          >
            <MaterialCommunityIcons
              name="plus-circle"
              size={48}
              color="#B76E79"
            />
            <Text style={styles.addMoreText}>Add More</Text>
          </TouchableOpacity>

          {errors.images && (
            <Text style={styles.errorText}>{errors.images}</Text>
          )}
        </View>

        {/* Product Info Section */}
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

          {/* ✅ Price and Stock Side by Side */}
          <View style={styles.priceStockRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Price (₱) *</Text>
              <TextInput
                style={[styles.input, errors.price && styles.inputError]}
                placeholder="e.g., 299"
                value={formData.price}
                onChangeText={(value) => handleInputChange('price', value)}
                keyboardType="decimal-pad"
              />
              {errors.price && (
                <Text style={styles.errorText}>{errors.price}</Text>
              )}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Stock *</Text>
              <TextInput
                style={[styles.input, errors.stock && styles.inputError]}
                placeholder="e.g., 50"
                value={formData.stock}
                onChangeText={(value) => handleInputChange('stock', value)}
                keyboardType="number-pad"
              />
              {errors.stock && (
                <Text style={styles.errorText}>{errors.stock}</Text>
              )}
            </View>
          </View>

          {/* ✅ Category Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity
              style={[styles.categoryDropdown, errors.category && styles.inputError]}
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <Text style={[styles.categoryText, !formData.category && { color: '#999' }]}>
                {formData.category || 'Select Category'}
              </Text>
              <MaterialCommunityIcons
                name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#B76E79"
              />
            </TouchableOpacity>

            {/* ✅ Dropdown Menu */}
            {showCategoryDropdown && (
              <View style={styles.dropdownMenu}>
                {categoryLoading ? (
                  <View style={styles.loadingDropdown}>
                    <ActivityIndicator size="small" color="#B76E79" />
                  </View>
                ) : categories.length > 0 ? (
                  <FlatList
                    data={categories}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          formData.category === item.name && styles.dropdownItemSelected,
                        ]}
                        onPress={() => selectCategory(item.name)}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            formData.category === item.name && styles.dropdownItemTextSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item._id}
                  />
                ) : (
                  <Text style={styles.noCategories}>No categories available</Text>
                )}
              </View>
            )}

            {errors.category && (
              <Text style={styles.errorText}>{errors.category}</Text>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            loading && styles.submitButtonDisabled,
          ]}
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
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
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

  headerRow: {
    marginBottom: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },

  section: {
    marginBottom: 24,
  },

  imageSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },

  // ========== IMAGE STYLES ==========
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },

  imagePreviewItem: {
    position: 'relative',
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },

  previewImage: {
    width: '100%',
    height: 120,
  },

  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 50,
  },

  addMoreButton: {
    borderWidth: 2,
    borderColor: '#B76E79',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 40,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff5f7',
    gap: 8,
  },

  addMoreText: {
    color: '#B76E79',
    fontSize: 14,
    fontWeight: '600',
  },

  // ========== INPUT STYLES ==========
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

  // ========== PRICE & STOCK ROW ==========
  priceStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },

  // ========== CATEGORY DROPDOWN ==========
  categoryDropdown: {
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

  categoryText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  dropdownMenu: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },

  loadingDropdown: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  dropdownItemSelected: {
    backgroundColor: '#fff5f7',
  },

  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },

  dropdownItemTextSelected: {
    color: '#B76E79',
    fontWeight: '600',
  },

  noCategories: {
    padding: 12,
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },

  // ========== BUTTON STYLES ==========
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#B76E79',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
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
});