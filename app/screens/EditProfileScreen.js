import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const EditProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState({
    id: '',
    fullName: '',
    email: '',
    phone: '',
    address: '',
    picture: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log('✅ Loaded user data:', parsedUser);
        setUser({
          id: parsedUser.id || parsedUser._id || '',
          fullName: parsedUser.fullName || '',
          email: parsedUser.email || '',
          phone: parsedUser.phone || '',
          address: parsedUser.address || '',
          picture: parsedUser.picture || '',
        });
      } else {
        Alert.alert('Error', 'No user data found. Please login again.');
        navigation.goBack();
      }
    } catch (error) {
      console.log('❌ Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setInitialLoad(false);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow access to gallery');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0]);
      console.log('✅ Image selected:', result.assets[0].uri);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Delete cancelled'),
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            // Second confirmation
            Alert.alert(
              'Confirm Delete',
              'All your data will be permanently removed. Continue?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Delete',
                  onPress: () => performDeleteAccount(),
                  style: 'destructive',
                },
              ]
            );
          },
          style: 'destructive',
        },
      ]
    );
  };

  const performDeleteAccount = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        Alert.alert('Error', 'Not authenticated. Please login again.');
        navigation.navigate('Login');
        setLoading(false);
        return;
      }

      console.log('🗑️ Deleting account for user:', user.id);

      // Call delete account API
      const response = await axios.delete(
        `${API_ENDPOINTS.AUTH}/delete-account`,
        {
          headers: {
            'Authorization': token,
          },
          timeout: 30000,
        }
      );

      console.log('✅ Account deleted successfully:', response.data);

      // Clear all stored data
      await AsyncStorage.multiRemove(['authToken', 'user', 'refreshToken']);
      console.log('💾 All data cleared from AsyncStorage');

      Alert.alert('Account Deleted', 'Your account has been permanently deleted.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (error) {
      console.log('❌ Delete account error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      let errorMessage = 'Failed to delete account';

      if (error.response) {
        errorMessage = error.response.data?.message || 'Account deletion failed';
      } else if (error.request) {
        errorMessage = 'No response from server. Check your connection.';
      } else if (error.message === 'Network Error') {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      Alert.alert('Deletion Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    // Validation - All fields required for delivery
    if (!user.fullName || !user.email || !user.phone || !user.address) {
      Alert.alert('Error', 'Please fill in all required fields:\n• Full Name\n• Email\n• Phone Number\n• Address');
      return;
    }

    // Additional validation for phone
    if (user.phone && user.phone.length < 7) {
      Alert.alert('Error', 'Phone number must be at least 7 digits');
      return;
    }

    // Additional validation for address
    if (user.address && user.address.length < 10) {
      Alert.alert('Error', 'Address must be at least 10 characters');
      return;
    }

    setLoading(true);
    try {
      // Get auth token
      const token = await AsyncStorage.getItem('authToken');
      console.log('🔐 Token exists:', !!token);
      
      if (!token) {
        Alert.alert('Error', 'Not authenticated. Please login again.');
        navigation.navigate('Login');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('fullName', user.fullName);
      formData.append('email', user.email.toLowerCase());
      formData.append('phone', user.phone);
      formData.append('address', user.address);

      // Log form data
      console.log('📤 Sending form data:', {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        hasNewImage: !!profileImage,
      });

      // Append new image if selected
      if (profileImage) {
        formData.append('picture', {
          uri: profileImage.uri,
          type: 'image/jpeg',
          name: profileImage.filename || 'profile.jpg',
        });
        console.log('📸 New profile image included');
      }

      // Update via API
      console.log('🌐 Calling API:', `${API_ENDPOINTS.AUTH}/update-profile`);
      console.log('🔑 Authorization header:', token.substring(0, 20) + '...');

      const response = await axios.put(
        `${API_ENDPOINTS.AUTH}/update-profile`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': token,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      console.log('✅ Update successful:', response.data);

      // Update AsyncStorage with new user data
      const updatedUser = {
        id: response.data.user?.id || user.id,
        fullName: response.data.user?.fullName || user.fullName,
        email: response.data.user?.email || user.email,
        phone: response.data.user?.phone || user.phone,
        address: response.data.user?.address || user.address,
        picture: response.data.user?.picture || user.picture,
      };

      console.log('💾 Saving to AsyncStorage:', updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      // Reset image selection
      setProfileImage(null);

      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error) {
      console.log('❌ Update error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });

      let errorMessage = 'Failed to update profile';

      if (error.response) {
        // Backend returned an error
        errorMessage = error.response.data?.message || error.response.statusText || 'Update failed';
        console.log('📡 Backend error:', errorMessage);
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'No response from server. Check your connection.';
        console.log('📡 No server response');
      } else if (error.message === 'Network Error') {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      Alert.alert('Update Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getProfilePicture = () => {
    if (profileImage) return profileImage.uri;
    if (user.picture) return user.picture;
    return 'https://via.placeholder.com/100?text=User';
  };

  const InputField = ({ label, value, onChangeText, placeholder, multiline = false, required = false }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label}
        {required && <Text style={styles.requiredAsterisk}> *</Text>}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        editable={!loading}
        placeholderTextColor="#ccc"
      />
    </View>
  );

  if (initialLoad) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#B76E79" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* PROFILE IMAGE SECTION */}
      <View style={styles.profileSection}>
        <Image
          source={{ uri: getProfilePicture() }}
          style={styles.profileImage}
          onError={() => console.log('Failed to load profile image')}
        />
        <TouchableOpacity 
          style={styles.cameraButton}
          onPress={pickImage}
          disabled={loading}
        >
          <MaterialCommunityIcons name="camera" size={20} color="white" />
        </TouchableOpacity>
        {profileImage && (
          <View style={styles.imageSelectedBadge}>
            <MaterialCommunityIcons name="check" size={16} color="white" />
          </View>
        )}
      </View>

      {/* FORM SECTION */}
      <View style={styles.formSection}>
        <InputField
          label="Full Name"
          value={user.fullName}
          onChangeText={(text) => setUser({ ...user, fullName: text })}
          placeholder="Enter your full name"
          required={true}
        />

        <InputField
          label="Email"
          value={user.email}
          onChangeText={(text) => setUser({ ...user, email: text })}
          placeholder="Enter your email"
          required={true}
        />

        <InputField
          label="Phone Number"
          value={user.phone}
          onChangeText={(text) => setUser({ ...user, phone: text })}
          placeholder="Enter your phone number"
          required={true}
        />

        <InputField
          label="Address"
          value={user.address}
          onChangeText={(text) => setUser({ ...user, address: text })}
          placeholder="Enter your address"
          multiline={true}
          required={true}
        />

        {/* INFO BOX */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information" size={20} color="#B76E79" />
          <Text style={styles.infoText}>
            All fields are required for delivery orders
          </Text>
        </View>

        {/* UPDATE BUTTON */}
        <Button
          mode="contained"
          onPress={handleUpdateProfile}
          loading={loading}
          disabled={loading}
          style={styles.updateButton}
          labelStyle={styles.updateButtonLabel}
        >
          {loading ? 'Updating...' : 'Update Profile'}
        </Button>

        {/* DELETE ACCOUNT BUTTON */}
        <Button
          mode="contained"
          onPress={handleDeleteAccount}
          loading={loading}
          disabled={loading}
          style={styles.deleteButton}
          labelStyle={styles.deleteButtonLabel}
        >
          Delete Account
        </Button>

        {/* CANCEL BUTTON */}
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          disabled={loading}
          style={styles.cancelButton}
          labelStyle={styles.cancelButtonLabel}
        >
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#FFF5F7',
    paddingBottom: 80,
  },

  loadingText: {
    fontSize: 16,
    color: '#B76E79',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    elevation: 2,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },

  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    marginTop: 1,
    position: 'relative',
  },

  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#B76E79',
    backgroundColor: '#f0f0f0',
  },

  cameraButton: {
    position: 'absolute',
    bottom: 30,
    right: '35%',
    backgroundColor: '#B76E79',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },

  imageSelectedBadge: {
    position: 'absolute',
    bottom: 25,
    right: '33%',
    backgroundColor: '#4CAF50',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },

  formSection: {
    padding: 20,
  },

  inputContainer: {
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  requiredAsterisk: {
    color: '#E53935',
    fontWeight: 'bold',
  },

  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },

  inputMultiline: {
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#B76E79',
  },

  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },

  updateButton: {
    backgroundColor: '#B76E79',
    marginBottom: 12,
    paddingVertical: 8,
  },

  updateButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  deleteButton: {
    backgroundColor: '#E53935',
    marginBottom: 12,
    paddingVertical: 8,
  },

  deleteButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  cancelButton: {
    borderColor: '#B76E79',
  },

  cancelButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B76E79',
  },
});

export default EditProfileScreen;