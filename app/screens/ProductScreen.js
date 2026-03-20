import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Text } from "react-native-paper";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import { API_ENDPOINTS } from "../config/api";
import LocalCartManager from "../utils/LocalCartManager";
import HeaderScreen from "./components/HeaderScreen";
import Navigation from "./components/navigation";
import ReviewSection from "./components/ReviewSectionScreen";

const { width } = Dimensions.get("window");
const PRODUCT_CARD_WIDTH = (width - 40) / 2;

const getCategoryName = (category) => {
  if (typeof category === "object" && category?.name) return category.name;
  if (typeof category === "string") return category;
  return "Other";
};

// Price ranges
const PRICE_RANGES = [
  { label: "All", min: 0, max: Infinity },
  { label: "₱0 - ₱49", min: 0, max: 49 },
  { label: "₱50 - ₱99", min: 50, max: 99 },
  { label: "₱100 - ₱499", min: 100, max: 499 },
  { label: "₱500+", min: 500, max: Infinity },
];

const ProductScreen = ({ navigation }) => {
  // STATE
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPriceRange, setSelectedPriceRange] = useState(0);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const [filterMode, setFilterMode] = useState(null);
  
  // Cart & Wishlist
  const [wishlist, setWishlist] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Modal states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  // Profile image
  const [userImage, setUserImage] = useState(null);

  // ================================
  // FETCH PRODUCTS
  // ================================
  const fetchProducts = async () => {
    try {
      setLoading(true);

      const priceRange = PRICE_RANGES[selectedPriceRange];

      const params = {
        search: searchQuery || "",
        category: selectedCategory !== "All" ? selectedCategory : "",
        minPrice: priceRange.min,
        maxPrice: priceRange.max === Infinity ? "" : priceRange.max
      };

      const res = await axios.get(API_ENDPOINTS.PRODUCTS, { params });

      const productData = res.data?.products || [];

      setProducts(productData);

    } catch (err) {
      Alert.alert("Error", "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // FETCH CATEGORIES FROM DB
  // ================================
  const fetchCategories = async () => {
    try {
      const res = await axios.get(API_ENDPOINTS.CATEGORIES);
      const data = res.data.categories || [];

      const categoryNames = ["All", ...data.map(c => c.name)];
      setCategories(categoryNames);

    } catch (error) {
      console.log("Fetch categories error", error);
    }
  };

  // ================================
  // GET CART COUNT FROM LOCAL STORAGE
  // ================================
  const getCartCount = async () => {
    try {
      const count = await LocalCartManager.getCartCount();
      setCartCount(count);
    } catch (error) {
      console.log("Get cart count error:", error);
      setCartCount(0);
    }
  };

  // ================================
  // CHECK LOGIN
  // ================================
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

  // ================================
  // LOAD WISHLIST FROM STORAGE
  // ================================
  const loadWishlist = async () => {
    const savedWishlist = await AsyncStorage.getItem("wishlist");
    if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
  };

  // ================================
  // LIFECYCLE
  // ================================
  useEffect(() => {
    fetchCategories();
    checkLoginStatus();
    getCartCount();
    loadWishlist();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedCategory, selectedPriceRange]);

  useFocusEffect(
    useCallback(() => {
      checkLoginStatus();
      getCartCount();
    }, [])
  );

  // ================================
  // WISHLIST
  // ================================
  const toggleWishlist = async (product) => {
    const exists = wishlist.some((w) => w._id === product._id);
    const updated = exists
      ? wishlist.filter((w) => w._id !== product._id)
      : [...wishlist, product];

    setWishlist(updated);
    await AsyncStorage.setItem("wishlist", JSON.stringify(updated));
  };

  // ================================
  // ADD TO CART
  // ================================
  const handleAddToCart = async () => {
    try {
      if (!selectedProduct) return;

      // Check if user is logged in
      const userData = await AsyncStorage.getItem("user");
      if (!userData) {
        Alert.alert("Login Required", "Please login to add items to cart");
        setShowProductModal(false);
        navigation.navigate("Login");
        return;
      }

      setIsAddingToCart(true);

      const result = await LocalCartManager.addToCart(
        selectedProduct._id,
        {
          productName: selectedProduct.name,
          price: selectedProduct.price,
          image: selectedProduct.images?.[0] || "",
        },
        quantity
      );

      if (result.success) {
        await getCartCount();
        
        setShowProductModal(false);
        setQuantity(1);

        Alert.alert("Added to Cart", `${selectedProduct.name} added successfully`);
      } else {
        Alert.alert("Error", result.message || "Failed to add to cart");
      }
    } catch (error) {
      console.log("Add to cart error:", error);
      Alert.alert("Error", "Failed to add to cart");
    } finally {
      setIsAddingToCart(false);
    }
  };

  // ================================
  // CATEGORY DROPDOWN ITEM
  // ================================
  const renderCategoryDropdownItem = ({ item }) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => {
        setSelectedCategory(item);
        setShowCategoryDropdown(false);
        setFilterMode(null);
      }}
    >
      <View style={styles.dropdownItemContent}>
        {selectedCategory === item && (
          <MaterialCommunityIcons name="check" size={18} color="#B76E79" />
        )}
        <Text
          style={[
            styles.dropdownItemText,
            selectedCategory === item && styles.dropdownItemTextActive,
          ]}
        >
          {item}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // ================================
  // PRICE DROPDOWN ITEM
  // ================================
  const renderPriceDropdownItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => {
        setSelectedPriceRange(index);
        setShowPriceDropdown(false);
        setFilterMode(null);
      }}
    >
      <View style={styles.dropdownItemContent}>
        {selectedPriceRange === index && (
          <MaterialCommunityIcons name="check" size={18} color="#B76E79" />
        )}
        <Text
          style={[
            styles.dropdownItemText,
            selectedPriceRange === index && styles.dropdownItemTextActive,
          ]}
        >
          {item.label}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // ================================
  // PRODUCT CARD
  // ================================
  const renderProduct = ({ item }) => {
    const isWish = wishlist.some((w) => w._id === item._id);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedProduct(item);
          setQuantity(1);
          setShowProductModal(true);
        }}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.images?.[0] || "https://via.placeholder.com/200" }}
            style={styles.image}
          />
          <TouchableOpacity
            style={styles.wishlistBtn}
            onPress={() => toggleWishlist(item)}
          >
            <MaterialCommunityIcons
              name={isWish ? "heart" : "heart-outline"}
              size={20}
              color={isWish ? "#FF6B6B" : "#fff"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <Text numberOfLines={2} style={styles.name}>
            {item.name}
          </Text>
          <Text style={styles.price}>₱{item.price.toLocaleString()}</Text>
          <Text style={styles.category}>{getCategoryName(item.category)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ================================
  // PRODUCT MODAL
  // ================================
  const renderProductModal = () => {
    if (!selectedProduct) return null;
    const isWish = wishlist.some((w) => w._id === selectedProduct._id);

    return (
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowProductModal(false)}
                style={styles.closeBtn}
              >
                <MaterialCommunityIcons name="close" size={28} color="#333" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => toggleWishlist(selectedProduct)}
                style={styles.wishlistModalBtn}
              >
                <MaterialCommunityIcons
                  name={isWish ? "heart" : "heart-outline"}
                  size={28}
                  color={isWish ? "#FF6B6B" : "#333"}
                />
              </TouchableOpacity>
            </View>

            {/* Product Images - Swipeable */}
            <FlatList
              data={selectedProduct.images?.length ? selectedProduct.images : ["https://via.placeholder.com/300"]}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={[styles.modalImage, { width: width }]}
                />
              )}
            />

            {/* Product Info */}
            <View style={styles.modalInfo}>
              <Text style={styles.modalName}>{selectedProduct.name}</Text>
              <Text style={styles.modalPrice}>
                ₱{selectedProduct.price.toLocaleString()}
              </Text>
              <Text style={styles.categoryBadge}>
                {getCategoryName(selectedProduct.category)}
              </Text>

              <View style={styles.descriptionSection}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>
                  {selectedProduct.description ||
                    "Premium quality product with excellent features."}
                </Text>
              </View>

              <View style={styles.quantitySection}>
                <Text style={styles.sectionTitle}>Quantity</Text>
                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Text style={styles.quantityBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => setQuantity(quantity + 1)}
                  >
                    <Text style={styles.quantityBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>


                    
              {/* ✅ NEW: ReviewSection Component */}
              <ReviewSection
                productId={selectedProduct._id}
                navigation={navigation}
              />
            </View>
          </ScrollView>

          {/* Add to Cart */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.addToCartBtn,
                isAddingToCart && styles.addToCartBtnDisabled
              ]}
              onPress={handleAddToCart}
              disabled={isAddingToCart}
            >
              {isAddingToCart ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.addToCartText}>Adding...</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="cart-plus"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.addToCartText}>Add to Cart</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // ================================
  // UI
  // ================================
  return (
    <View style={{ flex: 1, backgroundColor: "#FFF5F7" }}>
      <HeaderScreen searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* FILTER SECTION - DROPDOWNS */}
      <View style={styles.filterSection}>
        <View style={styles.filterButtonsRow}>
          {/* Category Filter Button */}
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedCategory !== "All" && styles.filterButtonActive,
            ]}
            onPress={() => {
              if (filterMode === "category") {
                setFilterMode(null);
                setShowCategoryDropdown(false);
              } else {
                setFilterMode("category");
                setShowCategoryDropdown(true);
                setShowPriceDropdown(false);
              }
            }}
          >
            <MaterialCommunityIcons
              name="filter-variant"
              size={18}
              color={selectedCategory !== "All" ? "#fff" : "#B76E79"}
            />
            <Text
              style={[
                styles.filterButtonText,
                selectedCategory !== "All" && styles.filterButtonTextActive,
              ]}
            >
              {selectedCategory === "All" ? "Categories" : selectedCategory}
            </Text>
            <MaterialCommunityIcons
              name={showCategoryDropdown ? "chevron-up" : "chevron-down"}
              size={18}
              color={selectedCategory !== "All" ? "#fff" : "#B76E79"}
            />
          </TouchableOpacity>

          {/* Price Filter Button */}
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedPriceRange !== 0 && styles.filterButtonActive,
            ]}
            onPress={() => {
              if (filterMode === "price") {
                setFilterMode(null);
                setShowPriceDropdown(false);
              } else {
                setFilterMode("price");
                setShowPriceDropdown(true);
                setShowCategoryDropdown(false);
              }
            }}
          >
            <MaterialCommunityIcons
              name="cash-multiple"
              size={18}
              color={selectedPriceRange !== 0 ? "#fff" : "#B76E79"}
            />
            <Text
              style={[
                styles.filterButtonText,
                selectedPriceRange !== 0 && styles.filterButtonTextActive,
              ]}
            >
              {PRICE_RANGES[selectedPriceRange].label === "All"
                ? "Price"
                : PRICE_RANGES[selectedPriceRange].label}
            </Text>
            <MaterialCommunityIcons
              name={showPriceDropdown ? "chevron-up" : "chevron-down"}
              size={18}
              color={selectedPriceRange !== 0 ? "#fff" : "#B76E79"}
            />
          </TouchableOpacity>

          {/* Reset Filter Button */}
          {(selectedCategory !== "All" || selectedPriceRange !== 0) && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSelectedCategory("All");
                setSelectedPriceRange(0);
                setFilterMode(null);
                setShowCategoryDropdown(false);
                setShowPriceDropdown(false);
              }}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color="#999"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* CATEGORY DROPDOWN */}
        {filterMode === "category" && (
          <FlatList
            data={categories}
            renderItem={renderCategoryDropdownItem}
            keyExtractor={(item) => item}
            style={styles.dropdownContainer}
            scrollEnabled={false}
            nestedScrollEnabled={true}
          />
        )}

        {/* PRICE DROPDOWN */}
        {filterMode === "price" && (
          <FlatList
            data={PRICE_RANGES}
            renderItem={({ item, index }) =>
              renderPriceDropdownItem({ item, index })
            }
            keyExtractor={(item, index) => index.toString()}
            style={styles.dropdownContainer}
            scrollEnabled={false}
            nestedScrollEnabled={true}
          />
        )}
      </View>

      {/* PRODUCTS LIST */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B76E79" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="shopping-outline"
            size={48}
            color="#ccc"
          />
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={{
            justifyContent: "space-between",
            paddingHorizontal: 10,
          }}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        />
      )}

      {/* PRODUCT MODAL */}
      {renderProductModal()}

      {/* NAVIGATION COMPONENT WITH RIGHT DRAWER */}
      <Navigation
        navigation={navigation}
        currentScreen="Products"
        isLoggedIn={isLoggedIn}
        userImage={userImage}
        cartCount={cartCount}
      />
    </View>
  );
};

