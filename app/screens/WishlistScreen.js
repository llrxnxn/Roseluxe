import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import HeaderScreen from './components/HeaderScreen';
import Navigation from './components/navigation';
import LocalCartManager from '../utils/LocalCartManager';
import { API_ENDPOINTS } from '../config/api';

const { width } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (width - 40) / 2;

const WishlistScreen = ({ navigation }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWishlist, setFilteredWishlist] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userImage, setUserImage] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      loadWishlist();
      checkLoginStatus();
      fetchCartCount();
    }, [])
  );

  // Load wishlist from AsyncStorage
  const loadWishlist = async () => {
    try {
      setLoading(true);
      const savedWishlist = await AsyncStorage.getItem('wishlist');
      if (savedWishlist) {
        const parsed = JSON.parse(savedWishlist);
        setWishlist(parsed);
        setFilteredWishlist(parsed);
      }
    } catch (error) {
      console.log('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLoginStatus = async () => {
    try {
      const user = await AsyncStorage.getItem('user');
      setIsLoggedIn(!!user);
      if (user) {
        const parsedUser = JSON.parse(user);
        if (parsedUser.picture) {
          setUserImage(parsedUser.picture);
        }
      }
    } catch (error) {
      console.log('Error checking login status:', error);
      setIsLoggedIn(false);
    }
  };

  const fetchCartCount = async () => {
    try {
      const count = await LocalCartManager.getCartCount();
      setCartCount(count);
    } catch (error) {
      console.log('Error fetching cart count:', error);
      setCartCount(0);
    }
  };

  // Handle search/filter
  const handleSearch = () => {
    if (searchQuery.trim()) {
      const filtered = wishlist.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (typeof item.category === 'string' ? item.category.toLowerCase().includes(searchQuery.toLowerCase()) : false)
      );
      setFilteredWishlist(filtered);
    } else {
      setFilteredWishlist(wishlist);
    }
  };

  // Update filtered list when search changes
  useEffect(() => {
    handleSearch();
  }, [searchQuery, wishlist]);

  // Remove from wishlist
  const removeFromWishlist = async (productId) => {
    const updatedWishlist = wishlist.filter((item) => item._id !== productId);
    setWishlist(updatedWishlist);
    setFilteredWishlist(updatedWishlist);
    await AsyncStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
    setCartCount(await LocalCartManager.getCartCount());
    Alert.alert('Removed', 'Item removed from wishlist');
  };

  // Add to cart from wishlist using LocalCartManager
  const addToCart = async (product) => {
    try {
      setLoading(true);

      // Check if user is logged in
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Login Required', 'Please login to add items to cart');
        navigation.navigate('Login');
        setLoading(false);
        return;
      }

      // Add to local cart using LocalCartManager
      const result = await LocalCartManager.addToCart(
        product._id,
        {
          productName: product.name,
          price: product.price,
          image: product.images?.[0] || '',
        },
        1
      );

      if (result.success) {
        // Update cart count
        const newCartCount = await LocalCartManager.getCartCount();
        setCartCount(newCartCount);

        Alert.alert('Success', `${product.name} added to cart`, [
          { text: 'Back to Wishlist' },
          {
            text: 'View Cart',
            onPress: () => navigation.navigate('Cart'),
          },
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add to cart');
    } finally {
      setLoading(false);
    }
  };

  // Render wishlist item
  const renderWishlistItem = ({ item }) => (
    <View style={styles.wishlistCard}>
      <View style={styles.cardImage}>
        <Image
          source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>

        <Text style={styles.category} numberOfLines={1}>
          {typeof item.category === 'string' ? item.category : item.category?.name || 'Other'}
        </Text>

        <Text style={styles.price}>₱{item.price?.toFixed(2)}</Text>

        <View style={styles.stockStatus}>
          {item.stock > 0 ? (
            <View style={styles.inStockBadge}>
              <Text style={styles.inStockText}>In Stock</Text>
            </View>
          ) : (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[
            styles.addToCartBtn,
            item.stock === 0 && styles.disabledBtn,
          ]}
          onPress={() => {
            if (item.stock > 0) {
              addToCart(item);
            } else {
              Alert.alert('Out of Stock', 'This product is not available');
            }
          }}
          disabled={item.stock === 0}
        >
          <MaterialCommunityIcons
            name="cart"
            size={18}
            color={item.stock > 0 ? 'white' : '#999'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() =>
            Alert.alert(
              'Remove from Wishlist',
              'Are you sure?',
              [
                { text: 'Cancel' },
                {
                  text: 'Remove',
                  onPress: () => removeFromWishlist(item._id),
                  style: 'destructive',
                },
              ]
            )
          }
        >
          <MaterialCommunityIcons name="trash-can" size={18} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      {/* Header with Search */}
      <HeaderScreen
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearch}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {filteredWishlist.length > 0 ? (
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>My Wishlist</Text>
              <Text style={styles.itemCount}>{filteredWishlist.length} items</Text>
            </View>

            {/* Wishlist Items Grid */}
            <FlatList
              data={filteredWishlist}
              renderItem={renderWishlistItem}
              keyExtractor={(item) => item._id}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : wishlist.length > 0 && searchQuery.trim() ? (
          // No search results
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No items found</Text>
            <Text style={styles.emptySubtext}>
              Try searching with different keywords
            </Text>
            <Button
              mode="contained"
              onPress={() => setSearchQuery('')}
              style={styles.emptyBtn}
              labelStyle={styles.emptyBtnLabel}
            >
              Clear Search
            </Button>
          </View>
        ) : (
          // Empty wishlist
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🤍</Text>
            <Text style={styles.emptyText}>Your wishlist is empty</Text>
            <Text style={styles.emptySubtext}>
              Add your favorite flowers to your wishlist!
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Products')}
              style={styles.emptyBtn}
              labelStyle={styles.emptyBtnLabel}
            >
              Browse Products
            </Button>
          </View>
        )}
      </SafeAreaView>

      {/* NAVIGATION COMPONENT WITH RIGHT DRAWER */}
      <Navigation
        navigation={navigation}
        currentScreen="Wishlist"
        isLoggedIn={isLoggedIn}
        userImage={userImage}
        cartCount={cartCount}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },

  itemCount: {
    fontSize: 14,
    color: '#B76E79',
    fontWeight: '600',
    backgroundColor: '#FFE8ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // Grid
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 10,
  },

  listContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },

  // Wishlist Card
  wishlistCard: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    marginBottom: 8,
  },

  cardImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  cardContent: {
    padding: 10,
  },

  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },

  category: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },

  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B76E79',
    marginBottom: 8,
  },

  stockStatus: {
    marginBottom: 10,
  },

  inStockBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  inStockText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '600',
  },

  outOfStockBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  outOfStockText: {
    color: '#F44336',
    fontSize: 10,
    fontWeight: '600',
  },

  cardActions: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 8,
  },

  addToCartBtn: {
    flex: 1,
    backgroundColor: '#B76E79',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledBtn: {
    backgroundColor: '#ccc',
  },

  removeBtn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 8,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },

  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
    textAlign: 'center',
  },

  emptyBtn: {
    backgroundColor: '#B76E79',
    paddingVertical: 8,
    minWidth: 180,
  },

  emptyBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default WishlistScreen;