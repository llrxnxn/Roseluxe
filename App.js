import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider } from 'react-redux';
import store from './app/redux/store';

import HomeScreen from './app/screens/HomeScreen';
import ProductScreen from './app/screens/ProductScreen';
import LoginScreen from './app/screens/auth/LoginScreen';
import RegisterScreen from './app/screens/auth/RegisterScreen';
import ProfileScreen from './app/screens/ProfileScreen';
import EditProfileScreen from './app/screens/EditProfileScreen';
import AboutUsScreen from './app/screens/AboutUsScreen';
import OrdersScreen from './app/screens/OrderScreen';
import CartScreen from './app/screens/CartScreen';
import WishlistScreen from './app/screens/WishlistScreen';
import CheckoutScreen from './app/screens/CheckoutScreen';

import AdminDashboard from './app/screens/admin/AdminDashboard';
import AdminProducts from './app/screens/admin/AdminProduct';
import AdminOrders from './app/screens/admin/AdminOrders';
import AdminCategories from './app/screens/admin/AdminCategories';
import AdminReviews from './app/screens/admin/AdminReviews';
import AdminAddProduct from './app/screens/admin/AdminAddProducts';
import AdminUsers from './app/screens/admin/AdminUsers';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const user = await AsyncStorage.getItem('user');

        if (token && user) {
          const parsedUser = JSON.parse(user);
          
          if (parsedUser.role === 'admin') {
            setInitialRoute('AdminDashboard');
            console.log('Admin detected - setting initial route to AdminDashboard');
          } else {
            setInitialRoute('Home');
            console.log('Customer detected - setting initial route to Home');
          }
        } else {
          setInitialRoute('Login');
          console.log('No user found - setting initial route to Login');
        }
      } catch (error) {
        console.log('Error checking user role:', error);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    };

    checkUserRole();
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute}
      >
        {/* Auth Screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* Customer Screens */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Products" component={ProductScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="AboutUs" component={AboutUsScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Wishlist" component={WishlistScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="Orders" component={OrdersScreen} />

        {/* Admin Screens */}
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="AdminUsers" component={AdminUsers} />
        <Stack.Screen name="AdminProducts" component={AdminProducts} />
        <Stack.Screen name="AdminOrders" component={AdminOrders} />
        <Stack.Screen name="AdminReviews" component={AdminReviews} />
        <Stack.Screen name="AdminAddProduct" component={AdminAddProduct} options={{ presentation: 'modal' }}/>
        <Stack.Screen name="AdminCategories" component={AdminCategories} options={{ presentation: 'card' }}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <RootNavigator />
    </Provider>
  );
}