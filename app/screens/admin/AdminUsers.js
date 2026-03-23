import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Text, Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AdminHeader from './AdminHeader';
import { API_ENDPOINTS } from '../../config/api';

// Helper function to generate initials
const getInitials = (fullName) => {
  if (!fullName) return 'U';
  return fullName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Helper function to get avatar background color
const getAvatarColor = (fullName) => {
  const colors = ['#E8C1C5', '#D4A5AB', '#C08A93', '#A8717B', '#905663'];
  const charCode = (fullName || '').charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

export default function AdminUsers({ navigation }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('role');
  const [loading, setLoading] = useState(true);

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
      label: 'Discounts',
      icon: 'percent',
      onPress: () => navigation.navigate('AdminDiscounts'),
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

  /* ================= LOAD USERS ================= */

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(API_ENDPOINTS.USERS, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        const usersArray = Array.isArray(data) ? data : data.users;

        setUsers(usersArray || []);
        setFilteredUsers(usersArray || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  /* ================= SEARCH ================= */

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(
      (user) =>
        user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  /* ================= UPDATE ROLE ================= */

  const handleRoleChange = async (newRole) => {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(
        `${API_ENDPOINTS.USERS}/${selectedUser._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: newRole.toLowerCase() }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        fetchUsers();
        setModalVisible(false);
        Alert.alert('Success', 'User role updated');
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update role');
    }
  };

  /* ================= UPDATE STATUS ================= */

  const handleStatusChange = async (newStatus) => {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(
        `${API_ENDPOINTS.USERS}/${selectedUser._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isActive: newStatus === 'Active' ? true : false,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        fetchUsers();
        setModalVisible(false);
        Alert.alert('Success', 'User status updated');
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  /* ================= UI ================= */

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AdminHeader
          menuItems={menuItems}
          onMenuPress={(isOpen) => setIsMenuOpen(isOpen)}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B76E79" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AdminHeader
        menuItems={menuItems}
        onMenuPress={(isOpen) => setIsMenuOpen(isOpen)}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} scrollEnabled={!isMenuOpen}>
        {/* Header Section */}
        <Text style={styles.pageTitle}>Users Management</Text>
        <Text style={styles.pageSubtitle}>
          Total Users: {users.length}
        </Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color="#999"
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#CCC"
          />
        </View>

        {/* Users List */}
        {filteredUsers.map((user) => (
          <Card key={user._id} style={styles.userCard}>
            <Card.Content style={styles.cardContent}>
              {/* User Header with Avatar and Name */}
              <View style={styles.userHeader}>
                {user.picture ? (
                  <Image
                    source={{ uri: user.picture }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: getAvatarColor(user.fullName) },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {getInitials(user.fullName)}
                    </Text>
                  </View>
                )}

                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.fullName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Role Section */}
              <TouchableOpacity
                style={styles.infoCard}
                onPress={() => {
                  setSelectedUser(user);
                  setModalType('role');
                  setModalVisible(true);
                }}
              >
                <View style={styles.infoContent}>
                  <View style={styles.iconContainer}>
                    <MaterialCommunityIcons
                      name="account-tie"
                      size={20}
                      color="#B76E79"
                    />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Role</Text>
                    <Text style={styles.infoValue}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#999"
                />
              </TouchableOpacity>

              {/* Status Section */}
              <TouchableOpacity
                style={styles.infoCard}
                onPress={() => {
                  setSelectedUser(user);
                  setModalType('status');
                  setModalVisible(true);
                }}
              >
                <View style={styles.infoContent}>
                  <View style={styles.iconContainer}>
                    <View
                      style={[
                        styles.statusIndicator,
                        {
                          backgroundColor: user.isActive
                            ? '#4CAF50'
                            : '#999',
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <Text style={styles.infoValue}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#999"
                />
              </TouchableOpacity>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {modalType === 'role' ? 'Change Role' : 'Change Status'}
            </Text>

            {modalType === 'role' ? (
              <>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={() => handleRoleChange('Admin')}
                >
                  <Text style={styles.modalOption}>Admin</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={() => handleRoleChange('Customer')}
                >
                  <Text style={styles.modalOption}>Customer</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={() => handleStatusChange('Active')}
                >
                  <Text style={styles.modalOption}>Active</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={() => handleStatusChange('Inactive')}
                >
                  <Text style={styles.modalOption}>Inactive</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  pageSubtitle: {
    color: '#999',
    fontSize: 14,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
  userCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#FFF',
    borderWidth: 0,
  },
  cardContent: {
    padding: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5E8EA',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#F0DCE0',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOptionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginBottom: 10,
  },
  modalOption: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 14,
    marginTop: 10,
  },
  cancelText: {
    fontSize: 16,
    color: '#B76E79',
    fontWeight: '600',
    textAlign: 'center',
  },

  // ========== LOADING ==========
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});