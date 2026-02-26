import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const AboutUsScreen = ({ navigation }) => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#B76E79" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* COMPANY INFO */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ROSELUXE</Text>
        <Text style={styles.description}>
          Welcome to ROSELUXE, your premier destination for exquisite satin flower arrangements. 
          We specialize in premium quality satin flowers that bring elegance and beauty to every occasion.
        </Text>
      </View>

      <Divider style={styles.divider} />

      {/* MISSION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Mission</Text>
        <Text style={styles.description}>
          To provide exceptional satin flower arrangements that celebrate life's precious moments. 
          We believe that every occasion deserves beautiful, luxurious flowers that last forever.
        </Text>
      </View>

      <Divider style={styles.divider} />

      {/* WHY CHOOSE US */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why Choose ROSELUXE?</Text>
        
        <View style={styles.featureItem}>
          <MaterialCommunityIcons name="star" size={24} color="#B76E79" />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Premium Quality</Text>
            <Text style={styles.featureDescription}>
              Handcrafted arrangements made with the finest satin materials
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <MaterialCommunityIcons name="clock-fast" size={24} color="#B76E79" />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Fast Delivery</Text>
            <Text style={styles.featureDescription}>
              Quick and secure delivery to your doorstep
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <MaterialCommunityIcons name="heart" size={24} color="#B76E79" />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Customer Care</Text>
            <Text style={styles.featureDescription}>
              24/7 customer support for your peace of mind
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <MaterialCommunityIcons name="shield-check" size={24} color="#B76E79" />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Guaranteed Satisfaction</Text>
            <Text style={styles.featureDescription}>
              Quality guaranteed or your money back
            </Text>
          </View>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* CONTACT INFO */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Us</Text>
        
        <View style={styles.contactItem}>
          <MaterialCommunityIcons name="email" size={20} color="#B76E79" />
          <Text style={styles.contactText}>roseluxe@gmail.com</Text>
        </View>

        <View style={styles.contactItem}>
          <MaterialCommunityIcons name="phone" size={20} color="#B76E79" />
          <Text style={styles.contactText}>1-800-ROSELUXE</Text>
        </View>

        <View style={styles.contactItem}>
          <MaterialCommunityIcons name="map-marker" size={20} color="#B76E79" />
          <Text style={styles.contactText}>123 Flower Street, Blooming City</Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* VERSION */}
      <View style={styles.section}>
        <Text style={styles.versionText}>ROSELUXE App v1.0.0</Text>
      </View>

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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    elevation: 2,
    marginBottom: 10,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },

  section: {
    backgroundColor: 'white',
    marginHorizontal: 10,
    marginVertical: 5,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B76E79',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },

  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 5,
  },

  featureItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },

  featureContent: {
    flex: 1,
  },

  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },

  featureDescription: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },

  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },

  contactText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },

  versionText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },

  bottomSpacing: {
    height: 20,
  },
});

export default AboutUsScreen;