export default ProductScreen;

// All styles remain the same as before...
const styles = StyleSheet.create({
  /* FILTER SECTION */
  filterSection: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
  },

  filterButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },

  filterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    gap: 6,
  },

  filterButtonActive: {
    backgroundColor: "#B76E79",
    borderColor: "#B76E79",
  },

  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },

  filterButtonTextActive: {
    color: "#fff",
  },

  resetButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
  },

  dropdownContainer: {
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
    maxHeight: 250,
  },

  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8e8e8",
  },

  dropdownItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dropdownItemText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
    flex: 1,
  },

  dropdownItemTextActive: {
    color: "#B76E79",
    fontWeight: "700",
  },

  /* PRODUCT CARD */
  card: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  imageContainer: {
    width: "100%",
    height: 160,
    backgroundColor: "#f5f5f5",
    position: "relative",
  },

  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  wishlistBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },

  info: {
    padding: 10,
  },

  name: {
    fontWeight: "600",
    fontSize: 13,
    color: "#333",
    lineHeight: 16,
  },

  price: {
    fontWeight: "700",
    color: "#B76E79",
    fontSize: 14,
    marginTop: 4,
  },

  category: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
    fontWeight: "500",
  },

  /* LOADING & EMPTY */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#999",
    fontSize: 13,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 12,
  },

  emptySubtext: {
    fontSize: 12,
    color: "#bbb",
    marginTop: 4,
  },

  /* MODAL */
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },

  modalContent: {
    flex: 1,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  closeBtn: {
    padding: 6,
  },

  wishlistModalBtn: {
    padding: 6,
  },

  modalImage: {
    width: "100%",
    height: 350,
    resizeMode: "cover",
    backgroundColor: "#f5f5f5",
  },

  modalInfo: {
    padding: 16,
  },

  modalName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    lineHeight: 28,
  },

  modalPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: "#B76E79",
    marginTop: 12,
  },

  categoryBadge: {
    fontSize: 11,
    color: "#fff",
    backgroundColor: "#B76E79",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 8,
    overflow: "hidden",
    fontWeight: "600",
  },

  descriptionSection: {
    marginTop: 20,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },

  description: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },

  quantitySection: {
    marginTop: 16,
  },

  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    width: 120,
  },

  quantityBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  quantityBtnText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#B76E79",
  },

  quantityValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  totalSection: {
    marginTop: 16,
    paddingBottom: 20,
  },

  totalLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },

  totalPrice: {
    fontSize: 24,
    fontWeight: "800",
    color: "#B76E79",
    marginTop: 4,
  },

  /* MODAL FOOTER */
  modalFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },

  addToCartBtn: {
    backgroundColor: "#B76E79",
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#B76E79",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  addToCartBtnDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
  },

  addToCartText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});