import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
// Redux imports
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, updateOrderStatus, clearSuccess } from '../../redux/slices/ordersSlice';
import AdminHeader from './AdminHeader';

const AdminOrders = ({ navigation }) => {
  // ================= REDUX =================
  const dispatch = useDispatch();
  const { items: orders, loading, error, updating, success, refreshing } = useSelector(
    (state) => state.orders
  );

  // ================= LOCAL STATE =================
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [authToken, setAuthToken] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // ================= INIT TOKEN =================
  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Login required');
        navigation.navigate('Login');
        return;
      }
      setAuthToken(token);
    };
    init();
  }, []);

  // ================= FETCH ORDERS FROM REDUX =================
  useEffect(() => {
    if (authToken) {
      dispatch(fetchOrders(authToken));
    }
  }, [authToken, dispatch]);

  // ================= HANDLE SUCCESS =================
  useEffect(() => {
    if (success) {
      Alert.alert('Success', 'Order status updated');
      setDetailsModalVisible(false);
      dispatch(clearSuccess());
    }
  }, [success, dispatch]);

  // ================= HANDLE ERROR =================
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  // ================= REFRESH =================
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (authToken) {
      await dispatch(fetchOrders(authToken));
    }
    setIsRefreshing(false);
  }, [authToken, dispatch]);

  // ================= UPDATE ORDER STATUS =================
  const handleUpdateOrderStatus = (id, status) => {
    dispatch(
      updateOrderStatus({
        orderId: id,
        status: status,
        authToken: authToken,
      })
    );
  };

  // ================= FILTER & SORT =================
  const filtered =
    filterStatus === 'all'
      ? orders
      : orders.filter((o) => o.orderStatus === filterStatus);

  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);

    if (sortOrder === 'newest') {
      return dateB - dateA;
    } else {
      return dateA - dateB;
    }
  });

  // ================= LOADING =================
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AdminHeader
          menuItems={menuItems}
          onMenuPress={(isOpen) => setIsMenuOpen(isOpen)}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B76E79" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AdminHeader
        menuItems={menuItems}
        onMenuPress={(isOpen) => setIsMenuOpen(isOpen)}
      />

      <FlatList
        data={sorted}
        keyExtractor={(item) => item._id?.toString()}
        scrollEnabled={!isMenuOpen}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#B76E79"
          />
        }
        ListHeaderComponent={
          <>
            {/* TITLE SECTION */}
            <View style={styles.titleSection}>
              <MaterialCommunityIcons
                name="clipboard-list"
                size={28}
                color="#B76E79"
              />
              <Text style={styles.titleText}>Orders Management</Text>
              <Text style={styles.countText}>
                {filtered.length} {filtered.length === 1 ? 'order' : 'orders'}
              </Text>
            </View>

            {/* FILTER */}
            <View style={styles.filterSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterRow}
              >
                {['all', 'pending', 'shipped', 'delivered', 'cancelled'].map(
                  (status) => (
                    <Pressable
                      key={status}
                      style={[
                        styles.filterBtn,
                        filterStatus === status && styles.activeBtnFilter,
                      ]}
                      onPress={() => setFilterStatus(status)}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          filterStatus === status && styles.activeFilterText,
                        ]}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </Pressable>
                  )
                )}
              </ScrollView>
            </View>

            {/* SORT SECTION */}
            <View style={styles.sortSection}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              <View style={styles.sortButtonsContainer}>
                <Pressable
                  style={[
                    styles.sortBtn,
                    sortOrder === 'newest' && styles.activeSortBtn,
                  ]}
                  onPress={() => setSortOrder('newest')}
                >
                  <MaterialCommunityIcons
                    name="arrow-down"
                    size={16}
                    color={sortOrder === 'newest' ? '#fff' : '#666'}
                  />
                  <Text
                    style={[
                      styles.sortBtnText,
                      sortOrder === 'newest' && styles.activeSortBtnText,
                    ]}
                  >
                    Newest
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.sortBtn,
                    sortOrder === 'oldest' && styles.activeSortBtn,
                  ]}
                  onPress={() => setSortOrder('oldest')}
                >
                  <MaterialCommunityIcons
                    name="arrow-up"
                    size={16}
                    color={sortOrder === 'oldest' ? '#fff' : '#666'}
                  />
                  <Text
                    style={[
                      styles.sortBtnText,
                      sortOrder === 'oldest' && styles.activeSortBtnText,
                    ]}
                  >
                    Oldest
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* EMPTY STATE */}
            {filtered.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="inbox-multiple"
                  size={60}
                  color="#ddd"
                />
                <Text style={styles.emptyTitle}>No orders found</Text>
                <Text style={styles.emptyText}>
                  There are no {filterStatus === 'all' ? 'orders' : filterStatus + ' orders'} to display
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => {
              setSelectedOrder(item);
              setDetailsModalVisible(true);
            }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <Text style={styles.orderId}>{item.orderId}</Text>
                <Text style={styles.cardMeta}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={[styles.statusBadge, getStatusStyle(item.orderStatus)]}>
                <Text style={styles.statusBadgeText}>{item.orderStatus}</Text>
              </View>
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.detailLabel}>Items: </Text>
              <Text style={styles.detailValue}>
                {item.items?.length || 0}
              </Text>
            </View>
          </Pressable>
        )}
      />

      {/* MODAL */}
      <Modal visible={detailsModalVisible} transparent animationType="fade">
        <Pressable
          style={styles.modal}
          onPress={() => setDetailsModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            {/* MODAL HEADER */}
            <View style={styles.modalHeaderNew}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalOrderId}>{selectedOrder?.orderId}</Text>
                <Text style={styles.modalPaymentMethod}>
                  {selectedOrder?.paymentMethod || 'N/A'}
                </Text>
              </View>
              <View style={styles.modalHeaderRight}>
                <Text style={styles.modalOrderDate}>
                  {new Date(selectedOrder?.createdAt).toLocaleDateString()}
                </Text>
                <View
                  style={[
                    styles.statusBadgeModalSmall,
                    getStatusStyle(selectedOrder?.orderStatus),
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {selectedOrder?.orderStatus}
                  </Text>
                </View>
              </View>
              <Pressable
                style={styles.closeIconBtn}
                onPress={() => setDetailsModalVisible(false)}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={28}
                  color="#B76E79"
                />
              </Pressable>
            </View>

            <View style={styles.modalDivider} />

            {/* PRODUCTS SECTION */}
            <View style={styles.productsSection}>
              <Text style={styles.sectionTitle}>Products</Text>
              {selectedOrder?.items && selectedOrder.items.length > 0 ? (
                selectedOrder.items.map((item, index) => (
                  <View key={index} style={styles.productItemContainer}>
                    {/* Product Image */}
                    <View style={styles.productImageWrapper}>
                      {item.image ? (
                        <Image
                          source={{ uri: item.image }}
                          style={styles.productImage}
                          onError={() => console.log('Image load error for:', item.image)}
                        />
                      ) : (
                        <View style={styles.productImagePlaceholder}>
                          <MaterialCommunityIcons
                            name="flower"
                            size={24}
                            color="#B76E79"
                          />
                        </View>
                      )}
                    </View>

                    {/* Product Details */}
                    <View style={styles.productDetailsWrapper}>
                      <Text style={styles.productName}>{item.name}</Text>
                      <View style={styles.productMetaRow}>
                        <Text style={styles.productMeta}>
                          Qty: <Text style={styles.productMetaValue}>{item.quantity}</Text>
                        </Text>
                        <Text style={styles.productMeta}>
                          Price: <Text style={styles.productMetaValue}>₱{item.price?.toFixed(2) || '0.00'}</Text>
                        </Text>
                      </View>
                      <View style={styles.productTotalRow}>
                        <Text style={styles.productTotalLabel}>Subtotal:</Text>
                        <Text style={styles.productTotalValue}>
                          ₱{(item.price * item.quantity)?.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No products</Text>
              )}

              {/* Order Total */}
              {selectedOrder?.totalAmount && (
                <View style={styles.orderTotalContainer}>
                  <Text style={styles.orderTotalLabel}>Total Amount:</Text>
                  <Text style={styles.orderTotalValue}>
                    ₱{selectedOrder.totalAmount.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalDivider} />

            {/* USER INFORMATION */}
            <View style={styles.userInfoSection}>
              <Text style={styles.sectionTitle}>Customer Information</Text>

              <View style={styles.infoRowNew}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>
                  {selectedOrder?.user?.fullname || 'N/A'}
                </Text>
              </View>

              <View style={styles.infoRowNew}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>
                  {selectedOrder?.user?.phone || 'N/A'}
                </Text>
              </View>

              <View style={styles.infoRowNewHorizontal}>
                <View style={styles.infoHalfLeft}>
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>
                    {selectedOrder?.user?.address || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoHalfRight}>
                  <Text style={styles.infoLabel}>Country:</Text>
                  <Text style={styles.infoValue}>
                    {selectedOrder?.user?.country || 'PH'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.modalDivider} />

            {/* STATUS UPDATE DROPDOWN */}
            <View style={styles.statusUpdateSection}>
              <Text style={styles.sectionTitle}>Update Status</Text>
              {selectedOrder?.orderStatus === 'cancelled' ? (
                <View style={styles.cancelledOrderInfo}>
                  <MaterialCommunityIcons
                    name="lock"
                    size={20}
                    color="#E74C3C"
                  />
                  <Text style={styles.cancelledOrderText}>
                    This order is cancelled and cannot be modified
                  </Text>
                </View>
              ) : selectedOrder?.orderStatus === 'delivered' ? (
                <View style={styles.orderFinalizedInfo}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color="#27AE60"
                  />
                  <Text style={styles.orderFinalizedInfoText}>
                    Order delivered - Status cannot be changed
                  </Text>
                </View>
              ) : (
                <Pressable
                  style={styles.dropdownBtn}
                  onPress={() => {
                    const statusOptions = [];

                    if (selectedOrder?.orderStatus === 'pending') {
                      statusOptions.push({
                        text: 'Shipped',
                        onPress: () => handleUpdateOrderStatus(selectedOrder._id, 'shipped'),
                      });
                    } else if (selectedOrder?.orderStatus === 'shipped') {
                      statusOptions.push({
                        text: 'Delivered',
                        onPress: () => handleUpdateOrderStatus(selectedOrder._id, 'delivered'),
                      });
                    }

                    statusOptions.push({
                      text: 'Cancel',
                      style: 'cancel',
                    });

                    Alert.alert(
                      'Update Order Status',
                      `Current status: ${selectedOrder?.orderStatus}`,
                      statusOptions
                    );
                  }}
                  disabled={updating}
                >
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={20}
                    color="#B76E79"
                  />
                  <Text style={styles.dropdownBtnText}>
                    {selectedOrder?.orderStatus
                      ? selectedOrder.orderStatus.charAt(0).toUpperCase() +
                        selectedOrder.orderStatus.slice(1)
                      : 'Select Status'}
                  </Text>
                  {updating && <ActivityIndicator size="small" color="#B76E79" />}
                </Pressable>
              )}
            </View>

            <View style={styles.modalDivider} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

// ================= HELPERS =================
const getStatusStyle = (status) => {
  switch (status) {
    case 'pending':
      return styles.statusPending;
    case 'shipped':
      return styles.statusShipped;
    case 'delivered':
      return styles.statusDelivered;
    case 'cancelled':
      return styles.statusCancelled;
    default:
      return styles.statusDefault;
  }
};

// ================= STYLES =================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  // TITLE SECTION
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  countText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },

  // FILTER SECTION
  filterSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  filterRow: {
    paddingHorizontal: 16,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  activeBtnFilter: {
    backgroundColor: '#B76E79',
    borderColor: '#B76E79',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
  },

  // SORT SECTION
  sortSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  sortButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    justifyContent: 'center',
  },
  activeSortBtn: {
    backgroundColor: '#B76E79',
    borderColor: '#B76E79',
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeSortBtnText: {
    color: '#fff',
  },

  // EMPTY STATE
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },

  // CARD
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
  },
  orderId: {
    fontWeight: '700',
    fontSize: 15,
    color: '#333',
  },
  cardMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'capitalize',
  },
  cardDetails: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },

  // STATUS COLORS
  statusPending: {
    backgroundColor: '#FFA500',
  },
  statusShipped: {
    backgroundColor: '#4A90E2',
  },
  statusDelivered: {
    backgroundColor: '#27AE60',
  },
  statusCancelled: {
    backgroundColor: '#E74C3C',
  },
  statusDefault: {
    backgroundColor: '#999',
  },

  // MODAL
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
    maxHeight: '90%',
  },

  // MODAL HEADER NEW
  modalHeaderNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalOrderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  modalPaymentMethod: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  modalHeaderRight: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  modalOrderDate: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginBottom: 6,
  },
  statusBadgeModalSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closeIconBtn: {
    padding: 4,
    marginTop: -4,
    marginRight: -4,
  },

  modalDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // PRODUCTS SECTION
  productsSection: {
    marginBottom: 8,
  },
  productItemContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  productImageWrapper: {
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B76E79',
  },
  productDetailsWrapper: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  productMetaRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 16,
  },
  productMeta: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  productMetaValue: {
    fontWeight: '700',
    color: '#333',
  },
  productTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productTotalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  productTotalValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B76E79',
  },
  orderTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  orderTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  orderTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B76E79',
  },
  noDataText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },

  // USER INFO SECTION
  userInfoSection: {
    marginBottom: 8,
  },
  infoRowNew: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  infoRowNewHorizontal: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 12,
  },
  infoHalfLeft: {
    flex: 1,
  },
  infoHalfRight: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },

  // STATUS UPDATE DROPDOWN
  statusUpdateSection: {
    marginBottom: 8,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 10,
  },
  dropdownBtnDisabled: {
    opacity: 0.5,
  },
  dropdownBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  dropdownBtnTextDisabled: {
    color: '#999',
  },
  cancelledOrderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F5D7D7',
    gap: 12,
  },
  cancelledOrderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E74C3C',
    flex: 1,
  },
  orderFinalizedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F0FFF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C6F6D5',
    gap: 12,
  },
  orderFinalizedInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#27AE60',
    flex: 1,
  },
});

export default AdminOrders;