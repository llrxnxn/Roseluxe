import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
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

  // 📸 Pick Image
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
    }
  };

  const handleSignUp = async () => {
    // Validation
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

      // Append profile image if selected
      if (profileImage) {
        formData.append('picture', {
          uri: profileImage.uri,
          type: 'image/jpeg',
          name: profileImage.filename || 'profile.jpg',
        });
      }

      const response = await axios.post(`${API_ENDPOINTS.AUTH}/register`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', response.data.message || 'Account created successfully');
      navigation.navigate('Login');
    } catch (error) {
      console.log('Registration error:', error);
      if (error.response) {
        Alert.alert('Registration Failed', error.response.data.message || 'Registration failed');
      } else {
        Alert.alert('Network Error', 'Please check your connection');
      }
    } finally {
      setLoading(false);
    }
  };

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
          <Text variant="headlineLarge" style={styles.title}>
            🌹 ROSELUXE
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Create Account
          </Text>

          {/* Google Button */}
          <TouchableOpacity style={styles.googleButton}>
            <Image
              source={{
                uri: 'https://i.pinimg.com/1200x/59/7f/11/597f11b631d7d94492f1adb95110cc44.jpg',
              }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleText}>Sign up with Google</Text>
          </TouchableOpacity>

          <View style={styles.form}>

            {/* 📸 Profile Image Upload */}
            <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
              <Image
                source={
                  profileImage
                    ? { uri: profileImage.uri }
                    : { uri: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }
                }
                style={styles.profileImage}
              />
              <Text style={styles.uploadText}>
                {profileImage ? 'Change Photo' : 'Upload Profile Photo'}
              </Text>
            </TouchableOpacity>

            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              style={styles.input}
              outlineColor="#e91e63"
              activeOutlineColor="#e91e63"
              theme={{ roundness: 20 }}
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
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              outlineColor="#e91e63"
              activeOutlineColor="#e91e63"
              theme={{ roundness: 20 }}
            />

            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off' : 'eye'}
                  onPress={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                />
              }
              outlineColor="#e91e63"
              activeOutlineColor="#e91e63"
              theme={{ roundness: 20 }}
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
              <Text variant="bodyMedium">
                Already have an account?{' '}
              </Text>
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
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  innerContainer: { paddingVertical: 40 },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#e91e63',
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#e91e63',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e20069',
    paddingVertical: 12,
    borderRadius: 30,
    marginBottom: 25,
  },
  googleIcon: { width: 24, height: 24, marginRight: 10 },
  googleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  form: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 20,
    borderRadius: 20,
    elevation: 3,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e91e63',
  },
  uploadText: {
    color: '#e91e63',
    fontWeight: '600',
  },
  input: { marginBottom: 16, backgroundColor: 'white' },
  button: {
    marginTop: 10,
    backgroundColor: '#e91e63',
    borderRadius: 20,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginLink: {
    color: '#e91e63',
    fontWeight: 'bold',
  },
});

export default RegisterScreen;