import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  FlatList,
  Dimensions,
  Animated,
  ImageBackground,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { API_ENDPOINTS } from '../config/api';
import HeaderScreen from './HeaderScreen';

const { width } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (width - 40) / 2;

// ✅ HELPER FUNCTION - Extract category name safely
const getCategoryName = (category) => {
  if (typeof category === 'object' && category?.name) {
    return category.name;
  }
  return typeof category === 'string' ? category : 'N/A';
};

const ProductScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlist, setWishlist] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userImage, setUserImage] = useState(null);

  // Product Detail Modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productQuantity, setProductQuantity] = useState(1);

  useEffect(() => {
    fetchProducts();
    loadWishlistAndCart();
    checkLoginStatus();
  }, []);

  // Update filtered products when search changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCategoryName(product.category)
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products]);

  // ✅ Fetch products from backend
  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching products from:', API_ENDPOINTS.PRODUCTS);

      const response = await axios.get(`${API_ENDPOINTS.PRODUCTS}`);
      console.log('📦 API Response products:', response.data);

      // Handle both response formats
      if (response.data?.products && Array.isArray(response.data.products)) {
        console.log(`✅ Successfully loaded ${response.data.products.length} products`);
        setProducts(response.data.products);
        setFilteredProducts(response.data.products);
      } else if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Successfully loaded ${response.data.length} products`);
        setProducts(response.data);
        setFilteredProducts(response.data);
      } else {
        console.warn('⚠️ Invalid products response format:', response.data);
        setProducts([]);
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Load wishlist and cart from AsyncStorage
  const loadWishlistAndCart = async () => {
    try {
      const savedWishlist = await AsyncStorage.getItem('wishlist');
      const savedCart = await AsyncStorage.getItem('cart');

      if (savedWishlist) {
        setWishlist(JSON.parse(savedWishlist));
      }
      if (savedCart) {
        const cartData = JSON.parse(savedCart);
        setCart(cartData);
        updateCartCount(cartData);
      }
    } catch (error) {
      console.log('Error loading wishlist/cart:', error);
    }
  };

  // ✅ Check login status
  const checkLoginStatus = async () => {
    try {
      const user = await AsyncStorage.getItem('user');
      if (user) {
        setIsLoggedIn(true);
        const parsedUser = JSON.parse(user);
        if (parsedUser.picture) {
          setUserImage(parsedUser.picture);
        }
        console.log('✅ User is logged in');
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.log('Error checking login status:', error);
      setIsLoggedIn(false);
    }
  };

  // ✅ Add to wishlist
  const handleAddToWishlist = async (product) => {
    try {
      const isInWishlist = wishlist.some((item) => item._id === product._id);

      let updatedWishlist;
      if (isInWishlist) {
        updatedWishlist = wishlist.filter((item) => item._id !== product._id);
        Alert.alert('Removed', `${product.name} removed from wishlist`);
      } else {
        updatedWishlist = [...wishlist, product];
        Alert.alert('Added', `${product.name} added to wishlist`);
      }

      setWishlist(updatedWishlist);
      await AsyncStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
      console.log('Wishlist updated:', updatedWishlist.length);
    } catch (error) {
      console.error('Error updating wishlist:', error);
      Alert.alert('Error', 'Failed to update wishlist');
    }
  };

  // ✅ Add to cart
  const handleAddToCart = async (product, quantity = 1) => {
    try {
      const existingItem = cart.find((item) => item._id === product._id);

      let updatedCart;
      if (existingItem) {
        updatedCart = cart.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
        Alert.alert('Updated', `${product.name} quantity updated in cart`);
      } else {
        updatedCart = [...cart, { ...product, quantity }];
        Alert.alert('Added', `${product.name} added to cart`);
      }

      setCart(updatedCart);
      updateCartCount(updatedCart);
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
      console.log('Cart updated:', updatedCart.length, 'items');
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add to cart');
    }
  };

  // ✅ Update cart count
  const updateCartCount = (cartData) => {
    const count = cartData.reduce((total, item) => total + item.quantity, 0);
    setCartCount(count);
  };

  // ✅ Handle Buy Now
  const handleBuyNow = (product) => {
    if (!isLoggedIn) {
      Alert.alert(
        'Login Required',
        'Please login to proceed with purchase',
        [
          { text: 'Cancel', onPress: () => {} },
          {
            text: 'Login',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
      return;
    }

    // Add to cart and navigate
    handleAddToCart(product, productQuantity);
    setShowProductModal(false);
    setProductQuantity(1);

    // Navigate to Cart
    setTimeout(() => {
      navigation.navigate('Cart');
    }, 500);
  };

  // ✅ Render product card
  const renderProductCard = ({ item }) => {
    const isInWishlist = wishlist.some((w) => w._id === item._id);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => {
          setSelectedProduct(item);
          setShowProductModal(true);
          setProductQuantity(1);
        }}
        activeOpacity={0.8}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.images?.[0] || 'https://via.placeholder.com/200' }}
            style={styles.productImage}
            onError={() => console.warn('Image failed to load:', item.images?.[0])}
          />

          {/* Stock Badge */}
          {item.stock > 0 ? (
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>In Stock</Text>
            </View>
          ) : (
            <View style={[styles.stockBadge, { backgroundColor: '#999' }]}>
              <Text style={styles.stockText}>Out of Stock</Text>
            </View>
          )}

          {/* Wishlist Button */}
          <TouchableOpacity
            style={styles.wishlistButton}
            onPress={() => handleAddToWishlist(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.wishlistIcon}>
              {isInWishlist ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₱{item.price?.toFixed(2) || '0.00'}</Text>
          </View>

          {/* ✅ FIXED: Display category name safely */}
          <Text style={styles.category} numberOfLines={1}>
            {getCategoryName(item.category)}
          </Text>
        </View>

        {/* Add to Cart Button */}
        <TouchableOpacity
          style={[styles.addToCartBtn, item.stock === 0 && styles.disabledBtn]}
          onPress={() => {
            if (item.stock > 0) {
              handleAddToCart(item, 1);
            } else {
              Alert.alert('Out of Stock', 'This product is not available');
            }
          }}
          disabled={item.stock === 0}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="cart"
            size={18}
            color="white"
          />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ✅ Product Detail Modal
  const renderProductModal = () => {
    if (!selectedProduct) return null;

    const isInWishlist = wishlist.some((w) => w._id === selectedProduct._id);

    return (
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowProductModal(false);
          setProductQuantity(1);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Close Button */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowProductModal(false);
                setProductQuantity(1);
              }}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Product Image Gallery */}
            <View style={styles.modalImageContainer}>
              <Image
                source={{
                  uri: selectedProduct.images?.[0] || 'https://via.placeholder.com/400',
                }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </View>

            {/* Product Details */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailsHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalProductName}>
                    {selectedProduct.name}
                  </Text>
                  {/* ✅ FIXED: Display category name safely */}
                  <Text style={styles.modalCategory}>
                    {getCategoryName(selectedProduct.category)}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleAddToWishlist(selectedProduct)}
                  style={styles.modalWishlistBtn}
                >
                  <Text style={styles.wishlistIconLarge}>
                    {isInWishlist ? '❤️' : '🤍'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Price */}
              <View style={styles.priceContainer}>
                <Text style={styles.modalPrice}>
                  ₱{selectedProduct.price?.toFixed(2) || '0.00'}
                </Text>
                {selectedProduct.stock > 0 ? (
                  <View style={styles.inStockBadge}>
                    <Text style={styles.inStockText}>In Stock</Text>
                  </View>
                ) : (
                  <View style={styles.outOfStockBadge}>
                    <Text style={styles.outOfStockText}>Out of Stock</Text>
                  </View>
                )}
              </View>

              {/* Description */}
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Description</Text>
                <Text style={styles.description}>
                  {selectedProduct.description}
                </Text>
              </View>

              {/* Quantity Selector */}
              {selectedProduct.stock > 0 && (
                <View style={styles.quantityContainer}>
                  <Text style={styles.quantityLabel}>Quantity</Text>
                  <View style={styles.quantitySelector}>
                    <TouchableOpacity
                      onPress={() =>
                        setProductQuantity(
                          productQuantity > 1 ? productQuantity - 1 : 1
                        )
                      }
                      style={styles.quantityBtn}
                    >
                      <Text style={styles.quantityBtnText}>−</Text>
                    </TouchableOpacity>

                    <Text style={styles.quantityValue}>{productQuantity}</Text>

                    <TouchableOpacity
                      onPress={() =>
                        setProductQuantity(
                          productQuantity < selectedProduct.stock
                            ? productQuantity + 1
                            : selectedProduct.stock
                        )
                      }
                      style={styles.quantityBtn}
                    >
                      <Text style={styles.quantityBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Stock Info */}
              <Text style={styles.stockInfo}>
                {selectedProduct.stock > 0
                  ? `${selectedProduct.stock} items available`
                  : 'Out of Stock'}
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          {selectedProduct.stock > 0 && (
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.modalCartBtn}
                onPress={() => {
                  handleAddToCart(selectedProduct, productQuantity);
                  setShowProductModal(false);
                  setProductQuantity(1);
                }}
              >
                <MaterialCommunityIcons
                  name="cart"
                  size={20}
                  color="white"
                />
                <Text style={styles.modalCartBtnText}>Add to Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBuyBtn}
                onPress={() => handleBuyNow(selectedProduct)}
              >
                <Text style={styles.modalBuyBtnText}>Buy Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    );
  };

  // ✅ Navigate handler
  const handleNavigation = (tabName) => {
    setActiveTab(tabName);
    switch (tabName) {
      case 'home':
        navigation.navigate('Home');
        break;
      case 'products':
        // Already on products
        break;
      case 'cart':
        navigation.navigate('Cart');
        break;
      case 'wishlist':
        navigation.navigate('Wishlist');
        break;
      case 'profile':
        if (isLoggedIn) {
          navigation.navigate('Profile');
        } else {
          navigation.navigate('Login');
        }
        break;
      default:
        break;
    }
  };

  const NavItem = ({ name, icon, label, onPress, badge }) => (
    <TouchableOpacity
      style={styles.navItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.navIconContainer,
          activeTab === name && styles.navIconActive,
        ]}
      >
        {name === 'profile' ? (
          <Image
            source={{
              uri: userImage || 'https://via.placeholder.com/40?text=User',
            }}
            style={styles.profileImage}
          />
        ) : (
          <>
            <MaterialCommunityIcons
              name={icon}
              size={24}
              color={activeTab === name ? '#B76E79' : '#666'}
            />
            {badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </>
        )}
      </View>
      <Text
        style={[
          styles.navLabel,
          activeTab === name && styles.navLabelActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.mainContainer}>
      {/* Header with Search */}
      <HeaderScreen
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={() => console.log('Search submitted:', searchQuery)}
        onFilterPress={() => console.log('Filter pressed')}
      />

      {/* Products List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B76E79" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductCard}
          keyExtractor={(item) => item._id?.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🌸</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No products found' : 'No products available'}
          </Text>
          {searchQuery && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
            >
              <Text style={styles.clearSearchText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Product Detail Modal */}
      {renderProductModal()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <NavItem
          name="home"
          icon="home"
          label="Home"
          onPress={() => handleNavigation('home')}
        />
        <NavItem
          name="products"
          icon="flower"
          label="Products"
          onPress={() => handleNavigation('products')}
        />
        <NavItem
          name="cart"
          icon="cart"
          label="Cart"
          onPress={() => handleNavigation('cart')}
          badge={cartCount}
        />
        <NavItem
          name="wishlist"
          icon="heart"
          label="Wishlist"
          onPress={() => handleNavigation('wishlist')}
          badge={wishlist.length}
        />
        <NavItem
          name="profile"
          icon="account-circle"
          label="Profile"
          onPress={() => handleNavigation('profile')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#B76E79',
    fontWeight: '500',
  },

  // Product Grid
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 10,
  },

  listContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },

  // Product Card
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    marginBottom: 8,
  },

  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    backgroundColor: '#f5f5f5',
  },

  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  stockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  stockText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },

  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 18,
    elevation: 3,
  },

  wishlistIcon: {
    fontSize: 20,
  },

  // Product Info
  productInfo: {
    padding: 10,
  },

  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },

  priceRow: {
    marginBottom: 4,
  },

  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B76E79',
  },

  category: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },

  // Add to Cart Button
  addToCartBtn: {
    flexDirection: 'row',
    backgroundColor: '#B76E79',
    marginHorizontal: 8,
    marginBottom: 8,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledBtn: {
    backgroundColor: '#ccc',
  },

  addToCartText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: 12,
  },

  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
  },

  clearSearchBtn: {
    backgroundColor: '#B76E79',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },

  clearSearchText: {
    color: 'white',
    fontWeight: '600',
  },

  // Product Detail Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },

  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    paddingBottom: 20,
  },

  modalImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalImage: {
    width: '90%',
    height: '100%',
  },

  detailsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },

  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  modalProductName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },

  modalCategory: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },

  modalWishlistBtn: {
    padding: 8,
  },

  wishlistIconLarge: {
    fontSize: 28,
  },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  modalPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#B76E79',
    marginRight: 12,
  },

  inStockBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  inStockText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 12,
  },

  outOfStockBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  outOfStockText: {
    color: '#F44336',
    fontWeight: '600',
    fontSize: 12,
  },

  descriptionContainer: {
    marginBottom: 16,
  },

  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  quantityContainer: {
    marginBottom: 12,
  },

  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    height: 40,
  },

  quantityBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },

  quantityBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#B76E79',
  },

  quantityValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },

  stockInfo: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },

  modalButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },

  modalCartBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#B76E79',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCartBtnText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },

  modalBuyBtn: {
    flex: 1,
    backgroundColor: '#E8B4BA',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalBuyBtnText: {
    color: '#B76E79',
    fontWeight: '700',
    fontSize: 15,
  },

  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 8,
    paddingBottom: 8,
  },

  navItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },

  navIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    position: 'relative',
  },

  navIconActive: {
    backgroundColor: '#FFE8ED',
  },

  navLabel: {
    fontSize: 11,
    marginTop: 4,
    color: '#666',
    fontWeight: '500',
  },

  navLabelActive: {
    color: '#B76E79',
    fontWeight: '700',
  },

  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#B76E79',
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },

  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default ProductScreen;