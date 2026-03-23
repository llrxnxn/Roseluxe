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
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/api';
import AdminHeader from './AdminHeader';

export default function AdminDiscounts({ navigation }) {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [token, setToken] = useState('');
  
  // Product selection state
  const [availableProducts, setAvailableProducts] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    discountPercentage: '',
    minPurchaseAmount: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date().toISOString().split('T')[0],
    selectedProducts: [],
  });

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
      label: 'Discounts',
      icon: 'percent',
      onPress: () => navigation.navigate('AdminDiscounts'),
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
                Alert.alert('Error', 'Failed to logout');
              }
            },
          },
        ]);
      },
    },
  ];

  useEffect(() => {
    getToken();
  }, []);

  useEffect(() => {
    if (token) {
      fetchDiscounts();
      fetchAvailableProducts();
    }
  }, [token]);

  const getToken = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('token');
      setToken(savedToken);
    } catch (error) {
      console.log('Error getting token:', error);
    }
  };

  const fetchAvailableProducts = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCTS);
      setAvailableProducts(response.data.products || []);
    } catch (error) {
      console.log('Error fetching products:', error);
    }
  };

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.DISCOUNTS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDiscounts(response.data.discounts || []);
    } catch (error) {
      console.log('Error fetching discounts:', error);
      Alert.alert('Error', 'Failed to fetch discounts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDiscounts();
  };

  const openModal = (discount = null) => {
    if (discount) {
      setEditingDiscount(discount);
      setFormData({
        discountPercentage: discount.discountValue.toString(),
        minPurchaseAmount: discount.minPurchaseAmount?.toString() || '',
        validFrom: new Date(discount.validFrom).toISOString().split('T')[0],
        validUntil: new Date(discount.validUntil).toISOString().split('T')[0],
        selectedProducts: discount.products?.map(p => p._id) || [],
      });
    } else {
      setEditingDiscount(null);
      setFormData({
        discountPercentage: '',
        minPurchaseAmount: '',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date().toISOString().split('T')[0],
        selectedProducts: [],
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingDiscount(null);
    setShowProductDropdown(false);
    setProductSearchQuery('');
  };

  const generateDiscountCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PROMO_${timestamp}_${random}`;
  };

  const saveDiscount = async () => {
    try {
      // Validation
      if (!formData.discountPercentage || parseFloat(formData.discountPercentage) <= 0) {
        Alert.alert('Error', 'Please enter a valid discount percentage (greater than 0)');
        return;
      }

      if (parseFloat(formData.discountPercentage) > 100) {
        Alert.alert('Error', 'Discount percentage cannot exceed 100%');
        return;
      }

      // Products are optional - will apply to all products if none selected
      const validFromDate = new Date(formData.validFrom);
      const validUntilDate = new Date(formData.validUntil);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (validFromDate < today && !editingDiscount) {
        Alert.alert('Error', 'Valid from date cannot be in the past');
        return;
      }

      if (validUntilDate <= validFromDate) {
        Alert.alert('Error', 'Valid until date must be after valid from date');
        return;
      }

      const payload = {
        code: editingDiscount ? editingDiscount.code : generateDiscountCode(),
        description: `${formData.discountPercentage}% discount on selected products`,
        discountType: 'percentage',
        discountValue: parseFloat(formData.discountPercentage),
        minPurchaseAmount: formData.minPurchaseAmount ? parseFloat(formData.minPurchaseAmount) : 0,
        validFrom: validFromDate.toISOString(),
        validUntil: validUntilDate.toISOString(),
        products: formData.selectedProducts,
      };

      // Debug logging
      console.log('=== SENDING DISCOUNT PAYLOAD ===');
      console.log('Code:', payload.code);
      console.log('Description:', payload.description);
      console.log('DiscountValue:', payload.discountValue, 'Type:', typeof payload.discountValue);
      console.log('MinPurchaseAmount:', payload.minPurchaseAmount, 'Type:', typeof payload.minPurchaseAmount);
      console.log('ValidFrom:', payload.validFrom);
      console.log('ValidUntil:', payload.validUntil);
      console.log('Products:', payload.products);
      console.log('================================');

      if (editingDiscount) {
        // Update
        await axios.put(
          API_ENDPOINTS.DISCOUNT_BY_ID(editingDiscount._id),
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        Alert.alert('Success', 'Discount updated successfully');
      } else {
        // Create
        await axios.post(
          API_ENDPOINTS.DISCOUNTS,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        Alert.alert('Success', 'Discount created successfully');
      }

      closeModal();
      fetchDiscounts();
    } catch (error) {
      console.log('=== ERROR SAVING DISCOUNT ===');
      console.log('Status Code:', error.response?.status);
      console.log('Error Message:', error.response?.data?.message);
      console.log('Validation Errors:', error.response?.data?.errors);
      console.log('Full Error Response:', JSON.stringify(error.response?.data, null, 2));
      console.log('Request Payload:', JSON.stringify(payload, null, 2));
      console.log('=============================');

      const message = error.response?.data?.message || 'Failed to save discount';
      const errors = error.response?.data?.errors || {};

      // Build detailed error message
      let errorText = message;
      if (Object.keys(errors).length > 0) {
        errorText = Object.entries(errors)
          .map(([field, error]) => `${field}: ${error}`)
          .join('\n');
      }

      Alert.alert('Error', errorText);
    }
  };

  const deleteDiscount = (id) => {
    Alert.alert('Delete', 'Are you sure you want to delete this discount?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await axios.delete(
              API_ENDPOINTS.DISCOUNT_BY_ID(id),
              { headers: { Authorization: `Bearer ${token}` } }
            );
            Alert.alert('Success', 'Discount deleted successfully');
            fetchDiscounts();
          } catch (error) {
            console.log('Error deleting discount:', error);
            Alert.alert('Error', 'Failed to delete discount');
          }
        },
      },
    ]);
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      await axios.patch(
        API_ENDPOINTS.DISCOUNT_TOGGLE(id),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchDiscounts();
    } catch (error) {
      console.log('Error toggling status:', error);
      Alert.alert('Error', 'Failed to toggle status');
    }
  };

  const toggleProductSelection = (productId) => {
    setFormData((prev) => {
      const isSelected = prev.selectedProducts.includes(productId);
      return {
        ...prev,
        selectedProducts: isSelected
          ? prev.selectedProducts.filter((id) => id !== productId)
          : [...prev.selectedProducts, productId],
      };
    });
  };

  const getSelectedProductDetails = () => {
    return availableProducts.filter((p) => formData.selectedProducts.includes(p._id));
  };

  const getFilteredProducts = () => {
    return availableProducts.filter((p) =>
      p.name.toLowerCase().includes(productSearchQuery.toLowerCase())
    );
  };

  const filteredDiscounts = discounts.filter((discount) =>
    discount.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    discount.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderModalContent = () => (
    <>
      <Text style={styles.label}>Discount Percentage *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 20"
        value={formData.discountPercentage}
        onChangeText={(text) => setFormData({ ...formData, discountPercentage: text })}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Minimum Order Price</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 50.00"
        value={formData.minPurchaseAmount}
        onChangeText={(text) => setFormData({ ...formData, minPurchaseAmount: text })}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Apply to Products (Optional)</Text>
      <TouchableOpacity
        style={styles.dropdownToggle}
        onPress={() => setShowProductDropdown(!showProductDropdown)}
      >
        <View style={styles.dropdownToggleContent}>
          <Text style={styles.dropdownToggleText}>
            {formData.selectedProducts.length > 0
              ? `${formData.selectedProducts.length} product(s) selected`
              : 'Select Products'}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={showProductDropdown ? 'chevron-up' : 'chevron-down'}
          size={24}
          color="#2196F3"
        />
      </TouchableOpacity>

      {showProductDropdown && (
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownSearchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color="#999" />
            <TextInput
              placeholder="Search products..."
              style={styles.dropdownSearchInput}
              value={productSearchQuery}
              onChangeText={setProductSearchQuery}
            />
          </View>

          <FlatList
            data={getFilteredProducts()}
            keyExtractor={(item) => item._id}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  formData.selectedProducts.includes(item._id) && styles.dropdownItemSelected,
                ]}
                onPress={() => toggleProductSelection(item._id)}
              >
                <View style={styles.checkboxContainer}>
                  {formData.selectedProducts.includes(item._id) && (
                    <View style={styles.checkbox}>
                      <MaterialCommunityIcons name="check" size={16} color="white" />
                    </View>
                  )}
                </View>
                <View style={styles.dropdownItemContent}>
                  <Text style={styles.dropdownItemName}>{item.name}</Text>
                  <Text style={styles.dropdownItemPrice}>₱{item.price}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {formData.selectedProducts.length > 0 && (
        <View style={styles.selectedProductsContainer}>
          <Text style={styles.selectedProductsLabel}>Selected Products:</Text>
          <View style={styles.selectedProductsList}>
            {getSelectedProductDetails().map((product) => (
              <View key={product._id} style={styles.selectedProductTag}>
                <Text style={styles.selectedProductText}>{product.name}</Text>
                <TouchableOpacity onPress={() => toggleProductSelection(product._id)}>
                  <MaterialCommunityIcons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.label}>Valid From</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={formData.validFrom}
        onChangeText={(text) => setFormData({ ...formData, validFrom: text })}
      />

      <Text style={styles.label}>Valid Until</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={formData.validUntil}
        onChangeText={(text) => setFormData({ ...formData, validUntil: text })}
      />

      <Button mode="contained" style={styles.saveButton} onPress={saveDiscount}>
        {editingDiscount ? 'Update Discount' : 'Create Discount'}
      </Button>
    </>
  );

  const renderDiscountItem = ({ item }) => (
    <View style={styles.discountCard}>
      <View style={styles.discountHeader}>
        <View style={styles.discountInfo}>
          <Text style={styles.discountCode}>{item.code}</Text>
          <Text style={styles.discountType}>
            {item.discountType === 'percentage' ? `${item.discountValue}%` : `$${item.discountValue}`}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#4CAF50' : '#ff9800' }]}>
          <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>

      <Text style={styles.discountDescription}>{item.description}</Text>

      <View style={styles.discountDetails}>
        <Text style={styles.detailText}>Valid: {new Date(item.validFrom).toLocaleDateString()} - {new Date(item.validUntil).toLocaleDateString()}</Text>
        <Text style={styles.detailText}>Used: {item.totalUsed}/{item.totalUsageLimit || 'Unlimited'}</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.iconButton} onPress={() => openModal(item)}>
          <MaterialCommunityIcons name="pencil" size={20} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => toggleStatus(item._id, item.isActive)}
        >
          <MaterialCommunityIcons
            name={item.isActive ? 'pause-circle' : 'play-circle'}
            size={20}
            color="#ff9800"
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => deleteDiscount(item._id)}>
          <MaterialCommunityIcons name="delete" size={20} color="#f44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AdminHeader
        title="Discounts Management"
        menuItems={menuItems}
        onNavigate={(route) => navigation.navigate(route)}
      />

      <ScrollView style={styles.content}>
        <View style={styles.topSection}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={24} color="#999" />
            <TextInput
              placeholder="Search discounts..."
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
            <MaterialCommunityIcons name="plus" size={24} color="white" />
            <Text style={styles.addButtonText}>Add Discount</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
        ) : filteredDiscounts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="tag-off" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No discounts found</Text>
          </View>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={filteredDiscounts}
            keyExtractor={(item) => item._id}
            renderItem={renderDiscountItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </ScrollView>

      {/* Modal for Create/Edit */}
      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingDiscount ? 'Edit Discount' : 'Create Discount'}</Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            style={styles.formContainer}
            scrollEnabled={true}
            data={[{ id: 'form' }]}
            keyExtractor={(item) => item.id}
            renderItem={() => (
              <View>
                {renderModalContent()}
              </View>
            )}
            ListFooterComponent={<View style={{ height: 20 }} />}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  topSection: {
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  discountCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  discountInfo: {
    flex: 1,
  },
  discountCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  discountType: {
    fontSize: 14,
    color: '#2196F3',
    marginTop: 4,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  discountDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  discountDetails: {
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 10,
  },
  iconButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    padding: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  typeButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  typeButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 20,
    marginBottom: 30,
    paddingVertical: 8,
  },
  dropdownToggle: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropdownToggleContent: {
    flex: 1,
  },
  dropdownToggleText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    marginBottom: 12,
    maxHeight: 250,
    overflow: 'hidden',
  },
  dropdownSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  dropdownSearchInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  dropdownItemPrice: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  selectedProductsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  selectedProductsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  selectedProductsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedProductTag: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedProductText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});
