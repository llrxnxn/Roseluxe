import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Alert,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Navigation = ({ 
  navigation, 
  currentScreen,
  isLoggedIn,
  userImage,
  cartCount = 0,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (drawerOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [drawerOpen, slideAnim]);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (error) {
      console.log('Error fetching user data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          onPress: () => null,
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('user');
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('token');
              setDrawerOpen(false);
              setUser(null);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            } catch (error) {
              console.log('Error logging out:', error);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  const handleDrawerNavigation = (screenName) => {
    setDrawerOpen(false);
    if (screenName === 'logout') {
      handleLogout();
    } else if (screenName === 'login') {
      navigation.navigate('Login');
    } else if (screenName === 'profile') {
      if (isLoggedIn) {
        navigation.navigate('Profile');
      } else {
        navigation.navigate('Login');
      }
    } else {
      navigation.navigate(screenName);
    }
  };

  const handleNavigation = (screenName) => {
    switch (screenName) {
      case 'Home':
        navigation.navigate('Home');
        break;
      case 'Products':
        navigation.navigate('Products');
        break;
      case 'Cart':
        if (isLoggedIn) {
          navigation.navigate('Cart');
        } else {
          Alert.alert('Login Required', 'Please login first');
          navigation.navigate('Login');
        }
        break;
      case 'Wishlist':
        navigation.navigate('Wishlist');
        break;
      default:
        break;
    }
  };

  const NavItem = ({ name, icon, onPress }) => {
    const isActive = currentScreen === name;

    return (
      <TouchableOpacity
        style={styles.navItem}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.navIconContainer,
            isActive && styles.navIconActive,
          ]}
        >
          <View style={styles.iconWithBadge}>
            <MaterialCommunityIcons
              name={icon}
              size={24}
              color={isActive ? '#B76E79' : '#666'}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const DrawerMenuItem = ({ icon, label, onPress, isDanger = false }) => (
    <TouchableOpacity
      style={[styles.drawerMenuItem, isDanger && styles.drawerMenuItemDanger]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={isDanger ? '#E53935' : '#B76E79'}
      />
      <Text style={[styles.drawerMenuText, isDanger && styles.drawerMenuTextDanger]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      {/* DRAWER OVERLAY BACKDROP */}
      {drawerOpen && (
        <TouchableOpacity
          style={styles.drawerBackdrop}
          activeOpacity={1}
          onPress={() => setDrawerOpen(false)}
        />
      )}

      {/* ANIMATED DRAWER FROM RIGHT */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* USER HEADER */}
            <View style={styles.logoSection}>
            <Text style={styles.logoText}>ROSELUXE</Text>
            </View>

        <View style={styles.drawerHeader}>
          <TouchableOpacity
            onPress={() => setDrawerOpen(false)}
            style={styles.drawerCloseBtn}
          >
            <MaterialCommunityIcons name="close" size={24} color="#B76E79" />
          </TouchableOpacity>
          <Text style={styles.drawerTitle}>MENU</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.drawerUserInfo}>
          <Image
            source={{
              uri: userImage || user?.picture || 'https://i.pinimg.com/736x/4f/a9/1d/4fa91db9a2e3f4077cb29e85ab3e270c.jpg',
            }}
            style={styles.drawerUserImage}
            onError={() => console.log('User image failed to load')}
          />
          <View style={styles.drawerUserTextContainer}>
            <Text style={styles.drawerUserName} numberOfLines={1}>
              {user?.fullName || 'Guest User'}
            </Text>
            <Text style={styles.drawerUserEmail} numberOfLines={1}>
              {user?.email || 'Not logged in'}
            </Text>
          </View>
        </View>

        {/* Drawer Menu Items */}
        <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
          {/* Show these items only if logged in */}
          {isLoggedIn && (
            <>
              <DrawerMenuItem
                icon="account-circle"
                label="My Profile"
                onPress={() => handleDrawerNavigation('profile')}
              />

              <DrawerMenuItem
                icon="package"
                label="My Orders"
                onPress={() => handleDrawerNavigation('TransactionHistory')}
              />
            </>
          )}

          <DrawerMenuItem
            icon="information"
            label="About Us"
            onPress={() => handleDrawerNavigation('AboutUs')}
          />

          {isLoggedIn && (
            <DrawerMenuItem
              icon="bell"
              label="Notifications"
              onPress={() => handleDrawerNavigation('Notifications')}
            />
          )}


          <View style={styles.drawerDivider} />

          {/* Show Login/Signup if NOT logged in, Show Logout if logged in */}
          {isLoggedIn ? (
            <DrawerMenuItem
              icon="logout"
              label="Logout"
              onPress={() => handleDrawerNavigation('logout')}
              isDanger={true}
            />
          ) : (
            <DrawerMenuItem
              icon="login"
              label="Login / Sign Up"
              onPress={() => handleDrawerNavigation('login')}
            />
          )}
        </ScrollView>
      </Animated.View>

      {/* BOTTOM NAVIGATION */}
      <View style={styles.bottomNav}>
        <NavItem
          name="Home"
          icon="home"
          onPress={() => handleNavigation('Home')}
        />
        <NavItem
          name="Products"
          icon="flower"
          onPress={() => handleNavigation('Products')}
        />
        <NavItem
          name="Cart"
          icon="cart"
          onPress={() => handleNavigation('Cart')}
        />
        <NavItem
          name="Wishlist"
          icon="heart"
          onPress={() => handleNavigation('Wishlist')}
        />

        {/* MENU BUTTON */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setDrawerOpen(!drawerOpen)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.navIconContainer,
              drawerOpen && styles.navIconActive,
            ]}
          >
            <MaterialCommunityIcons
              name="menu"
              size={24}
              color={drawerOpen ? '#B76E79' : '#666'}
            />
          </View>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
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
  /* DRAWER STYLES */
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 98,
  },

  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 300,
    height: '100%',
    backgroundColor: '#fff',
    elevation: 10,
    zIndex: 99,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    paddingTop: 0,
  },

  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF5F7',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE8ED',
  },

  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B76E79',
    letterSpacing: 1,
  },

  drawerCloseBtn: {
    padding: 4,
  },

  drawerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF5F7',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE8ED',
    gap: 12,
  },

  drawerUserImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#B76E79',
    backgroundColor: '#f0f0f0',
  },

  drawerUserTextContainer: {
    flex: 1,
  },

  drawerUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },

  drawerUserEmail: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },

  drawerContent: {
    paddingVertical: 12,
    flex: 1,
  },

  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },

  drawerMenuItemDanger: {
    backgroundColor: '#FFF3E0',
  },

  drawerMenuText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },

  drawerMenuTextDanger: {
    color: '#E53935',
    fontWeight: '600',
  },

  drawerDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
    marginHorizontal: 16,
  },

  /* BOTTOM NAVIGATION STYLES */
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
    zIndex: 100,
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

  iconWithBadge: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});

export default Navigation;