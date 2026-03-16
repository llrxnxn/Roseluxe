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
  TextInput,
  Image,
} from "react-native";
import { Button, Text } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import axios from "axios";
import { API_ENDPOINTS } from "../config/api";
import { useFocusEffect } from "@react-navigation/native";
import Navigation from "./components/navigation";

const CheckoutScreen = ({ route, navigation }) => {
  const { selectedItems } = route.params || {};
  const [cartItems, setCartItems] = useState(route.params?.cartItems || []);

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userImage, setUserImage] = useState(null);

  // User Info
  const [userInfo, setUserInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
  });
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserForm, setEditUserForm] = useState({ ...userInfo });

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUserInfo();
    }, [])
  );

  const loadUserInfo = async () => {
    try {
      setIsLoading(true);
      const userData = await AsyncStorage.getItem("user");
      const token = await AsyncStorage.getItem("token");

      if (!userData || !token) {
        navigation.navigate("Login");
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      if (parsedUser.picture) setUserImage(parsedUser.picture);

      setUserInfo({
        fullName: parsedUser.fullName || "",
        email: parsedUser.email || "",
        phone: parsedUser.phone || "",
        address: parsedUser.address || "",
      });

      setEditUserForm({
        fullName: parsedUser.fullName || "",
        email: parsedUser.email || "",
        phone: parsedUser.phone || "",
        address: parsedUser.address || "",
      });

      setIsLoggedIn(true);
    } catch (error) {
      console.log("Error loading user:", error);
      navigation.navigate("Login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = () => {
    setEditUserForm({ ...userInfo });
    setShowEditUserModal(true);
  };

  const handleSaveUserInfo = () => {
    if (!editUserForm.fullName || !editUserForm.phone || !editUserForm.address) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    setUserInfo({ ...editUserForm });
    setShowEditUserModal(false);
  };

  const getShippingFee = () => 36;

  // Quantity updates
  const updateQuantity = (productId, newQty) => {
    if (newQty < 1) return;
    const updated = cartItems.map(item =>
      item.productId === productId ? { ...item, quantity: newQty } : item
    );
    setCartItems(updated);
  };

  const removeItem = (productId) => {
    const updated = cartItems.filter(item => item.productId !== productId);
    setCartItems(updated);
  };

  // Calculations
  const subtotal = cartItems
    .filter(item => selectedItems.has(item.productId))
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = getShippingFee();
  const tax = subtotal * 0.12;
  const total = subtotal + tax + shippingFee;

  const handlePlaceOrder = async () => {
    if (!userInfo.fullName || !userInfo.phone || !userInfo.address) {
      Alert.alert("Error", "Please fill in all shipping details");
      return;
    }

    setIsProcessing(true);

    try {
      const token = await AsyncStorage.getItem("token");
      const userId = user._id || user.id;

      const orderItems = cartItems
        .filter(item => selectedItems.has(item.productId))
        .map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
        }));

      const orderData = {
        userId,
        items: orderItems,
        shippingInfo: { ...userInfo, country: "Philippines" },
        paymentMethod,
        totals: {
            subtotal,       // your subtotal calculation
            tax,            // your tax calculation
            shippingFee,    // shipping fee
            totalAmount: total, // total including tax & shipping
        },
        };

      const response = await axios.post(API_ENDPOINTS.ORDERS, orderData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (response.data.success) {
        // REMOVE ORDERED ITEMS FROM CART
        for (const item of orderItems) {
            try {
            await axios.delete(
                `${API_ENDPOINTS.CART}/${userId}/${item.productId}`,
                {
                headers: { Authorization: `Bearer ${token}` },
                }
            );
            } catch (err) {
            console.log("Failed to remove item from cart:", err);
            }
        }

        Alert.alert(
            "Order Placed!",
            `Order ID: ${response.data.data.orderId}\nTotal: ₱${total.toFixed(2)}`,
            [
            {
                text: "View Orders",
                onPress: () => navigation.replace("Orders"),
            },
            ]
        );
        } else {
        Alert.alert("Error", response.data.error || "Failed to place order");
      }
    } catch (error) {
      console.log("Order error:", error);
      Alert.alert("Error", "Failed to place order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B76E79" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const paymentOptions = [
    { id: "cod", label: "Cash on Delivery", icon: "home-check", badge: "COD" },
    { id: "gcash", label: "GCash", icon: "wallet" },
  ];

  return (
    <View style={styles.mainContainer}>
      {/* Header with Back */}
      <View style={styles.logoSection}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#B76E79" />
        </TouchableOpacity>
        <Text style={styles.logoText}>ROSELUXE</Text>
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Delivery Address */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="map-marker" size={24} color="#B76E79" />
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <TouchableOpacity onPress={handleEditUser} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.userInfoBox}>
              <Text style={styles.userInfoLabel}>Name</Text>
              <Text style={styles.userInfoValue}>{userInfo.fullName}</Text>

              <Text style={styles.userInfoLabel}>Phone</Text>
              <Text style={styles.userInfoValue}>{userInfo.phone}</Text>

              <Text style={styles.userInfoLabel}>Address</Text>
              <Text style={styles.userInfoValue}>{userInfo.address}</Text>
            </View>
          </View>

          {/* Products */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Items</Text>

            {cartItems
              .filter(item => selectedItems.has(item.productId))
              .map((item) => (
                <View key={item.productId} style={styles.productCard}>
                  <Image
                    source={{ uri: item.image || "https://via.placeholder.com/60" }}
                    style={styles.productImage}
                  />

                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.productName}
                    </Text>
                    <Text style={styles.productPrice}>₱{item.price.toFixed(2)}</Text>

                    <View style={styles.qtyContainer}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>

                      <Text style={styles.qtyValue}>{item.quantity}</Text>

                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => removeItem(item.productId)}
                        style={{ marginLeft: 12 }}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#B76E79" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.productTotal}>
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Product Subtotal</Text>
                <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping Fee</Text>
                <Text style={styles.summaryValue}>₱{shippingFee.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax (12%)</Text>
                <Text style={styles.summaryValue}>₱{tax.toFixed(2)}</Text>
              </View>

              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₱{total.toFixed(2)}</Text>
              </View>

              <Text style={styles.savingText}>
                💰 You're saving ₱{(subtotal * 0.22).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>

            <TouchableOpacity
              style={styles.paymentSelector}
              onPress={() => setShowPaymentOptions(!showPaymentOptions)}
            >
              <View style={styles.paymentSelectorLeft}>
                {paymentMethod === "cod" && (
                  <View style={styles.paymentBadge}>
                    <Text style={styles.paymentBadgeText}>COD</Text>
                  </View>
                )}
                {paymentMethod === "gcash" && (<MaterialCommunityIcons name="wallet" size={24} color="#B76E79" style={styles.paymentMethodIcon} />
)}
                <View>
                  <Text style={styles.paymentMethodName}>
                    {paymentOptions.find(p => p.id === paymentMethod)?.label}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={showPaymentOptions ? "chevron-up" : "chevron-down"}
                size={24}
                color="#B76E79"
              />
            </TouchableOpacity>

            {showPaymentOptions && (
              <View style={styles.paymentOptionsBox}>
                {paymentOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.paymentOption,
                      paymentMethod === option.id && styles.paymentOptionActive,
                    ]}
                    onPress={() => {
                      setPaymentMethod(option.id);
                      setShowPaymentOptions(false);
                    }}
                  >
                    <View style={styles.paymentOptionLeft}>
                      {option.badge ? (
                        <View style={styles.paymentBadge}>
                          <Text style={styles.paymentBadgeText}>{option.badge}</Text>
                        </View>
                      ) : (
                        <MaterialCommunityIcons
                          name={option.icon}
                          size={24}
                          color={paymentMethod === option.id ? "#B76E79" : "#999"}
                        />
                      )}
                      <Text
                        style={[
                          styles.paymentOptionLabel,
                          paymentMethod === option.id && styles.paymentOptionLabelActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {paymentMethod === option.id && (
                      <MaterialCommunityIcons name="check-circle" size={24} color="#B76E79" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Total + Place Order */}
        <View style={styles.checkoutContainer}>
          <View style={styles.bottomTotal}>
            <Text style={styles.bottomTotalLabel}>Total:</Text>
            <Text style={styles.bottomTotalValue}>₱{total.toFixed(2)}</Text>
          </View>

          <Button
            mode="contained"
            onPress={handlePlaceOrder}
            loading={isProcessing}
            disabled={isProcessing}
            style={styles.placeOrderBtn}
            labelStyle={styles.placeOrderBtnLabel}
          >
            {isProcessing ? "Processing..." : "Place Order"}
          </Button>
        </View>
      </SafeAreaView>

      {/* Edit User Modal */}
      <Modal
        visible={showEditUserModal}
        animationType="slide"
        onRequestClose={() => setShowEditUserModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditUserModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Delivery Address</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.textInput}
              placeholder="Full Name"
              value={editUserForm.fullName}
              onChangeText={(text) => setEditUserForm({ ...editUserForm, fullName: text })}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.textInput}
              placeholder="Email"
              value={editUserForm.email}
              onChangeText={(text) => setEditUserForm({ ...editUserForm, email: text })}
              keyboardType="email-address"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.textInput}
              placeholder="Phone Number"
              value={editUserForm.phone}
              onChangeText={(text) => setEditUserForm({ ...editUserForm, phone: text })}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.textInput}
              placeholder="Street Address"
              value={editUserForm.address}
              onChangeText={(text) => setEditUserForm({ ...editUserForm, address: text })}
              placeholderTextColor="#999"
            />

            <Button
              mode="contained"
              onPress={handleSaveUserInfo}
              style={styles.saveBtn}
              labelStyle={styles.saveBtnLabel}
            >
              Save Changes
            </Button>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Navigation
        navigation={navigation}
        currentScreen="Checkout"
        isLoggedIn={isLoggedIn}
        userImage={userImage}
        cartCount={cartItems.length}
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
    fontSize: 28,
    fontWeight: "800",
    color: "#B76E79",
    letterSpacing: 2,
    fontStyle: "italic",
  },

  scrollContent: {
    paddingBottom: 20,
  },

  //QUANTITY
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },

  qtyBtn: {
    backgroundColor: "#B76E79",
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  qtyBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },

  qtyValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginHorizontal: 8,
  },

  // SECTIONS
  section: {
    backgroundColor: "white",
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginLeft: 8,
    flex: 1,
  },

  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFE8ED",
    borderRadius: 6,
  },

  editBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B76E79",
  },

  // USER INFO
  userInfoBox: {
    backgroundColor: "#FFF5F7",
    borderRadius: 10,
    padding: 12,
  },

  userInfoRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE8ED",
  },

  userInfoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },

  userInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  // PRODUCTS
  productCard: {
    flexDirection: "row",
    backgroundColor: "#FFF5F7",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },

  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },

  productInfo: {
    flex: 1,
    marginHorizontal: 8,
  },

  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },

  productPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B76E79",
    marginBottom: 4,
  },

  productQty: {
    fontSize: 12,
    color: "#999",
  },

  productTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },

  // ORDER SUMMARY
  summaryBox: {
    backgroundColor: "#FFF5F7",
    borderRadius: 10,
    padding: 12,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  summaryLabel: {
    fontSize: 13,
    color: "#666",
  },

  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },

  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#FFE8ED",
    marginBottom: 8,
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },

  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#B76E79",
  },

  savingText: {
    fontSize: 12,
    color: "#B76E79",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#FFE8ED",
  },

  // PAYMENT METHOD
  paymentSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF5F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 8,
  },

  paymentSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
  },

  paymentBadge: {
    backgroundColor: "#2DBC4E",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  paymentBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },

  paymentMethodIcon: {
    fontSize: 24,
  },

  paymentMethodName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  paymentOptionsBox: {
    backgroundColor: "#FFF5F7",
    borderRadius: 10,
    padding: 8,
  },

  paymentOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  paymentOptionActive: {
    borderColor: "#B76E79",
    backgroundColor: "#FFF5F7",
  },

  paymentOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
  },

  paymentOptionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },

  paymentOptionLabelActive: {
    color: "#B76E79",
  },

  // BOTTOM BUTTON
  checkoutContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 50,
  },

  bottomTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  bottomTotalLabel: {
    fontSize: 14,
    color: "#666",
  },

  bottomTotalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#B76E79",
  },

  placeOrderBtn: {
    backgroundColor: "#B76E79",
    paddingVertical: 5,
    borderRadius: 10,
  },

  placeOrderBtnLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },

  textInput: {
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 14,
    color: "#333",
  },

  rowInputs: {
    flexDirection: "row",
  },

  saveBtn: {
    backgroundColor: "#B76E79",
    paddingVertical: 12,
    marginTop: 20,
  },

  saveBtnLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

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
});

export default CheckoutScreen;