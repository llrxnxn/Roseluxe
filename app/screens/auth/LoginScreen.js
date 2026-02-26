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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../../config/api';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(`${API_ENDPOINTS.AUTH}/login`, {
        email,
        password,
      });

      const { token, user, message } = response.data;

      console.log('✅ Login successful');
      console.log('📝 User role:', user.role);
      console.log('👤 User name:', user.fullName);

      // Save token with Bearer prefix for future requests
      await AsyncStorage.setItem('authToken', `Bearer ${token}`);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      Alert.alert('Success', message || 'Login successful');

      // ✅ ROLE-BASED NAVIGATION
      if (user.role === 'admin') {
        // Admin user - navigate to admin dashboard
        console.log('🔐 Admin user detected - navigating to AdminDashboard');
        navigation.replace('AdminDashboard');
      } else {
        // Regular user - navigate to home
        console.log('👥 Regular user detected - navigating to Home');
        navigation.replace('Home');
      }
    } catch (error) {
      console.log('Login error:', error);
      if (error.response) {
        Alert.alert('Login Failed', error.response.data.message || 'Invalid credentials');
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
            Flower Shop
          </Text>

          {/* Google Login Button (UI only for now) */}
          <TouchableOpacity style={styles.googleButton}>
            <Image
              source={{
                uri: 'https://i.pinimg.com/1200x/59/7f/11/597f11b631d7d94492f1adb95110cc44.jpg',
              }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleText}>Login with Google</Text>
          </TouchableOpacity>

          <View style={styles.form}>
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
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              outlineColor="#e91e63"
              activeOutlineColor="#e91e63"
              theme={{ roundness: 20 }}
              editable={!loading}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={{ paddingVertical: 8 }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>

            <View style={styles.signupContainer}>
              <Text variant="bodyMedium">
                Don't have an account?{' '}
              </Text>
              <Text
                variant="bodyMedium"
                style={styles.signupLink}
                onPress={() => navigation.navigate('Register')}
              >
                Sign Up
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  innerContainer: {
    paddingVertical: 40,
  },
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
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
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
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  button: {
    marginTop: 10,
    backgroundColor: '#e91e63',
    borderRadius: 20,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupLink: {
    color: '#e91e63',
    fontWeight: 'bold',
  },
});

export default LoginScreen;