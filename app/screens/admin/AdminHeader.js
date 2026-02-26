import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function AdminHeader({ onMenuPress }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleMenuPress = () => {
    setMenuOpen(!menuOpen);
    onMenuPress?.(!menuOpen);
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.hamburgerBtn}
        onPress={handleMenuPress}
      >
        <MaterialCommunityIcons
          name={menuOpen ? 'close' : 'menu'}
          size={28}
          color="#B76E79"
        />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>🌹 ROSELUXE</Text>
      
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6EB',
    elevation: 2,
  },

  hamburgerBtn: {
    padding: 6,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B76E79',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  notificationBtn: {
    position: 'relative',
    padding: 6,
  },

  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF6B9D',
  },
});