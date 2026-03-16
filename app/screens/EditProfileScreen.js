import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
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
  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);
  const [token, setToken] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // IMPORTANT: Use "token" key (matching your LoginScreen)
      const savedToken = await AsyncStorage.getItem('token');
      console.log('Token retrieved:', !!savedToken);

      if (!savedToken) {
        console.warn('No token found. User needs to login.');
        Alert.alert(
          'Session Expired',
          'Please login again.',
          [
            {
              text: 'OK',
              onPress: () => {
                AsyncStorage.multiRemove(['token', 'user']).then(() => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                });
              },
            },
          ]
        );
        return;
      }

      setToken(savedToken);

      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log('👤 User loaded:', parsedUser.fullName);

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
      console.log('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setInitialLoad(false);
    }
  };

  // ===== DETECT IMAGE MIME TYPE =====
  const detectImageMimeType = (uri) => {
    const uriParts = uri.split('.');
    const fileExtension = uriParts[uriParts.length - 1].toLowerCase();

    const mimeTypeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
      tiff: 'image/tiff',
      ico: 'image/x-icon',
      heic: 'image/heic',
    };

    return mimeTypeMap[fileExtension] || 'image/jpeg';
  };

  // ===== REQUEST CAMERA PERMISSION =====
  const requestCameraPermission = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Camera permission is required to take photos.'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Camera permission error:', error);
      return false;
    }
  };

  // ===== REQUEST MEDIA LIBRARY PERMISSION =====
  const requestMediaLibraryPermission = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Media library permission is required to access photos.'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Media library permission error:', error);
      return false;
    }
  };

  // ===== TAKE PHOTO =====
  const takePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const mimeType = detectImageMimeType(uri);

        setProfileImage({
          uri,
          type: mimeType,
          fileName: 'profile.jpg',
        });
        console.log('Photo taken successfully:', { uri, mimeType });
        setImagePickerModalVisible(false);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // ===== PICK IMAGE FROM LIBRARY =====
  const pickImage = async () => {
    try {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultiple: false,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const mimeType = detectImageMimeType(uri);

        setProfileImage({
          uri,
          type: mimeType,
          fileName: result.assets[0].fileName || 'profile.jpg',
        });
        console.log('Image selected:', { uri, mimeType });
        setImagePickerModalVisible(false);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
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
      const currentToken = token || (await AsyncStorage.getItem('token'));

      if (!currentToken) {
        Alert.alert('Error', 'Not authenticated. Please login again.');
        navigation.navigate('Login');
        setLoading(false);
        return;
      }

      console.log('Deleting account for user:', user.id);

      // Call delete account API
      const response = await axios.delete(
        `${API_ENDPOINTS.AUTH}/delete-account`,
        {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
          },
          timeout: 30000,
        }
      );

      console.log('Account deleted successfully:', response.data);

      // Clear all stored data
      await AsyncStorage.multiRemove(['token', 'user', 'refreshToken']);
      console.log('All data cleared from AsyncStorage');

      Alert.alert('Account Deleted', 'Your account has been permanently deleted.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (error) {
      console.log('Delete account error:', {
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
    if (user.address && user.address.length < 5) {
      Alert.alert('Error', 'Address must be at least 5 characters');
      return;
    }

    setLoading(true);
    try {
      // Get token from state first, fallback to AsyncStorage
      const currentToken = token || (await AsyncStorage.getItem('token'));
      console.log('Token exists:', !!currentToken);

      if (!currentToken) {
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
      console.log('Sending form data:', {
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
          type: profileImage.type || 'image/jpeg',
          name: profileImage.fileName || 'profile.jpg',
        });
        console.log('New profile image included');
      }

      // Update via API
      console.log('Calling API:', `${API_ENDPOINTS.AUTH}/update-profile`);
      console.log('Authorization header:', currentToken.substring(0, 20) + '...');

      const response = await axios.put(
        `${API_ENDPOINTS.AUTH}/update-profile`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${currentToken}`,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      console.log('Update successful:', response.data);

      // Update AsyncStorage with new user data
      const updatedUser = {
        id: response.data.user?.id || user.id,
        fullName: response.data.user?.fullName || user.fullName,
        email: response.data.user?.email || user.email,
        phone: response.data.user?.phone || user.phone,
        address: response.data.user?.address || user.address,
        picture: response.data.user?.picture || user.picture,
      };

      console.log('Saving to AsyncStorage:', updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      // Reset image selection
      setProfileImage(null);

      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error) {
      console.log('Update error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });

      let errorMessage = 'Failed to update profile';

      if (error.response) {
        // Backend returned an error
        errorMessage = error.response.data?.message || error.response.statusText || 'Update failed';
        console.log('Backend error:', errorMessage);
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'No response from server. Check your connection.';
        console.log('No server response');
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
    return 'https://i.pinimg.com/736x/4f/a9/1d/4fa91db9a2e3f4077cb29e85ab3e270c.jpg';
  };

  // ===== IMAGE PICKER MODAL COMPONENT =====
  const ImagePickerModal = () => (
    <Modal
      visible={imagePickerModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setImagePickerModalVisible(false)}
    >
      <SafeAreaView style={styles.pickerModalContainer}>
        <View style={styles.pickerModalContent}>
          <View style={styles.pickerModalHeader}>
            <Text style={styles.pickerModalTitle}>Choose Profile Photo</Text>
            <TouchableOpacity
              onPress={() => setImagePickerModalVisible(false)}
            >
              <MaterialCommunityIcons
                name="close"
                size={28}
                color="#333"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerOptionsContainer}>
            {/* TAKE PHOTO OPTION */}
            <TouchableOpacity
              style={styles.pickerOption}
              onPress={takePhoto}
            >
              <View style={styles.pickerOptionIcon}>
                <MaterialCommunityIcons
                  name="camera"
                  size={48}
                  color="#fff"
                />
              </View>
              <View style={styles.pickerOptionText}>
                <Text style={styles.pickerOptionTitle}>Take a Photo</Text>
                <Text style={styles.pickerOptionDesc}>
                  Use your camera to capture a new photo
                </Text>
              </View>
            </TouchableOpacity>

            {/* UPLOAD FROM LIBRARY OPTION */}
            <TouchableOpacity
              style={styles.pickerOption}
              onPress={pickImage}
            >
              <View style={styles.pickerOptionIcon}>
                <MaterialCommunityIcons
                  name="image-multiple"
                  size={48}
                  color="#fff"
                />
              </View>
              <View style={styles.pickerOptionText}>
                <Text style={styles.pickerOptionTitle}>Upload Photo</Text>
                <Text style={styles.pickerOptionDesc}>
                  Choose from your photo gallery
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.pickerCancelBtn}
            onPress={() => setImagePickerModalVisible(false)}
          >
            <Text style={styles.pickerCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
        <TouchableOpacity
          onPress={() => setImagePickerModalVisible(true)}
          disabled={loading}
        >
          <Image
            source={{ uri: getProfilePicture() }}
            style={styles.profileImage}
            onError={() => console.log('Failed to load profile image')}
          />
          <View style={styles.cameraButtonOverlay}>
            <MaterialCommunityIcons name="camera" size={20} color="white" />
          </View>
        </TouchableOpacity>

        {profileImage && (
          <View style={styles.imageSelectedBadge}>
            <MaterialCommunityIcons name="check" size={16} color="white" />
          </View>
        )}
      </View>

      {/* FORM SECTION */}
      <View style={styles.formSection}>
        <TextInput
          label="Full Name"
          value={user.fullName}
          onChangeText={(text) => setUser({ ...user, fullName: text })}
          placeholder="Enter your full name"
          mode="outlined"
          style={styles.input}
          outlineColor="#B76E79"
          activeOutlineColor="#B76E79"
          theme={{ roundness: 20 }}
          editable={!loading}
        />

        <TextInput
          label="Email"
          value={user.email}
          onChangeText={(text) => setUser({ ...user, email: text })}
          placeholder="Enter your email"
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          outlineColor="#B76E79"
          activeOutlineColor="#B76E79"
          theme={{ roundness: 20 }}
          editable={!loading}
        />

        <TextInput
          label="Phone Number"
          value={user.phone}
          onChangeText={(text) => setUser({ ...user, phone: text })}
          placeholder="Enter your phone number"
          mode="outlined"
          style={styles.input}
          keyboardType="phone-pad"
          outlineColor="#B76E79"
          activeOutlineColor="#B76E79"
          theme={{ roundness: 20 }}
          editable={!loading}
        />

        <TextInput
          label="Address"
          value={user.address}
          onChangeText={(text) => setUser({ ...user, address: text })}
          placeholder="Enter your address"
          mode="outlined"
          style={styles.input}
          multiline
          numberOfLines={3}
          outlineColor="#B76E79"
          activeOutlineColor="#B76E79"
          theme={{ roundness: 20 }}
          editable={!loading}
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

      {/* ===== IMAGE PICKER MODAL ===== */}
      <ImagePickerModal />
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
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#B76E79',
    backgroundColor: '#f0f0f0',
  },

  cameraButtonOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#B76E79',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    borderWidth: 2,
    borderColor: 'white',
  },

  imageSelectedBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
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

  input: {
    marginBottom: 16,
    backgroundColor: 'white',
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
    borderRadius: 20,
  },

  updateButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  deleteButton: {
    backgroundColor: '#E53935',
    marginBottom: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  deleteButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  cancelButton: {
    borderColor: '#B76E79',
    paddingVertical: 4,
    borderRadius: 20,
  },

  cancelButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B76E79',
  },

  // ========== IMAGE PICKER MODAL STYLES ==========
  pickerModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  pickerOptionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  pickerOptionIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#B76E79',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOptionText: {
    flex: 1,
  },
  pickerOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  pickerOptionDesc: {
    fontSize: 13,
    color: '#666',
  },
  pickerCancelBtn: {
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerCancelText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EditProfileScreen;