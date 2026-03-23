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
import LocalCartManager from "../utils/LocalCartManager";

const CheckoutScreen = ({ route, navigation }) => {
  const { selectedItems } = route.params || {};
  const [cartItems, setCartItems] = useState(route.params?.cartItems || []);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userImage, setUserImage] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [showVoucherDropdown, setShowVoucherDropdown] = useState(false);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [userInfo, setUserInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
  });
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserForm, setEditUserForm] = useState({ ...userInfo });

  useFocusEffect(
    useCallback(() => {
      loadUserInfo();
    }, [])
  );

  useEffect(() => {
    fetchAvailableVouchers();
  }, [cartItems, selectedItems]);

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
      setIsLoggedIn(true);
      if (parsedUser.picture) setUserImage(parsedUser.picture);
      const nextInfo = {
        fullName: parsedUser.fullName || "",
        email: parsedUser.email || "",
        phone: parsedUser.phone || "",
        address: parsedUser.address || "",
      };
      setUserInfo(nextInfo);
      setEditUserForm(nextInfo);
    } catch (error) {
      console.log("Error loading user:", error);
      navigation.navigate("Login");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (value) => `PHP ${Number(value || 0).toFixed(2)}`;
  const getShippingFee = () => 36;
  const selectedCartItems = cartItems.filter((item) => selectedItems?.has(item.productId));
  const subtotal = selectedCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = getShippingFee();

  const getDiscountProductIds = (discount) =>
    (discount?.products || []).map((product) =>
      typeof product === "string" ? product : product?._id
    );

  const isDiscountApplicableToCart = (discount) => {
    const now = new Date();
    const validFrom = discount?.validFrom ? new Date(discount.validFrom) : null;
    const validUntil = discount?.validUntil ? new Date(discount.validUntil) : null;
    const isDateValid =
      (!validFrom || validFrom <= now) && (!validUntil || validUntil >= now);
    if (!discount?.isActive || !isDateValid) return false;
    const productIds = getDiscountProductIds(discount);
    if (productIds.length === 0) return true;
    return selectedCartItems.some((item) => productIds.includes(item.productId));
  };

  const getEligibleSubtotal = (discount) => {
    const productIds = getDiscountProductIds(discount);
    if (productIds.length === 0) {
      return selectedCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }
    return selectedCartItems
      .filter((item) => productIds.includes(item.productId))
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getVoucherDiscountAmount = (discount) => {
    if (!discount) return 0;
    const eligibleSubtotal = getEligibleSubtotal(discount);
    const minPurchaseAmount = Number(discount.minPurchaseAmount || 0);
    if (eligibleSubtotal <= 0 || eligibleSubtotal < minPurchaseAmount) return 0;
    if (discount.discountType === "percentage") {
      return eligibleSubtotal * (Number(discount.discountValue || 0) / 100);
    }
    return Math.min(Number(discount.discountValue || 0), eligibleSubtotal);
  };

  const discountAmount = getVoucherDiscountAmount(selectedVoucher);
  const total = Math.max(0, subtotal + shippingFee - discountAmount);

  const fetchAvailableVouchers = async () => {
    try {
      setIsLoadingVouchers(true);
      const response = await axios.get(API_ENDPOINTS.DISCOUNTS);
      const vouchers = (response.data?.discounts || []).filter((discount) => {
        if (!isDiscountApplicableToCart(discount)) return false;

        const eligibleSubtotal = getEligibleSubtotal(discount);
        const minPurchaseAmount = Number(discount.minPurchaseAmount || 0);
        return eligibleSubtotal >= minPurchaseAmount;
      });

      setAvailableVouchers(vouchers);
      setSelectedVoucher((current) =>
        vouchers.find((voucher) => voucher._id === current?._id) || null
      );
    } catch (error) {
      console.log("Error fetching vouchers:", error);
      setAvailableVouchers([]);
      setSelectedVoucher(null);
    } finally {
      setIsLoadingVouchers(false);
    }
  };

  const updateQuantity = (productId, newQty) => {
    if (newQty < 1) return;
    setCartItems((items) =>
      items.map((item) =>
        item.productId === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const removeItem = (productId) => {
    setCartItems((items) => items.filter((item) => item.productId !== productId));
  };

  const handleSaveUserInfo = () => {
    if (!editUserForm.fullName || !editUserForm.phone || !editUserForm.address) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    setUserInfo({ ...editUserForm });
    setShowEditUserModal(false);
  };

  const handlePlaceOrder = async () => {
    if (!userInfo.fullName || !userInfo.phone || !userInfo.address) {
      Alert.alert("Error", "Please fill in all shipping details");
      return;
    }

    setIsProcessing(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const userId = user._id || user.id;
      const orderItems = selectedCartItems.map((item) => ({
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
        appliedVoucher: selectedVoucher
          ? {
              discountId: selectedVoucher._id,
              code: selectedVoucher.code,
              discountType: selectedVoucher.discountType,
              discountValue: selectedVoucher.discountValue,
              discountAmount,
            }
          : null,
        totals: { subtotal, shippingFee, discountAmount, totalAmount: total },
      };

      const response = await axios.post(API_ENDPOINTS.ORDERS, orderData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (!response.data.success) {
        Alert.alert("Error", response.data.error || "Failed to place order");
        return;
      }

      await LocalCartManager.deleteCartAfterCheckout(orderItems.map((item) => item.productId));
      Alert.alert(
        "Order Placed!",
        `Order ID: ${response.data.data.orderId}\nTotal: ${formatPrice(total)}`,
        [{ text: "View Orders", onPress: () => navigation.replace("Orders") }]
      );
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
      <View style={styles.logoSection}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#B76E79" />
        </TouchableOpacity>
        <Text style={styles.logoText}>ROSELUXE</Text>
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="map-marker" size={24} color="#B76E79" />
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <TouchableOpacity onPress={() => setShowEditUserModal(true)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.box}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{userInfo.fullName}</Text>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{userInfo.phone}</Text>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{userInfo.address}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {selectedCartItems.map((item) => (
              <View key={item.productId} style={styles.productCard}>
                <Image
                  source={{ uri: item.image || "https://via.placeholder.com/60" }}
                  style={styles.productImage}
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.productName}
                  </Text>
                  <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
                  <View style={styles.qtyContainer}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.productId, item.quantity - 1)}>
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.productId, item.quantity + 1)}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeItem(item.productId)} style={{ marginLeft: 12 }}>
                      <MaterialCommunityIcons name="trash-can-outline" size={22} color="#B76E79" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.productTotal}>{formatPrice(item.price * item.quantity)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.box}>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowVoucherDropdown((prev) => !prev)}
              >
                <View style={styles.selectorLeft}>
                  <MaterialCommunityIcons name="ticket-percent-outline" size={22} color="#B76E79" />
                  <View style={styles.selectorTextWrap}>
                    <Text style={styles.selectorLabel}>Apply Voucher</Text>
                    <Text style={styles.selectorValue}>
                      {isLoadingVouchers
                        ? "Loading vouchers..."
                        : availableVouchers.length > 0
                          ? selectedVoucher?.code || "Select voucher"
                          : "No voucher available for these products"}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name={showVoucherDropdown ? "chevron-up" : "chevron-down"}
                  size={24}
                  color="#B76E79"
                />
              </TouchableOpacity>

              {showVoucherDropdown && availableVouchers.length > 0 && (
                <View style={styles.dropdownBox}>
                  <TouchableOpacity
                    style={[styles.dropdownItem, !selectedVoucher && styles.dropdownItemActive]}
                    onPress={() => {
                      setSelectedVoucher(null);
                      setShowVoucherDropdown(false);
                    }}
                  >
                    <View>
                      <Text style={styles.dropdownTitle}>No voucher</Text>
                      <Text style={styles.dropdownSubtitle}>Checkout without discount</Text>
                    </View>
                  </TouchableOpacity>
                  {availableVouchers.map((voucher) => (
                    <TouchableOpacity
                      key={voucher._id}
                      style={[
                        styles.dropdownItem,
                        selectedVoucher?._id === voucher._id && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setSelectedVoucher(voucher);
                        setShowVoucherDropdown(false);
                      }}
                    >
                      <View>
                        <Text style={styles.dropdownTitle}>{voucher.code}</Text>
                        <Text style={styles.dropdownSubtitle}>
                          Save {formatPrice(getVoucherDiscountAmount(voucher))} with{" "}
                          {voucher.discountType === "percentage"
                            ? `${voucher.discountValue}% off`
                            : formatPrice(voucher.discountValue)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Product Subtotal</Text>
                <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping Fee</Text>
                <Text style={styles.summaryValue}>{formatPrice(shippingFee)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Voucher Discount</Text>
                <Text style={styles.discountValue}>- {formatPrice(discountAmount)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatPrice(total)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowPaymentOptions((prev) => !prev)}
            >
              <View style={styles.selectorLeft}>
                {paymentMethod === "cod" ? (
                  <View style={styles.badge}><Text style={styles.badgeText}>COD</Text></View>
                ) : (
                  <MaterialCommunityIcons name="wallet" size={24} color="#B76E79" />
                )}
                <Text style={styles.paymentMethodName}>
                  {paymentOptions.find((p) => p.id === paymentMethod)?.label}
                </Text>
              </View>
              <MaterialCommunityIcons
                name={showPaymentOptions ? "chevron-up" : "chevron-down"}
                size={24}
                color="#B76E79"
              />
            </TouchableOpacity>

            {showPaymentOptions && (
              <View style={styles.dropdownBox}>
                {paymentOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.dropdownItem,
                      paymentMethod === option.id && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setPaymentMethod(option.id);
                      setShowPaymentOptions(false);
                    }}
                  >
                    <Text style={styles.dropdownTitle}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.checkoutContainer}>
          <View style={styles.bottomTotal}>
            <Text style={styles.bottomTotalLabel}>Total:</Text>
            <Text style={styles.bottomTotalValue}>{formatPrice(total)}</Text>
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

      <Modal visible={showEditUserModal} animationType="slide" onRequestClose={() => setShowEditUserModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditUserModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Delivery Address</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <TextInput style={styles.textInput} placeholder="Full Name" value={editUserForm.fullName} onChangeText={(text) => setEditUserForm({ ...editUserForm, fullName: text })} placeholderTextColor="#999" />
            <TextInput style={styles.textInput} placeholder="Email" value={editUserForm.email} onChangeText={(text) => setEditUserForm({ ...editUserForm, email: text })} keyboardType="email-address" placeholderTextColor="#999" />
            <TextInput style={styles.textInput} placeholder="Phone Number" value={editUserForm.phone} onChangeText={(text) => setEditUserForm({ ...editUserForm, phone: text })} keyboardType="phone-pad" placeholderTextColor="#999" />
            <TextInput style={styles.textInput} placeholder="Street Address" value={editUserForm.address} onChangeText={(text) => setEditUserForm({ ...editUserForm, address: text })} placeholderTextColor="#999" />
            <Button mode="contained" onPress={handleSaveUserInfo} style={styles.placeOrderBtn} labelStyle={styles.placeOrderBtnLabel}>
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
  mainContainer: { flex: 1, backgroundColor: "#FFF5F7" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#999", fontSize: 14 },
  logoSection: { paddingVertical: 12, paddingHorizontal: 16, alignItems: "center", backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#FFE8ED", marginTop: 40 },
  backButton: { position: "absolute", left: 16, top: 12, zIndex: 1 },
  logoText: { fontSize: 28, fontWeight: "800", color: "#B76E79", letterSpacing: 2, fontStyle: "italic" },
  scrollContent: { paddingBottom: 20 },
  section: { backgroundColor: "white", marginHorizontal: 12, marginVertical: 8, borderRadius: 12, padding: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginLeft: 8, flex: 1 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#FFE8ED", borderRadius: 6 },
  editBtnText: { fontSize: 12, fontWeight: "600", color: "#B76E79" },
  box: { backgroundColor: "#FFF5F7", borderRadius: 10, padding: 12 },
  infoLabel: { fontSize: 12, color: "#999", marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  productCard: { flexDirection: "row", backgroundColor: "#FFF5F7", borderRadius: 10, padding: 12, marginBottom: 12, alignItems: "center" },
  productImage: { width: 60, height: 60, borderRadius: 8 },
  productInfo: { flex: 1, marginHorizontal: 8 },
  productName: { fontSize: 13, fontWeight: "600", color: "#333", marginBottom: 4 },
  productPrice: { fontSize: 13, fontWeight: "700", color: "#B76E79", marginBottom: 4 },
  productTotal: { fontSize: 13, fontWeight: "700", color: "#333" },
  qtyContainer: { flexDirection: "row", alignItems: "center", marginVertical: 4 },
  qtyBtn: { backgroundColor: "#B76E79", width: 26, height: 26, borderRadius: 6, justifyContent: "center", alignItems: "center" },
  qtyBtnText: { color: "white", fontWeight: "700", fontSize: 16 },
  qtyValue: { fontSize: 14, fontWeight: "600", color: "#333", marginHorizontal: 8 },
  selector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "white", borderRadius: 10, borderWidth: 1, borderColor: "#FFE8ED", paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12 },
  selectorLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  selectorTextWrap: { marginLeft: 10, flex: 1 },
  selectorLabel: { fontSize: 12, color: "#999", marginBottom: 2 },
  selectorValue: { fontSize: 13, fontWeight: "600", color: "#333" },
  dropdownBox: { marginBottom: 12 },
  dropdownItem: { backgroundColor: "white", borderRadius: 10, borderWidth: 1, borderColor: "#f0d7dd", padding: 12, marginBottom: 8 },
  dropdownItemActive: { borderColor: "#B76E79", backgroundColor: "#FFF8FA" },
  dropdownTitle: { fontSize: 13, fontWeight: "700", color: "#333" },
  dropdownSubtitle: { fontSize: 12, color: "#666", marginTop: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  summaryLabel: { fontSize: 13, color: "#666" },
  summaryValue: { fontSize: 13, fontWeight: "600", color: "#333" },
  discountValue: { fontSize: 13, fontWeight: "700", color: "#2E7D32" },
  totalRow: { paddingTop: 12, borderTopWidth: 1, borderTopColor: "#FFE8ED", marginBottom: 0 },
  totalLabel: { fontSize: 15, fontWeight: "700", color: "#333" },
  totalValue: { fontSize: 16, fontWeight: "700", color: "#B76E79" },
  badge: { backgroundColor: "#2DBC4E", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  paymentMethodName: { fontSize: 14, fontWeight: "600", color: "#333", marginLeft: 8 },
  checkoutContainer: { backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 50 },
  bottomTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  bottomTotalLabel: { fontSize: 14, color: "#666" },
  bottomTotalValue: { fontSize: 18, fontWeight: "700", color: "#B76E79" },
  placeOrderBtn: { backgroundColor: "#B76E79", paddingVertical: 5, borderRadius: 10 },
  placeOrderBtnLabel: { fontSize: 16, fontWeight: "700", color: "#fff" },
  modalContainer: { flex: 1, backgroundColor: "#FFF5F7" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#333" },
  modalContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 },
  textInput: { backgroundColor: "white", borderRadius: 8, borderWidth: 1, borderColor: "#ddd", paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12, fontSize: 14, color: "#333" },
});

export default CheckoutScreen;
