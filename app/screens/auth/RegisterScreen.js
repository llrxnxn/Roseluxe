import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { API_ENDPOINTS } from '../../config/api';

const RegisterScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);

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

  // ===== SIGNUP =====
  const handleSignUp = async () => {
    if (!fullName || !email || !password || !confirmPassword || !phone || !address) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('email', email.toLowerCase());
      formData.append('password', password);
      formData.append('phone', phone);
      formData.append('address', address);

      if (profileImage) {
        formData.append('picture', {
          uri: profileImage.uri,
          type: profileImage.type || 'image/jpeg',
          name: profileImage.fileName || 'profile.jpg',
        });
      }

      const response = await axios.post(`${API_ENDPOINTS.AUTH}/register`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', response.data.message || 'Account created successfully');
      navigation.navigate('Login');
    } catch (error) {
      console.log('Registration error:', error);
      if (error.response) {
        Alert.alert(
          'Registration Failed',
          error.response.data.message || 'Registration failed'
        );
      } else {
        Alert.alert('Network Error', 'Please check your connection');
      }
    } finally {
      setLoading(false);
    }
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

  return (
    <ImageBackground
      source={{
        uri: 'https://i.pinimg.com/736x/47/04/96/470496e82495d5914d1a5aa92f807b62.jpg',
      }}
      style={styles.background}
      resizeMode="cover"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.innerContainer}>
          <Text variant="headlineLarge" style={styles.title}>🌹 ROSELUXE</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>Create Account</Text>

          <View style={styles.form}>
            {/* ===== PROFILE IMAGE ===== */}
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={() => setImagePickerModalVisible(true)}
            >
              <Image
                source={
                  profileImage
                    ? { uri: profileImage.uri }
                    : { uri: 'https://i.pinimg.com/736x/4f/a9/1d/4fa91db9a2e3f4077cb29e85ab3e270c.jpg' }
                }
                style={styles.profileImage}
              />
            </TouchableOpacity>

            {/* ===== FORM FIELDS ===== */}
            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              style={styles.input}
              outlineColor="#e91e63"
              activeOutlineColor="#e91e63"
              theme={{ roundness: 20 }}
              editable={!loading}
            />
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              outlineColor="#e91e63"
              activeOutlineColor="#e91e63"
              theme={{ roundness: 20 }}
              editable={!loading}
            />
            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
              outlineColor="#e91e63"
              activeOutlineColor="#e91e63"
              theme={{ roundness: 20 }}
              editable={!loading}
            />
            <TextInput
              label="Address"
              value={address}
              onChangeText={setAddress}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={2}
              outlineColor="#e91e63"
              activeOutlineColor="#e91e63"
              theme={{ roundness: 20 }}
              editable={!loading}
            />
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
              outlineColor="#e91e63"
              activeOutlineColor="#e91e63"
              theme={{ roundness: 20 }}
              editable={!loading}
            />
            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              right={<TextInput.Icon icon={showConfirmPassword ? 'eye-off' : 'eye'} onPress={() => setShowConfirmPassword(!showConfirmPassword)} />}
              outlineColor="#e91e63"
              activeOutlineColor="#e91e63"
              theme={{ roundness: 20 }}
              editable={!loading}
            />

            <Button
              mode="contained"
              onPress={handleSignUp}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={{ paddingVertical: 8 }}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>

            <View style={styles.loginContainer}>
              <Text variant="bodyMedium">Already have an account? </Text>
              <Text
                variant="bodyMedium"
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
              >
                Login
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ===== IMAGE PICKER MODAL ===== */}
      <ImagePickerModal />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 },
  innerContainer: { paddingVertical: 40 },
  title: { textAlign: 'center', marginBottom: 8, color: '#e91e63', fontWeight: 'bold' },
  subtitle: { textAlign: 'center', marginBottom: 30, color: '#e91e63' },
  form: { backgroundColor: 'rgba(255,255,255,0.9)', padding: 20, borderRadius: 20, elevation: 3 },
  imageContainer: { alignItems: 'center', marginBottom: 20 },
  profileImage: { width: 110, height: 110, borderRadius: 55, marginBottom: 8, borderWidth: 2, borderColor: '#e91e63' },
  uploadText: { color: '#e91e63', fontWeight: '600' },
  input: { marginBottom: 16, backgroundColor: 'white' },
  button: { marginTop: 10, backgroundColor: '#e91e63', borderRadius: 20 },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginLink: { color: '#e91e63', fontWeight: 'bold' },

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
    backgroundColor: '#e91e63',
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

export default RegisterScreen;