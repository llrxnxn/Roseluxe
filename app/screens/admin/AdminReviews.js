import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AdminHeader from './AdminHeader';

const AdminReviews = ({ navigation }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Menu items configuration
  const menuItems = [
    {
      label: 'Overview',
      icon: 'view-dashboard',
      onPress: () => navigation.navigate('AdminDashboard'),
    },
    {
      label: 'Users',
      icon: 'account-multiple',
      onPress: () => navigation.navigate('AdminUsers'),
    },
    {
      label: 'Products',
      icon: 'flower',
      onPress: () => navigation.navigate('AdminProducts'),
    },
    {
      label: 'Categories',
      icon: 'tag-multiple',
      onPress: () => navigation.navigate('AdminCategories'),
    },
    {
      label: 'Orders',
      icon: 'clipboard-list',
      onPress: () => navigation.navigate('AdminOrders'),
    },
    {
      label: 'Reviews',
      icon: 'star',
      onPress: () => navigation.navigate('AdminReviews'),
    },
    {
      label: 'Logout',
      icon: 'logout',
      onPress: async () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
          { text: 'Cancel' },
          {
            text: 'Logout',
            onPress: async () => {
              try {
                await AsyncStorage.removeItem('authToken');
                await AsyncStorage.removeItem('user');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                });
              } catch (error) {
                console.log('Logout error:', error);
              }
            },
          },
        ]);
      },
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <AdminHeader
        menuItems={menuItems}
        onMenuPress={(isOpen) => setIsMenuOpen(isOpen)}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        scrollEnabled={!isMenuOpen}
      >
        <View style={styles.placeholder}>
          <MaterialCommunityIcons
            name="star"
            size={80}
            color="#B76E79"
          />
          <Text style={styles.placeholderTitle}>Reviews Management</Text>
          <Text style={styles.placeholderText}>
            Coming soon - Monitor customer reviews and ratings
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  placeholder: { alignItems: 'center' },
  placeholderTitle: { fontSize: 22, fontWeight: '700', color: '#333', marginTop: 16 },
  placeholderText: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' },
});

export default AdminReviews;