import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUserData();
    
    // Listen for focus event to refresh when coming back to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('ProfileScreen focused - refreshing data');
      fetchUserData();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchUserData = async () => {
    try {
      // Get user data from AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log('User data loaded:', parsedUser);
        setUser(parsedUser);
      }
      setLoading(false);
    } catch (error) {
      console.log('Error fetching user data:', error);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    console.log('Refreshing user data...');
    setRefreshing(true);
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log('User data refreshed:', parsedUser);
        setUser(parsedUser);
        Alert.alert('Success', 'Profile refreshed successfully');
      }
    } catch (error) {
      console.log('Error refreshing user data:', error);
      Alert.alert('Error', 'Failed to refresh profile');
    } finally {
      setRefreshing(false);
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

  const MenuOption = ({ icon, label, onPress, isDanger = false }) => (
    <TouchableOpacity
      style={styles.menuOption}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuOptionLeft}>
        <MaterialCommunityIcons
          name={icon}
          size={24}
          color={isDanger ? '#E53935' : '#B76E79'}
        />
        <Text
          style={[
            styles.menuOptionText,
            isDanger && styles.menuOptionTextDanger,
          ]}
        >
          {label}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={isDanger ? '#E53935' : '#B76E79'}
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* USER HEADER */}
      <View style={styles.logoSection}>
                    <Text style={styles.logoText}>ROSELUXE</Text>
                  </View>
      <View style={styles.userHeader}>
        {/* Profile Image */}
        <Image
          source={{
            uri: user?.picture || 'https://i.pinimg.com/736x/4f/a9/1d/4fa91db9a2e3f4077cb29e85ab3e270c.jpg',
          }}
          style={styles.profileImage}
          onError={() => console.log('Failed to load profile image')}
        />

        {/* Name */}
        <Text style={styles.userName}>
          {user?.fullName || 'User'}
        </Text>

        {/* Email */}
        <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>

        {/* Phone and Address - Inline with separator */}
        {(user?.phone || user?.address) && (
          <View style={styles.userContactContainer}>
            {user?.phone && (
              <>
                <MaterialCommunityIcons name="phone" size={14} color="#B76E79" />
                <Text style={styles.userContactText}>{user.phone}</Text>
              </>
            )}
            
            {user?.phone && user?.address && (
              <Text style={styles.separator}>|</Text>
            )}
            
            {user?.address && (
              <>
                <MaterialCommunityIcons name="map-marker" size={14} color="#B76E79" />
                <Text style={styles.userContactText}>{user.address}</Text>
              </>
            )}
          </View>
        )}

        {/* BUTTONS ROW - Edit Profile and Refresh Icon */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="pencil" size={16} color="white" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.refreshIconButton, refreshing && styles.refreshIconButtonDisabled]}
            onPress={handleRefresh}
            disabled={refreshing}
            activeOpacity={0.8}
            title="Refresh"
          >
            <MaterialCommunityIcons 
              name="refresh" 
              size={20} 
              color="white"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* DIVIDER */}
      <Divider style={styles.divider} />

      {/* MENU SECTION */}
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Account</Text>

        <MenuOption
          icon="information"
          label="About Us"
          onPress={() => navigation.navigate('AboutUs')}
        />

        <MenuOption
          icon="history"
          label="Transaction History"
          onPress={() => navigation.navigate('TransactionHistory')}
        />
      </View>

      {/* DIVIDER */}
      <Divider style={styles.divider} />

      {/* LOGOUT BUTTON */}
      <View style={styles.menuSection}>
        <MenuOption
          icon="logout"
          label="Logout"
          onPress={handleLogout}
          isDanger={true}
        />
      </View>

      {/* EXTRA SPACING */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#FFF5F7',
    paddingBottom: 80,
  },

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
  
  loadingText: {
    fontSize: 16,
    color: '#B76E79',
    textAlign: 'center',
    marginTop: 50,
  },

  userHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
    elevation: 3,
  },

  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#B76E79',
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },

  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },

  userEmail: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },

  userContactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },

  userContactText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },

  separator: {
    fontSize: 13,
    color: '#B76E79',
    fontWeight: '300',
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
  },

  editButton: {
    flex: 1,
    backgroundColor: '#B76E79',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
  },

  editButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  refreshIconButton: {
    backgroundColor: '#B76E79',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },

  refreshIconButtonDisabled: {
    backgroundColor: '#D4938B',
    opacity: 0.7,
  },

  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 10,
  },

  menuSection: {
    backgroundColor: 'white',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },

  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B76E79',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  menuOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },

  menuOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  menuOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },

  menuOptionTextDanger: {
    color: '#E53935',
    fontWeight: '600',
  },

  bottomSpacing: {
    height: 20,
  },
});

export default ProfileScreen;