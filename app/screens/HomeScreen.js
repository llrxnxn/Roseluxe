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
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { API_ENDPOINTS } from '../config/api';

const { width } = Dimensions.get('window');
const CATEGORY_CARD_WIDTH = width - 40;

const HomeScreen = ({ navigation }) => {
  const [categories, setCategories] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userImage, setUserImage] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const flatListRef = useRef();
  const scrollX = useRef(new Animated.Value(0)).current;
  const currentIndex = useRef(0);
  const [activeTab, setActiveTab] = useState('home');
  const autoScrollInterval = useRef(null);

  useEffect(() => {
    fetchCategories();
    checkLoginStatus();
  }, []);

  // ✅ FIXED: Proper auto-scroll with interval management
  useEffect(() => {
    if (categories.length > 0) {
      startAutoScroll();
      return () => {
        if (autoScrollInterval.current) {
          clearInterval(autoScrollInterval.current);
        }
      };
    }
  }, [categories]);

  const startAutoScroll = () => {
    // Clear any existing interval
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
    }

    autoScrollInterval.current = setInterval(() => {
      currentIndex.current =
        currentIndex.current === categories.length - 1
          ? 0
          : currentIndex.current + 1;

      console.log(`📸 Auto-scrolling to index: ${currentIndex.current}`);

      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: currentIndex.current,
          animated: true,
          viewPosition: 0.5, // Center the item
        });
      }
    }, 4000); // Increased to 4 seconds for better animation
  };

  // ✅ CRITICAL FIX: Backend returns { categories: [...], count, success }
  // NOT just an array!
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      console.log('🔄 Fetching categories from:', API_ENDPOINTS.CATEGORIES);
      
      const response = await axios.get(`${API_ENDPOINTS.CATEGORIES}`);
      
      console.log('📦 API Response:', response.data);

      // ✅ FIX: Access response.data.categories (the actual array)
      if (response.data?.categories && Array.isArray(response.data.categories)) {
        console.log(`✅ Successfully loaded ${response.data.categories.length} categories`);
        setCategories(response.data.categories);
      } else if (response.data && Array.isArray(response.data)) {
        // Fallback: in case API returns array directly
        console.log(`✅ Successfully loaded ${response.data.length} categories`);
        setCategories(response.data);
      } else {
        console.warn('⚠️ Invalid categories response format:', response.data);
        console.warn('Expected: { categories: [...], count, success } or [...]');
        setCategories([]);
      }
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      console.error('Error message:', error.message);
      console.error('Error URL:', error.config?.url);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      
      Alert.alert('Error', 'Failed to load categories. Please try again.');
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

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
        console.log('❌ User is not logged in');
      }
    } catch (error) {
      console.log('Error checking login status:', error);
      setIsLoggedIn(false);
    }
  };

  const handleOrderNow = () => {
    console.log('🛒 ORDER NOW clicked - isLoggedIn:', isLoggedIn);
    
    if (isLoggedIn) {
      console.log('✅ User logged in - navigating to Products');
      navigation.navigate('Products');
    } else {
      console.log('❌ User not logged in - navigating to Login');
      navigation.navigate('Login');
    }
  };

  const handleNavigation = (tabName) => {
    setActiveTab(tabName);
    switch (tabName) {
      case 'home':
        break;
      case 'products':
        navigation.navigate('Products');
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

  // ✅ IMPROVED: Better category card rendering
  const renderCategory = ({ item, index }) => (
    <View
      style={{
        width: CATEGORY_CARD_WIDTH,
        marginRight: 20,
      }}
      key={item._id?.toString() || index}
    >
      <View style={styles.categoryCard}>
        <Image
          source={{ uri: item.image }}
          style={styles.categoryImage}
          onError={() => console.warn('⚠️ Image failed to load:', item.image)}
          onLoad={() => console.log(`✅ Image loaded for: ${item.name}`)}
        />
        <Text style={styles.categoryName}>{item.name}</Text>
      </View>
    </View>
  );

  const NavItem = ({ name, icon, label, onPress }) => (
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
            onError={() => console.warn('Profile image failed to load')}
          />
        ) : (
          <MaterialCommunityIcons
            name={icon}
            size={24}
            color={activeTab === name ? '#B76E79' : '#666'}
          />
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
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* 🌸 BANNER WITH SATIN BOUQUET IMAGE */}
        <ImageBackground
          source={{
            uri: 'https://i.pinimg.com/736x/0a/94/3b/0a943b5227739fe79dfc6a14c711bf77.jpg',
          }}
          style={styles.banner}
        >
          <View style={styles.overlay}>
            <Text variant="displayMedium" style={styles.bannerTitle}>
              ROSELUXE
            </Text>
            <Text variant="titleLarge" style={styles.bannerSubtitle}>
              Satin Flowers for Every Occasion 🌹
            </Text>

            <Button
              mode="contained"
              onPress={handleOrderNow}
              style={styles.orderButton}
              labelStyle={styles.buttonLabel}
            >
              ORDER NOW!
            </Button>
          </View>
        </ImageBackground>

        {/* 🌷 CATEGORIES SECTION */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            Flower Categories
          </Text>

          {loadingCategories ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading categories...</Text>
            </View>
          ) : categories.length > 0 ? (
            <View>
              <FlatList
                ref={flatListRef}
                data={categories}
                renderItem={renderCategory}
                keyExtractor={(item, index) =>
                  item._id?.toString() || `category-${index}`
                }
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                decelerationRate={0.9}
                snapToInterval={CATEGORY_CARD_WIDTH + 20}
                snapToAlignment="start"
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: false }
                )}
              />
              {/* ✅ ADDED: Visual indicator of carousel position */}
              <View style={styles.dotsContainer}>
                {categories.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      currentIndex.current === index && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.noCategoriesContainer}>
              <Text style={styles.noCategoriesText}>
                No categories available. Please check again later.
              </Text>
            </View>
          )}
        </View>

        {/* 🌟 WHY CHOOSE US */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            Why Choose ROSELUXE?
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text>Premium satin flower arrangements</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text>Fast and secure delivery</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text>Luxury quality guaranteed</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text>24/7 customer support</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 📱 BOTTOM NAVIGATION */}
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
        />
        <NavItem
          name="wishlist"
          icon="heart"
          label="Wishlist"
          onPress={() => handleNavigation('wishlist')}
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

  container: {
    flexGrow: 1,
    paddingBottom: 80,
  },

  banner: {
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
  },

  overlay: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  bannerTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 8,
  },

  bannerSubtitle: {
    color: '#f0f0f0',
    textAlign: 'center',
    marginBottom: 20,
  },

  orderButton: {
    backgroundColor: 'white',
    paddingHorizontal: 10,
  },

  buttonLabel: {
    color: '#B76E79',
    fontWeight: 'bold',
  },

  section: {
    padding: 20,
  },

  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
    color: '#333',
  },

  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },

  categoryImage: {
    width: '100%',
    height: 200,
  },

  categoryName: {
    padding: 15,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },

  loadingContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 10,
  },

  loadingText: {
    color: '#B76E79',
    fontSize: 16,
    fontWeight: '500',
  },

  noCategoriesContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 10,
  },

  noCategoriesText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },

  featureList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },

  featureItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },

  featureIcon: {
    fontSize: 18,
    color: '#B76E79',
    marginRight: 12,
    fontWeight: 'bold',
  },

  // ✅ NEW: Dots indicator for carousel
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },

  dotActive: {
    backgroundColor: '#B76E79',
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // 📱 BOTTOM NAVIGATION STYLES
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
});

export default HomeScreen;