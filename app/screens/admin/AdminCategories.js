import React, { useEffect, useState, useRef } from 'react';
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
import AdminHeader from './AdminHeader';
import { API_ENDPOINTS } from '../../config/api';

export default function AdminCategories({ navigation }) {
  // ========== STATE ==========
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: null,
  });
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    filterCategories();
  }, [searchQuery, categories]);

  /* ================= FETCH CATEGORIES ================= */
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_ENDPOINTS.CATEGORIES}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch');
      }

      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.log('Fetch error:', error);
      Alert.alert('Error', 'Unable to load categories');
    } finally {
      setLoading(false);
    }
  };

  /* ================= FILTER CATEGORIES ================= */
  const filterCategories = () => {
    if (!searchQuery.trim()) {
      setFilteredCategories(categories);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = categories.filter((cat) =>
      cat.name?.toLowerCase().includes(query) ||
      cat.description?.toLowerCase().includes(query)
    );

    setFilteredCategories(filtered);
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
      });

      if (!result.canceled) {
        setFormData((prev) => ({
          ...prev,
          image: {
            uri: result.assets[0].uri,
            isNew: true,
          },
        }));
      }
    } catch (error) {
      console.log('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  /* ================= REMOVE IMAGE ================= */
  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: null,
    }));
  };

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Category name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';

    // Image validation
    if (!isEditing && !formData.image) {
      newErrors.image = 'Category image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= OPEN ADD MODAL ================= */
  const openAddModal = () => {
    setIsEditing(false);
    setFormData({ name: '', description: '', image: null });
    setErrors({});
    setAddModalVisible(true);
  };

  /* ================= OPEN EDIT MODAL ================= */
  const openEditModal = (category) => {
  setIsEditing(true);
  setSelectedCategory(category); // ✅ ADD THIS - CRITICAL FIX!
  setFormData({
    name: category.name,
    description: category.description,
    image: category.image ? { uri: category.image, isNew: false } : null,
  });
  setErrors({});
  setAddModalVisible(true);
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

    // Add image if new
    if (formData.image?.isNew) {
      formDataObj.append('image', {
        uri: formData.image.uri,
        type: 'image/jpeg',
        name: `category-${Date.now()}.jpg`,
      });
    }

    const method = isEditing ? 'PUT' : 'POST';
    
    // ✅ FIXED: Now selectedCategory will always have value when editing
    const endpoint = isEditing
      ? `${API_ENDPOINTS.CATEGORIES}/${selectedCategory._id}`
      : API_ENDPOINTS.CATEGORIES;

    const response = await fetch(endpoint, {
      method,
      body: formDataObj,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to save category');
    }

    if (data.success) {
      Alert.alert(
        'Success',
        isEditing ? 'Category updated successfully' : 'Category created successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              setAddModalVisible(false);
              fetchCategories();
            },
          },
        ]
      );
    }
  } catch (error) {
    console.log('Submit error:', error);
    Alert.alert('Error', error.message || 'Failed to save category');
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
  const InputField = ({ label, field, placeholder, multiline = false }) => (
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
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  /* ================= LOADING ================= */
  if (loading && categories.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <AdminHeader onMenuPress={setSidebarOpen} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B76E79" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AdminHeader onMenuPress={setSidebarOpen} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Categories</Text>
            <Text style={styles.subtitle}>Total: {categories.length}</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddModal}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search categories..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />

        {/* ========== CATEGORIES LIST ========== */}
        {filteredCategories.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="folder-multiple-outline" size={64} color="#ddd" />
            <Text style={styles.emptyText}>No categories found</Text>
          </View>
        ) : (
          <View style={styles.categoryGrid}>
            {filteredCategories.map((category) => (
              <TouchableOpacity
                key={category._id}
                style={styles.categoryCard}
                onPress={() => {
                  setSelectedCategory(category);
                  setCurrentImageIndex(0);
                  setModalVisible(true);
                }}
              >
                <Image
                  source={{
                    uri: category.image || 'https://via.placeholder.com/150',
                  }}
                  style={styles.categoryImage}
                />
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {category.name}
                  </Text>
                  <Text style={styles.categoryDesc} numberOfLines={2}>
                    {category.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ================= ADD/EDIT MODAL ================= */}
      <Modal visible={addModalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={28} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Category' : 'Add New Category'}
              </Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.modalBody}>
              {/* Category Image */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Category Image</Text>
                {formData.image ? (
                  <View style={styles.imagePreview}>
                    <Image
                      source={{ uri: formData.image.uri }}
                      style={styles.previewImage}
                    />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={removeImage}
                    >
                      <MaterialCommunityIcons name="close-circle" size={28} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={pickImage}
                  >
                    <MaterialCommunityIcons
                      name="cloud-upload-outline"
                      size={24}
                      color="#B76E79"
                    />
                    <Text style={styles.uploadButtonText}>Choose Image</Text>
                  </TouchableOpacity>
                )}
                {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
              </View>

              {/* Category Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Category Information</Text>
                <InputField
                  label="Category Name *"
                  field="name"
                  placeholder="e.g., Bouquets"
                />
                <InputField
                  label="Description *"
                  field="description"
                  placeholder="Describe this category..."
                  multiline
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>
                      {isEditing ? 'Update Category' : 'Create Category'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAddModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ================= CATEGORY DETAIL MODAL ================= */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          {selectedCategory && (
            <>
              {/* Image */}
              <View style={styles.detailImageContainer}>
                <Image
                  source={{
                    uri: selectedCategory.image || 'https://via.placeholder.com/300',
                  }}
                  style={styles.detailImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.detailCloseBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <MaterialCommunityIcons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Details */}
              <ScrollView style={styles.detailContent}>
                <Text style={styles.detailTitle}>{selectedCategory.name}</Text>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>
                    {selectedCategory.description}
                  </Text>
                </View>

                {selectedCategory.createdAt && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Created</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedCategory.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                      setModalVisible(false);
                      openEditModal(selectedCategory);
                    }}
                  >
                    <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => {
                      setModalVisible(false);
                      handleDeleteCategory(selectedCategory._id);
                    }}
                  >
                    <MaterialCommunityIcons name="trash-can" size={18} color="#fff" />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B76E79',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },

  // ========== GRID VIEW ==========
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  categoryImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  categoryInfo: {
    padding: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  categoryDesc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },

  // ========== EMPTY STATE ==========
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },

  // ========== MODAL STYLES ==========
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalBody: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
  },

  // ========== IMAGE UPLOAD ==========
  uploadButton: {
    borderWidth: 2,
    borderColor: '#B76E79',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff5f7',
  },
  uploadButtonText: {
    color: '#B76E79',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
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

  // ========== BUTTONS ==========
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

  // ========== DETAIL MODAL ==========
  detailImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
    position: 'relative',
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  detailCloseBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 50,
  },
  detailContent: {
    flex: 1,
    padding: 20,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
    color: '#333',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  editBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  closeBtn: {
    paddingVertical: 12,
    marginBottom: 20,
  },
  closeBtnText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },

  // ========== LOADING ==========
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
