import React, { useEffect } from 'react';
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
  RefreshControl,
} from 'react-native';
import { Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProducts,
  deleteProduct,
  bulkDeleteProducts,
  setSearchQuery,
  toggleItemSelection,
  toggleSelectAll,
  setSelectionMode,
  clearSelection,
  setSelectedProduct,
  setCurrentImageIndex,
  clearSelectedProduct,
  clearError,
  setRefreshing,
} from '../../redux/slices/productSlice';
import AdminHeader from './AdminHeader';

export default function AdminProducts({ navigation }) {
  const dispatch = useDispatch();

  // Redux selectors
  const {
    items: products,
    filteredItems: filteredProducts,
    loading,
    refreshing,
    error,
    searchQuery,
    selectedItems,
    selectionMode,
    selectedProduct,
    currentImageIndex,
  } = useSelector((state) => state.products);

  // Menu items configuration
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
                await AsyncStorage.removeItem('authToken');
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

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  /* ================= REFRESH PRODUCTS ================= */
  const onRefresh = async () => {
    dispatch(setRefreshing(true));
    dispatch(clearSelection());
    dispatch(fetchProducts());
  };

  /* ================= BULK DELETE ================= */
  const handleBulkDelete = () => {
    if (selectedItems.length === 0) {
      Alert.alert('Warning', 'Select products first');
      return;
    }

    Alert.alert(
      'Delete Products',
      `Delete ${selectedItems.length} selected product(s)? This cannot be undone.`,
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await dispatch(bulkDeleteProducts(selectedItems));
            if (bulkDeleteProducts.fulfilled.match(result)) {
              Alert.alert('Success', `${result.payload.deletedCount} product(s) deleted`);
            }
          },
        },
      ]
    );
  };

  /* ================= SINGLE DELETE ================= */
  const handleDeleteProduct = (productId) => {
    Alert.alert('Delete Product', 'Are you sure you want to delete this product?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await dispatch(deleteProduct(productId));
          if (deleteProduct.fulfilled.match(result)) {
            Alert.alert('Success', 'Product deleted successfully');
          }
        },
      },
    ]);
  };

  /* ================= EDIT PRODUCT ================= */
  const handleEditProduct = (product) => {
    dispatch(clearSelectedProduct());
    navigation.navigate('AdminAddProduct', { product });
  };

  /* ================= SAFE FORMAT ================= */
  const formatPrice = (price) => {
    return Number(price || 0).toFixed(2);
  };

  /* ================= GET CATEGORY NAME ================= */
  const getCategoryName = (category) => {
    if (typeof category === 'object' && category?.name) {
      return category.name;
    }
    return category || 'N/A';
  };

  /* ================= LOADING ================= */
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <AdminHeader
          menuItems={menuItems}
          onMenuPress={() => {}}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B76E79" />
          <Text style={{ marginTop: 12, color: '#999' }}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AdminHeader
        menuItems={menuItems}
        onMenuPress={() => {}}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#B76E79']}
            tintColor="#B76E79"
          />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Products Management</Text>
            <Text style={styles.subtitle}>
              Total: {products.length} | Filtered: {filteredProducts.length}
            </Text>
          </View>
          <View style={styles.headerButtons}>

            {/* ADD BUTTON */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AdminAddProduct')}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or category..."
          value={searchQuery}
          onChangeText={(text) => dispatch(setSearchQuery(text))}
          placeholderTextColor="#999"
        />

        {/* ========== SELECTION MODE ========== */}
        {selectionMode && (
          <View style={styles.selectionBar}>
            <TouchableOpacity
              style={styles.selectAllBtn}
              onPress={() => dispatch(toggleSelectAll())}
            >
              <MaterialCommunityIcons
                name={
                  selectedItems.length === filteredProducts.length
                    ? 'checkbox-marked'
                    : 'checkbox-blank-outline'
                }
                size={20}
                color="#B76E79"
              />
              <Text style={styles.selectAllText}>
                {selectedItems.length}/{filteredProducts.length}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelSelectionBtn}
              onPress={() => dispatch(clearSelection())}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {selectedItems.length > 0 && (
          <TouchableOpacity
            style={styles.bulkDeleteBtn}
            onPress={handleBulkDelete}
          >
            <MaterialCommunityIcons name="trash-can" size={18} color="#fff" />
            <Text style={styles.bulkDeleteText}>
              Delete ({selectedItems.length})
            </Text>
          </TouchableOpacity>
        )}

        {/* ========== PRODUCTS LIST ========== */}
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="inbox" size={64} color="#ddd" />
            <Text style={styles.emptyText}>
              {products.length === 0
                ? 'No products in database'
                : 'No products match your search'}
            </Text>
          </View>
        ) : (
          filteredProducts.map((product) => (
            <View key={product._id} style={styles.cardWrapper}>
              {/* ✅ CHECKBOX BEFORE IMAGE */}
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => {
                  if (!selectionMode) {
                    dispatch(setSelectionMode(true));
                  }
                  dispatch(toggleItemSelection(product._id));
                }}
              >
                <MaterialCommunityIcons
                  name={
                    selectedItems.includes(product._id)
                      ? 'checkbox-marked'
                      : 'checkbox-blank-outline'
                  }
                  size={24}
                  color={selectedItems.includes(product._id) ? '#B76E79' : '#ccc'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.card,
                  selectedItems.includes(product._id) && styles.cardSelected,
                ]}
                onPress={() => {
                  if (selectionMode) {
                    dispatch(toggleItemSelection(product._id));
                  } else {
                    dispatch(setSelectedProduct(product));
                  }
                }}
                onLongPress={() => {
                  if (!selectionMode) {
                    dispatch(setSelectionMode(true));
                    dispatch(toggleItemSelection(product._id));
                  }
                }}
              >
                <Image
                  source={{
                    uri:
                      product.images && product.images.length > 0
                        ? product.images[0]
                        : 'https://via.placeholder.com/150',
                  }}
                  style={styles.image}
                  onError={() => console.log('Image failed to load:', product._id)}
                />

                <View style={styles.productInfo}>
                  <Text style={styles.name} numberOfLines={2}>
                    {product.name || 'No name'}
                  </Text>
                  <Text style={styles.category}>
                    {getCategoryName(product.category)}
                  </Text>
                  <View style={styles.priceStockRow}>
                    <Text style={styles.price}>₱{formatPrice(product.price)}</Text>
                    <Text
                      style={[
                        styles.stock,
                        product.stock < 5 && styles.stockLow,
                      ]}
                    >
                      Stock: {product.stock ?? 0}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* ================= PRODUCT DETAIL MODAL ================= */}
      <Modal
        visible={selectedProduct !== null}
        animationType="slide"
        onRequestClose={() => dispatch(clearSelectedProduct())}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          {selectedProduct && (
            <>
              {/* ========== IMAGE CAROUSEL ========== */}
              <View style={styles.modalImageContainer}>
                {selectedProduct.images && selectedProduct.images.length > 0 ? (
                  <>
                    <Image
                      source={{
                        uri: selectedProduct.images[currentImageIndex],
                      }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />

                    {selectedProduct.images.length > 1 && (
                      <>
                        <TouchableOpacity
                          style={[styles.navButton, styles.prevButton]}
                          onPress={() =>
                            dispatch(
                              setCurrentImageIndex(
                                (currentImageIndex - 1 + selectedProduct.images.length) %
                                selectedProduct.images.length
                              )
                            )
                          }
                        >
                          <MaterialCommunityIcons
                            name="chevron-left"
                            size={28}
                            color="#fff"
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.navButton, styles.nextButton]}
                          onPress={() =>
                            dispatch(
                              setCurrentImageIndex(
                                (currentImageIndex + 1) % selectedProduct.images.length
                              )
                            )
                          }
                        >
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={28}
                            color="#fff"
                          />
                        </TouchableOpacity>

                        <View style={styles.imageIndicator}>
                          <Text style={styles.imageIndicatorText}>
                            {currentImageIndex + 1}/{selectedProduct.images.length}
                          </Text>
                        </View>
                      </>
                    )}
                  </>
                ) : (
                  <View
                    style={[
                      styles.modalImage,
                      { justifyContent: 'center', alignItems: 'center' },
                    ]}
                  >
                    <MaterialCommunityIcons name="image-off" size={64} color="#ccc" />
                  </View>
                )}

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => dispatch(clearSelectedProduct())}
                >
                  <MaterialCommunityIcons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* ========== PRODUCT DETAILS ========== */}
              <ScrollView style={styles.modalContent}>
                <Text style={styles.modalTitle}>{selectedProduct.name}</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.modalPrice}>
                    ₱{formatPrice(selectedProduct.price)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>
                    {getCategoryName(selectedProduct.category)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Stock</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      selectedProduct.stock < 5 && styles.stockLow,
                    ]}
                  >
                    {selectedProduct.stock ?? 0} units
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.description}>
                    {selectedProduct.description}
                  </Text>
                </View>

                {selectedProduct.images && selectedProduct.images.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>All Images</Text>
                    <FlatList
                      horizontal
                      data={selectedProduct.images}
                      keyExtractor={(_, index) => index.toString()}
                      renderItem={({ item, index }) => (
                        <TouchableOpacity
                          onPress={() => dispatch(setCurrentImageIndex(index))}
                        >
                          <Image
                            source={{ uri: item }}
                            style={[
                              styles.thumbnailImage,
                              index === currentImageIndex &&
                              styles.thumbnailActive,
                            ]}
                          />
                        </TouchableOpacity>
                      )}
                      scrollEnabled
                      showsHorizontalScrollIndicator={false}
                    />
                  </View>
                )}

                {/* ========== ACTION BUTTONS ========== */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleEditProduct(selectedProduct)}
                  >
                    <MaterialCommunityIcons
                      name="pencil"
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => {
                      dispatch(clearSelectedProduct());
                      handleDeleteProduct(selectedProduct._id);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="trash-can"
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => dispatch(clearSelectedProduct())}
                >
                  <Text style={styles.closeModalText}>Close</Text>
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },

  // ========== SELECTION MODE ==========
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  cancelSelectionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelText: {
    color: '#666',
    fontWeight: '600',
  },

  // ========== BULK DELETE ==========
  bulkDeleteBtn: {
    backgroundColor: '#ff4444',
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  bulkDeleteText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },

  // ========== CARD STYLES ==========
  cardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  checkbox: {
    padding: 8,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardSelected: {
    backgroundColor: '#f5f0f1',
    borderWidth: 2,
    borderColor: '#B76E79',
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  priceStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    color: '#B76E79',
    fontWeight: '700',
  },
  stock: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stockLow: {
    color: '#ff6b6b',
    backgroundColor: '#ffe0e0',
  },

  // ========== EMPTY STATE ==========
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },

  // ========== MODAL STYLES ==========
  modalImageContainer: {
    width: '100%',
    height: 320,
    backgroundColor: '#000',
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -14 }],
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 50,
  },
  prevButton: {
    left: 12,
  },
  nextButton: {
    right: 12,
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 50,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    color: '#333',
  },
  modalPrice: {
    fontSize: 24,
    color: '#B76E79',
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  detailSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginTop: 8,
  },
  thumbnailImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  thumbnailActive: {
    borderWidth: 2,
    borderColor: '#B76E79',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
  closeModalBtn: {
    paddingVertical: 12,
    marginBottom: 20,
  },
  closeModalText: {
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