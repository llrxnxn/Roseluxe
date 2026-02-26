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
import HeaderScreen from './HeaderScreen';

const { width } = Dimensions.get('window');

const CartScreen = ({ navigation }) => {
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState('cart');
  const [userImage, setUserImage] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCart();
      checkLoginStatus();
    });
    return unsubscribe;
  }, [navigation]);

  // ✅ Load cart from AsyncStorage
  const loadCart = async () => {
    try {
      const savedCart = await AsyncStorage.getItem('cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (error) {
      console.log('Error loading cart:', error);
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
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.log('Error checking login:', error);
    }
  };

  // ✅ Update item quantity
  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;

    const updatedCart = cart.map((item) =>
      item._id === productId ? { ...item, quantity: newQuantity } : item
    );

    setCart(updatedCart);
    await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  // ✅ Remove item from cart
  const removeFromCart = async (productId) => {
    const updatedCart = cart.filter((item) => item._id !== productId);
    setCart(updatedCart);
    await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
    Alert.alert('Removed', 'Item removed from cart');
  };

  // ✅ Calculate totals
  const calculateTotals = () => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const shipping = 0; // Free shipping
    const total = subtotal + shipping;

    return { subtotal, shipping, total };
  };

  // ✅ Handle checkout
  const handleCheckout = () => {
    if (!isLoggedIn) {
      Alert.alert(
        'Login Required',
        'Please login to proceed with checkout',
        [
          { text: 'Cancel' },
          {
            text: 'Login',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
      return;
    }

    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart');
      return;
    }

    // TODO: Navigate to checkout/payment screen
    Alert.alert('Coming Soon', 'Checkout functionality coming soon!');
  };

  // ✅ Render cart item
  const renderCartItem = ({ item }) => {
    const itemTotal = item.price * item.quantity;

    return (
      <View style={styles.cartItem}>
        {/* Image */}
        <Image
          source={{ uri: item.images?.[0] || 'https://via.placeholder.com/80' }}
          style={styles.cartItemImage}
        />

        {/* Item Details */}
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.itemCategory}>{item.category}</Text>
          <Text style={styles.itemPrice}>₱{item.price?.toFixed(2)}</Text>
        </View>

        {/* Quantity & Price */}
        <View style={styles.itemActions}>
          <View style={styles.quantityControl}>
            <TouchableOpacity
              onPress={() => updateQuantity(item._id, item.quantity - 1)}
              style={styles.qtyBtn}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{item.quantity}</Text>
            <TouchableOpacity
              onPress={() => updateQuantity(item._id, item.quantity + 1)}
              style={styles.qtyBtn}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.itemTotal}>
            ₱{itemTotal?.toFixed(2)}
          </Text>

          <TouchableOpacity
            onPress={() => removeFromCart(item._id)}
            style={styles.removeBtn}
          >
            <MaterialCommunityIcons name="trash-can" size={18} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const { subtotal, shipping, total } = calculateTotals();

  return (
    <View style={styles.mainContainer}>
      {/* Header with Search - Hidden for Cart */}
      <HeaderScreen
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={() => {}}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {cart.length > 0 ? (
          <>
            <ScrollView contentContainerStyle={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Shopping Cart</Text>
                <Text style={styles.itemCount}>{cart.length} items</Text>
              </View>

              {/* Cart Items */}
              <FlatList
                data={cart}
                renderItem={renderCartItem}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
              />

              {/* Summary */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>
                    ₱{subtotal?.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping</Text>
                  <Text style={styles.summaryValue}>
                    {shipping === 0 ? 'FREE' : `₱${shipping?.toFixed(2)}`}
                  </Text>
                </View>

                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>₱{total?.toFixed(2)}</Text>
                </View>
              </View>
            </ScrollView>

            {/* Checkout Button */}
            <View style={styles.checkoutContainer}>
              <Button
                mode="contained"
                onPress={handleCheckout}
                style={styles.checkoutBtn}
                labelStyle={styles.checkoutBtnLabel}
              >
                Proceed to Checkout
              </Button>

              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Products')}
                style={styles.continueBtnBtn}
              >
                Continue Shopping
              </Button>
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
              onPress={() => navigation.navigate('Products')}
              style={styles.emptyBtn}
            >
              Continue Shopping
            </Button>
          </View>
        )}
      </SafeAreaView>
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
    paddingBottom: 20,
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

  listContent: {
    padding: 12,
  },

  cartItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    alignItems: 'center',
  },

  cartItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },

  itemDetails: {
    flex: 1,
  },

  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },

  itemCategory: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },

  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B76E79',
  },

  itemActions: {
    alignItems: 'flex-end',
    gap: 8,
  },

  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 4,
  },

  qtyBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  qtyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B76E79',
  },

  qtyValue: {
    marginHorizontal: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },

  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },

  removeBtn: {
    padding: 6,
  },

  summaryContainer: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    borderRadius: 10,
    padding: 16,
    elevation: 2,
    marginTop: 12,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },

  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 0,
  },

  totalLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '700',
  },

  totalValue: {
    fontSize: 18,
    color: '#B76E79',
    fontWeight: '700',
  },

  checkoutContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },

  checkoutBtn: {
    backgroundColor: '#B76E79',
    paddingVertical: 8,
  },

  checkoutBtnLabel: {
    fontSize: 16,
    fontWeight: '700',
  },

  continueBtnBtn: {
    borderColor: '#B76E79',
    paddingVertical: 8,
  },

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
    minWidth: 200,
  },
});

export default CartScreen;