import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Image,
  FlatList,
} from "react-native";
import { Button, Text } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import axios from "axios";
import { API_ENDPOINTS } from "../config/api";
import { useFocusEffect } from "@react-navigation/native";
import Navigation from "./components/navigation";

const OrdersScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userImage, setUserImage] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = ["All", "pending", "shipped", "delivered", "cancelled"];

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const userData = await AsyncStorage.getItem("user");
      const token = await AsyncStorage.getItem("token");

      if (!userData || !token) {
        navigation.navigate("Login");
        return;
      }

      const parsedUser = JSON.parse(userData);
      const userId = parsedUser._id || parsedUser.id;

      if (parsedUser.picture) setUserImage(parsedUser.picture);
      setIsLoggedIn(true);

      // Fetch orders from API using userId
      const response = await axios.get(`${API_ENDPOINTS.ORDERS}/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Orders Response:", response.data);

      if (response.data.success) {
        const ordersData = response.data.data || [];
        setOrders(ordersData);
        filterOrders(ordersData, "All");
      }
    } catch (error) {
      console.log("Error loading orders:", error.response?.data || error.message);
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = (ordersToFilter, filterStatus) => {
    if (filterStatus === "All") {
      setFilteredOrders(ordersToFilter);
    } else {
      setFilteredOrders(
        ordersToFilter.filter((order) => order.orderStatus === filterStatus)
      );
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    filterOrders(orders, filter);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#FFA500";
      case "shipped":
        return "#4CAF50";
      case "delivered":
        return "#2DBC4E";
      case "cancelled":
        return "#FF6B6B";
      default:
        return "#999";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return "clock-outline";
      case "processing":
        return "cog";
      case "shipped":
        return "truck";
      case "delivered":
        return "check-circle";
      case "cancelled":
        return "close-circle";
      default:
        return "help-circle";
    }
  };

  const handleOrderPress = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleProductPress = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleCancelOrder = (orderId) => {
  Alert.alert(
    "Cancel Order",
    "Are you sure you want to cancel this order?",
    [
      { text: "No", onPress: () => {} },
      {
        text: "Yes",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("token");

            const response = await axios.put(
              `${API_ENDPOINTS.ORDERS}/cancel/${orderId}`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
              Alert.alert("Success", "Order cancelled successfully");
              loadOrders();
              setShowOrderModal(false);
            }
          } catch (error) {
            console.log("Cancel order error:", error);
            Alert.alert(
              "Error",
              error.response?.data?.message || "Failed to cancel order"
            );
          }
        },
      },
    ]
  );
};

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B76E79" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Header */}
      <View style={styles.logoSection}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#B76E79" />
        </TouchableOpacity>
        <Text style={styles.logoText}>MY ORDERS</Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                activeFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => handleFilterChange(filter)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  activeFilter === filter && styles.filterButtonTextActive,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <MaterialCommunityIcons name="package" size={80} color="#FFE8ED" />
            <Text style={styles.emptyStateTitle}>
              {orders.length === 0 ? "No Orders Yet" : "No Orders Found"}
            </Text>
            <Text style={styles.emptyStateText}>
              {orders.length === 0
                ? "You haven't placed any orders yet. Start shopping now!"
                : `No orders with status "${activeFilter}"`}
            </Text>
            {orders.length === 0 && (
              <Button
                mode="contained"
                onPress={() => navigation.navigate("Home")}
                style={styles.continueShoppingBtn}
                labelStyle={styles.continueShoppingLabel}
              >
                Continue Shopping
              </Button>
            )}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {filteredOrders.map((order, index) => (
              <TouchableOpacity
                key={order._id || index}
                style={styles.orderCard}
                onPress={() => handleOrderPress(order)}
              >
                {/* Order Header */}
                <View style={styles.orderCardHeader}>
                  <View>
                    <Text style={styles.orderNumber}>
                      Order #{order.orderId || order._id?.slice(-6).toUpperCase()}
                    </Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.createdAt).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <MaterialCommunityIcons
                      name={getStatusIcon(order.orderStatus || "pending")}
                      size={16}
                      color={getStatusColor(order.orderStatus || "pending")}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(order.orderStatus || "pending") },
                      ]}
                    >
                      {(order.orderStatus || "pending").charAt(0).toUpperCase() +
                        (order.orderStatus || "pending").slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Order Items Preview */}
                <View style={styles.itemsPreview}>
                  {order.items && order.items.length > 0 ? (
                    <>
                      {order.items.slice(0, 2).map((item, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.previewItem}
                          onPress={() => handleProductPress(item)}
                        >
                          {item.image && (
                            <Image
                              source={{ uri: item.image }}
                              style={styles.previewImage}
                            />
                          )}
                          <View style={styles.previewItemInfo}>
                            <Text style={styles.previewItemName} numberOfLines={1}>
                              {item.productName}
                            </Text>
                            <Text style={styles.previewItemQty}>
                              Qty: {item.quantity}
                            </Text>
                            <Text style={styles.previewItemSubtotal}>
                              ₱{(item.price * item.quantity).toFixed(2)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                      {order.items.length > 2 && (
                        <Text style={styles.moreItems}>
                          +{order.items.length - 2} more item(s)
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text style={styles.noItems}>No items</Text>
                  )}
                </View>

                {/* Order Footer */}
                <View style={styles.orderCardFooter}>
                  <View>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.totalAmount}>
                      ₱{(order.totals?.totalAmount || 0).toFixed(2)}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color="#B76E79"
                  />
                </View>
              </TouchableOpacity>
            ))}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Order Details Modal */}
      <Modal
        visible={showOrderModal}
        animationType="slide"
        onRequestClose={() => setShowOrderModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowOrderModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Order Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedOrder && (
              <>
                {/* Order Info */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Order Information</Text>
                  <View style={styles.infoBox}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Order ID</Text>
                      <Text style={styles.infoValue}>
                        {selectedOrder.orderId ||
                          selectedOrder._id?.slice(-6).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Status</Text>
                      <View style={styles.statusBadgeModal}>
                        <MaterialCommunityIcons
                          name={getStatusIcon(selectedOrder.orderStatus || "pending")}
                          size={14}
                          color={getStatusColor(selectedOrder.orderStatus || "pending")}
                        />
                        <Text
                          style={[
                            styles.statusTextModal,
                            {
                              color: getStatusColor(selectedOrder.orderStatus || "pending"),
                            },
                          ]}
                        >
                          {(selectedOrder.orderStatus || "pending").toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Date</Text>
                      <Text style={styles.infoValue}>
                        {new Date(selectedOrder.createdAt).toLocaleDateString(
                          "en-PH",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Payment Method</Text>
                      <Text style={styles.infoValue}>
                        {selectedOrder.shippingInfo?.payment?.method?.toLowerCase() === "cod"
                            ? "Cash on Delivery"
                            : selectedOrder.shippingInfo?.payment?.method === "gcash"
                            ? "GCash"
                            : selectedOrder.shippingInfo?.payment?.method}

                      </Text>
                    </View>
                  </View>
                </View>

                {/* Shipping Address */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Shipping Address</Text>
                  <View style={styles.shippingAddressBox}>
                    <View style={styles.shippingHeader}>
                      <MaterialCommunityIcons
                        name="map-marker"
                        size={20}
                        color="#333"
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.shippingName}>
                          {selectedOrder.shippingInfo?.fullName}
                        </Text>
                        <Text style={styles.shippingPhone}>
                          {selectedOrder.shippingInfo?.phone}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.shippingAddress}>
                      {selectedOrder.shippingInfo?.address}
                      {selectedOrder.shippingInfo?.country &&
                        `, ${selectedOrder.shippingInfo?.country}`}
                    </Text>
                  </View>
                </View>

                {/* Items */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Order Items</Text>
                  {selectedOrder.items &&
                    selectedOrder.items.map((item, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.itemCard}
                        onPress={() => handleProductPress(item)}
                      >
                        {item.image && (
                          <Image
                            source={{ uri: item.image }}
                            style={styles.itemImage}
                          />
                        )}
                        <View style={styles.itemDetails}>
                          <Text style={styles.itemName}>{item.productName}</Text>
                          <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                          <Text style={styles.itemPrice}>
                            ₱{item.price.toFixed(2)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                </View>

                {/* Order Summary */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Order Summary</Text>
                  <View style={styles.summaryBox}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Subtotal</Text>
                      <Text style={styles.summaryValue}>
                        ₱{selectedOrder.totals?.subtotal.toFixed(2) || "0.00"}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Shipping Fee</Text>
                      <Text style={styles.summaryValue}>
                        ₱{selectedOrder.totals?.shippingFee.toFixed(2) || "0.00"}
                      </Text>
                    </View>
                    <View style={[styles.summaryRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total Amount</Text>
                      <Text style={styles.totalValue}>
                        ₱{selectedOrder.totals?.totalAmount.toFixed(2) || "0.00"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                {selectedOrder.orderStatus === "pending" && (
                  <View style={styles.actionButtonsContainer}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setShowOrderModal(false);
                        handleCancelOrder(selectedOrder._id);
                      }}
                      style={styles.cancelBtn}
                      labelStyle={styles.cancelBtnLabel}
                    >
                      Cancel Order
                    </Button>
                  </View>
                )}

                <View style={{ height: 80 }} />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Product Details Modal */}
      <Modal
        visible={showProductModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.productModalOverlay}>
          <View style={styles.productModalContent}>
            <View style={styles.productModalHeader}>
              <Text style={styles.productModalTitle}>Product Details</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <ScrollView style={styles.productModalBody}>
                {selectedProduct.image && (
                  <Image
                    source={{ uri: selectedProduct.image }}
                    style={styles.productModalImage}
                  />
                )}

                <View style={styles.productInfoSection}>
                  <Text style={styles.productModalProductName}>
                    {selectedProduct.productName}
                  </Text>

                  <View style={styles.productModalInfoRow}>
                    <Text style={styles.productModalLabel}>Quantity</Text>
                    <Text style={styles.productModalValue}>
                      {selectedProduct.quantity}
                    </Text>
                  </View>

                  <View style={styles.productModalInfoRow}>
                    <Text style={styles.productModalLabel}>Price per Item</Text>
                    <Text style={styles.productModalValue}>
                      ₱{selectedProduct.price.toFixed(2)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.productModalInfoRow,
                      { paddingTop: 12, borderTopWidth: 1, borderTopColor: "#FFE8ED" },
                    ]}
                  >
                    <Text style={styles.productModalLabel}>Subtotal</Text>
                    <Text style={styles.productModalTotalValue}>
                      ₱{(selectedProduct.price * selectedProduct.quantity).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.productModalCloseBtn}
              onPress={() => setShowProductModal(false)}
            >
              <Text style={styles.productModalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Navigation
        navigation={navigation}
        currentScreen="Orders"
        isLoggedIn={isLoggedIn}
        userImage={userImage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#FFF5F7",
  },

  backButton: {
    position: "absolute",
    left: 16,
    top: 12,
    zIndex: 1,
  },

  logoSection: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE8ED",
    marginTop: 40,
  },

  logoText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#B76E79",
    letterSpacing: 1,
  },

  // FILTER SECTION
  filterSection: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE8ED",
  },

  filterContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },

  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  filterButtonActive: {
    backgroundColor: "#B76E79",
    borderColor: "#B76E79",
  },

  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },

  filterButtonTextActive: {
    color: "white",
  },

  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  // EMPTY STATE
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 16,
  },

  emptyStateText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginVertical: 12,
    lineHeight: 20,
  },

  continueShoppingBtn: {
    backgroundColor: "#B76E79",
    marginTop: 20,
    paddingVertical: 8,
  },

  continueShoppingLabel: {
    fontSize: 14,
    fontWeight: "700",
  },

  // ORDER CARD
  orderCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },

  orderCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE8ED",
  },

  orderNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },

  orderDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFF5F7",
    borderRadius: 6,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },

  itemsPreview: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE8ED",
  },

  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    padding: 8,
    backgroundColor: "#FFF9FB",
    borderRadius: 8,
  },

  previewImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 10,
  },

  previewItemInfo: {
    flex: 1,
  },

  previewItemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },

  previewItemQty: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },

  previewItemSubtotal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B76E79",
    marginTop: 4,
  },

  moreItems: {
    fontSize: 12,
    color: "#B76E79",
    fontWeight: "600",
    marginTop: 8,
  },

  noItems: {
    fontSize: 12,
    color: "#999",
  },

  orderCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  totalLabel: {
    fontSize: 12,
    color: "#999",
  },

  totalAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#B76E79",
    marginTop: 4,
  },

  // LOADING
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#999",
    fontSize: 14,
  },

  // MODAL
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFF5F7",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },

  modalContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  // SECTIONS
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },

  infoBox: {
    backgroundColor: "#FFF5F7",
    borderRadius: 8,
    padding: 12,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  infoLabel: {
    fontSize: 12,
    color: "#999",
  },

  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "right",
  },

  statusBadgeModal: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#fff",
    borderRadius: 4,
  },

  statusTextModal: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },

  // SHIPPING ADDRESS STYLES
  shippingAddressBox: {
    backgroundColor: "#FFF5F7",
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#B76E79",
  },

  shippingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  shippingName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },

  shippingPhone: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },

  shippingAddress: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    fontWeight: "400",
  },

  // ITEMS
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#FFF5F7",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
  },

  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 10,
  },

  itemDetails: {
    flex: 1,
  },

  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },

  itemQty: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },

  itemPrice: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B76E79",
    marginTop: 2,
  },

  itemTotalContainer: {
    alignItems: "flex-end",
  },

  itemTotalLabel: {
    fontSize: 10,
    color: "#999",
  },

  itemTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginTop: 2,
  },

  // SUMMARY
  summaryBox: {
    backgroundColor: "#FFF5F7",
    borderRadius: 8,
    padding: 12,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  summaryLabel: {
    fontSize: 12,
    color: "#666",
  },

  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },

  totalRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#FFE8ED",
    marginBottom: 0,
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },

  totalValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#B76E79",
  },

  // ACTIONS
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
  },

  cancelBtn: {
    flex: 1,
    borderColor: "#B76E79",
    borderWidth: 1.5,
  },

  cancelBtnLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B76E79",
  },

  // PRODUCT MODAL
  productModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  productModalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: "85%",
  },

  productModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE8ED",
  },

  productModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },

  productModalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  productModalImage: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: "#F5F5F5",
  },

  productInfoSection: {
    marginBottom: 20,
  },

  productModalProductName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },

  productModalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },

  productModalLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },

  productModalValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  productModalTotalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#B76E79",
  },

  productModalCloseBtn: {
    backgroundColor: "#B76E79",
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },

  productModalCloseBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
});

export default OrdersScreen;
