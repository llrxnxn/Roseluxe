import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  FlatList,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { Button, Text } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import axios from "axios";
import { API_ENDPOINTS } from "../config/api";
import { useFocusEffect } from "@react-navigation/native";
import Navigation from "./components/navigation";

const { width } = Dimensions.get("window");

const CartScreen = ({ navigation }) => {
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userImage, setUserImage] = useState(null);


  // Use useFocusEffect to reload cart when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadUserAndCart();
      checkLoginStatus();
    }, [])
  );



  const loadUserAndCart = async () => {
    try {
      setIsLoading(true);
      const userData = await AsyncStorage.getItem("user");
      const token = await AsyncStorage.getItem("token");

      if (!userData || !token) {
        console.log("No user data or token found");
        setUser(null);
        setCart([]);
        setSelectedItems(new Set());
        setSelectAll(false);
        setCartCount(0);
        setIsLoading(false);
        return;
      }

      const parsedUser = JSON.parse(userData);
      console.log("Loaded user:", parsedUser);
      setUser(parsedUser);

      const userId = parsedUser._id || parsedUser.id;
      if (!userId) {
        console.log("No user ID found");
        setCart([]);
        setSelectedItems(new Set());
        setSelectAll(false);
        setCartCount(0);
        setIsLoading(false);
        return;
      }

      fetchCart(userId, token);
    } catch (error) {
      console.log("Error loading user/cart:", error);
      setIsLoading(false);
    }
  };

  const fetchCart = async (userId, token) => {
    try {
      console.log(`Fetching cart for user: ${userId}`);

      const response = await axios.get(`${API_ENDPOINTS.CART}/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Cart API Response:", response.data);

      if (response.data.success && response.data.data) {
        const cartData = Array.isArray(response.data.data)
          ? response.data.data
          : response.data.data.items || [];

        console.log("Cart items:", cartData);
        setCart(cartData);
        setCartCount(cartData.reduce((t, i) => t + i.quantity, 0));
        setSelectedItems(new Set());
        setSelectAll(false);
      } else {
        console.log("No cart data received");
        setCart([]);
        setSelectedItems(new Set());
        setSelectAll(false);
        setCartCount(0);
      }
    } catch (error) {
      console.log("Error fetching cart:");
      console.log("Status:", error.response?.status);
      console.log("Data:", error.response?.data);
      console.log("Message:", error.message);

      if (error.response?.status === 401) {
        Alert.alert("Session Expired", "Please login again");
        navigation.navigate("Login");
      } else {
        Alert.alert("Error", "Failed to load cart. Please try again.");
      }

      setCart([]);
      setSelectedItems(new Set());
      setSelectAll(false);
      setCartCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Add after fetchCart function:
const checkLoginStatus = async () => {
  try {
    const user = await AsyncStorage.getItem("user");
    setIsLoggedIn(!!user);
    if (user) {
      const parsedUser = JSON.parse(user);
      if (parsedUser.picture) {
        setUserImage(parsedUser.picture);
      }
    }
  } catch (error) {
    console.log("Error checking login status:", error);
    setIsLoggedIn(false);
  }
};

  // Toggle individual item selection
  const toggleItemSelection = (productId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedItems(newSelected);

    if (newSelected.size === cart.length && cart.length > 0) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(cart.map(item => item.productId));
      setSelectedItems(allIds);
      setSelectAll(true);
    }
  };

  const handleQuantityUpdate = async (productId, newQuantity) => {
    if (!user || !newQuantity || newQuantity < 1) return;

    try {
      const userId = user._id || user.id;
      const token = await AsyncStorage.getItem("token");

      console.log(`Updating quantity for product ${productId} to ${newQuantity}`);

      const response = await axios.put(
        `${API_ENDPOINTS.CART}/${userId}/${productId}`,
        { quantity: newQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Update response:", response.data);

      if (response.data.success) {
        const updatedCart = Array.isArray(response.data.data)
          ? response.data.data
          : response.data.data.items || [];
        setCart(updatedCart);
        setCartCount(updatedCart.reduce((t, i) => t + i.quantity, 0));
      } else {
        Alert.alert("Error", response.data.error || "Cannot update quantity");
      }
    } catch (error) {
      console.log("Update quantity error:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to update quantity");
    }
  };

  const handleRemoveItem = async (productId) => {
    if (!user) return;

    try {
      const userId = user._id || user.id;
      const token = await AsyncStorage.getItem("token");

      console.log(`Removing product ${productId} from cart`);

      const response = await axios.delete(
        `${API_ENDPOINTS.CART}/${userId}/${productId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Remove response:", response.data);

      if (response.data.success) {
        const updatedCart = Array.isArray(response.data.data)
          ? response.data.data
          : response.data.data.items || [];
        setCart(updatedCart);
        setCartCount(updatedCart.reduce((t, i) => t + i.quantity, 0));

        const newSelected = new Set(selectedItems);
        newSelected.delete(productId);
        setSelectedItems(newSelected);

        Alert.alert("Removed", "Item removed from cart");
      } else {
        Alert.alert("Error", response.data.error || "Cannot remove item");
      }
    } catch (error) {
      console.log("Remove item error:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to remove item");
    }
  };

  // Bulk delete selected items
  const handleBulkDelete = () => {
    if (selectedItems.size === 0) {
      Alert.alert("No Selection", "Please select items to delete");
      return;
    }

    Alert.alert(
      "Delete Items",
      `Are you sure you want to delete ${selectedItems.size} item(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            for (const productId of selectedItems) {
              await handleRemoveItem(productId);
            }
          },
        },
      ]
    );
  };



  const handleCheckout = () => {
    if (!user) {
      Alert.alert(
        "Login Required",
        "Please login to proceed with checkout",
        [
          { text: "Cancel" },
          { text: "Login", onPress: () => navigation.navigate("Login") },
        ]
      );
      return;
    }

    if (selectedItems.size === 0) {
      Alert.alert("No Selection", "Please select items to checkout");
      return;
    }

    // Navigate to CheckoutScreen instead of modal
    navigation.navigate("Checkout", {
      selectedItems,
      cartItems: cart,
    });
  };

  const renderCartItem = ({ item }) => {
    const isSelected = selectedItems.has(item.productId);

    return (
      <View style={styles.cartItem}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => toggleItemSelection(item.productId)}
        >
          <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxChecked]}>
            {isSelected && (
              <MaterialCommunityIcons name="check" size={16} color="#fff" />
            )}
          </View>
        </TouchableOpacity>

        <Image
          source={{ uri: item.image || "https://via.placeholder.com/80" }}
          style={styles.cartItemImage}
        />

        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.productName}
          </Text>
          <Text style={styles.itemPrice}>₱{item.price?.toFixed(2)}</Text>
        </View>

        <View style={styles.itemActions}>
          <View style={styles.quantityControl}>
            <TouchableOpacity
              onPress={() => handleQuantityUpdate(item.productId, item.quantity - 1)}
              style={styles.qtyBtn}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>

            <Text style={styles.qtyValue}>{item.quantity}</Text>

            <TouchableOpacity
              onPress={() => handleQuantityUpdate(item.productId, item.quantity + 1)}
              style={styles.qtyBtn}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.itemTotal}>₱{(item.price * item.quantity).toFixed(2)}</Text>

          <TouchableOpacity
            onPress={() => handleRemoveItem(item.productId)}
            style={styles.removeBtn}
          >
            <MaterialCommunityIcons name="trash-can" size={18} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Calculate totals for selected items
  const selectedSubtotal = cart
    .filter(item => selectedItems.has(item.productId))
    .reduce((sum, item) => sum + (item.price * item.quantity || 0), 0);

  const selectedTax = selectedSubtotal * 0.12;
  const selectedTotal = selectedSubtotal + selectedTax;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B76E79" />
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <View style={styles.logoSection}>
        <Text style={styles.logoText}>ROSELUXE</Text>
      </View>

      {cart.length > 0 && (
        <View style={styles.topHeader}>
          <Text style={styles.topHeaderTitle}>Shopping Cart</Text>
          {selectedItems.size > 0 && (
            <View style={styles.topHeaderActions}>
              <Text style={styles.selectionCountText}>
                {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
              </Text>
              <TouchableOpacity
                onPress={handleBulkDelete}
                style={styles.topDeleteBtn}
              >
                <MaterialCommunityIcons name="trash-can" size={20} color="#F44336" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <SafeAreaView style={{ flex: 1 }}>
        {cart.length > 0 ? (
          <>
            <ScrollView contentContainerStyle={styles.container}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={toggleSelectAll}
                  >
                    <View style={[styles.checkboxBox, selectAll && styles.checkboxBoxChecked]}>
                      {selectAll && (
                        <MaterialCommunityIcons name="check" size={16} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.selectAllText}>
                    {selectAll ? "Deselect All" : "Select All"}
                  </Text>
                </View>
                <Text style={styles.itemCount}>{cart.length} items</Text>
              </View>

              <FlatList
                data={cart}
                renderItem={renderCartItem}
                keyExtractor={(item) => item.productId?.toString() || Math.random().toString()}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
              />

              {selectedItems.size > 0 && (
                <View style={styles.summaryContainer}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Subtotal ({selectedItems.size} item{selectedItems.size > 1 ? 's' : ''})
                    </Text>
                    <Text style={styles.summaryValue}>₱{selectedSubtotal.toFixed(2)}</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tax (12%)</Text>
                    <Text style={styles.summaryValue}>₱{selectedTax.toFixed(2)}</Text>
                  </View>

                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>₱{selectedTotal.toFixed(2)}</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.checkoutContainer}>
              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={handleCheckout}
                  style={[
                    styles.checkoutBtn,
                    selectedItems.size === 0 && styles.checkoutBtnDisabled
                  ]}
                  disabled={selectedItems.size === 0}
                  labelStyle={styles.buttonLabel}
                >
                  {selectedItems.size > 0 ? `Checkout (${selectedItems.size})` : "Select items"}
                </Button>

                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate("Products")}
                  style={styles.continueBtnBtn}
                >
                  Continue Shopping
                </Button>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <Text style={styles.emptySubtext}>
              Add some beautiful satin flowers to get started!
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate("Products")}
              style={styles.emptyBtn}
              labelStyle={styles.buttonLabel}
            >
              Continue Shopping
            </Button>
          </View>
        )}
      </SafeAreaView>



      {/* NAVIGATION COMPONENT */}
      <Navigation
        navigation={navigation}
        currentScreen="Cart"
        isLoggedIn={isLoggedIn}
        userImage={userImage}
        cartCount={cartCount}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#FFF5F7" },
  container: { flexGrow: 1, paddingBottom: 20 },

  logoSection: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE8ED',
    marginTop: 40,
  },

  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#B76E79',
    letterSpacing: 3,
    fontStyle: 'italic',
  },

  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  topHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFE8ED",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectionCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B76E79",
  },
  topDeleteBtn: {
    padding: 4,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  itemCount: {
    fontSize: 14,
    color: "#B76E79",
    fontWeight: "600",
    backgroundColor: "#FFE8ED",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },

  checkbox: {
    padding: 4,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxBoxChecked: {
    backgroundColor: "#B76E79",
    borderColor: "#B76E79",
  },

  listContent: { padding: 12 },
  cartItem: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    alignItems: "center",
    gap: 10,
  },
  cartItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemDetails: { flex: 1 },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B76E79"
  },
  itemActions: {
    alignItems: "flex-end",
    gap: 8
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 4
  },
  qtyBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B76E79"
  },
  qtyValue: {
    marginHorizontal: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#333"
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333"
  },
  removeBtn: {
    padding: 6
  },

  summaryContainer: {
    backgroundColor: "white",
    marginHorizontal: 12,
    borderRadius: 10,
    padding: 16,
    elevation: 2,
    marginTop: 12
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500"
  },
  summaryValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600"
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginBottom: 0
  },
  totalLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "700"
  },
  totalValue: {
    fontSize: 18,
    color: "#B76E79",
    fontWeight: "700"
  },

  checkoutContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 60,
    paddingTop: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  buttonContainer: {
    gap: 10,
  },
  checkoutBtn: {
    backgroundColor: "#B76E79",
    paddingVertical: 8
  },
  checkoutBtnDisabled: {
    backgroundColor: "#ddd",
  },
  buttonLabel: {
    color: "#fff",
    fontWeight: "bold",
  },
  continueBtnBtn: {
    borderColor: "#B76E79",
    paddingVertical: 8
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center"
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginBottom: 24,
    textAlign: "center"
  },
  emptyBtn: {
    backgroundColor: "#B76E79",
    paddingVertical: 8,
    minWidth: 200
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    marginTop: 12,
    color: "#999",
    fontSize: 14,
  },

  // ===== MODAL STYLES =====
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
  modalBackBtn: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  modalContent: {
    padding: 16,
    paddingBottom: 100,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },

  // Modal Item Card
  modalItemCard: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    gap: 12,
  },
  modalItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  modalItemQty: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  modalItemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B76E79",
  },

  modalSummary: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
  },

  // Text Inputs
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

  // Payment Method
  paymentMethodContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  paymentMethodBtn: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ddd",
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  paymentMethodBtnActive: {
    borderColor: "#B76E79",
    backgroundColor: "#FFF5F7",
  },
  paymentMethodLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    textAlign: "center",
  },
  paymentMethodLabelActive: {
    color: "#B76E79",
  },

  paymentInfo: {
    backgroundColor: "#FFF5F7",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  paymentInfoText: {
    fontSize: 12,
    color: "#B76E79",
    flex: 1,
  },

  // Confirm Section
  confirmCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  confirmLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  confirmValue: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },

  // Modal Footer
  modalFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  nextBtn: {
    backgroundColor: "#B76E79",
    paddingVertical: 8,
  },
});

export default CartScreen;