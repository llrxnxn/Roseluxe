import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');
const MENU_WIDTH = width * 0.7; // 70% of screen width

export default function AdminHeader({ onMenuPress, menuItems = [] }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleMenuPress = () => {
    setMenuOpen(!menuOpen);
    onMenuPress?.(!menuOpen);
  };

  const handleMenuItemPress = (item) => {
    if (item.onPress) {
      item.onPress();
    }
    setMenuOpen(false);
    onMenuPress?.(false);
  };

  const handleCloseMenu = () => {
    setMenuOpen(false);
    onMenuPress?.(false);
  };

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={handleMenuPress}
        >
          <MaterialCommunityIcons
            name="menu"
            size={28}
            color="#B76E79"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>🌹 ROSELUXE</Text>

        <View style={styles.spacer} />
      </View>

      {/* Modal Menu */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseMenu}
      >
        {/* Semi-transparent overlay */}
        <TouchableWithoutFeedback onPress={handleCloseMenu}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        {/* Menu Panel */}
        <View style={[styles.menuPanel, { width: MENU_WIDTH }]}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleCloseMenu}
          >
            <MaterialCommunityIcons
              name="close"
              size={28}
              color="#B76E79"
            />
          </TouchableOpacity>

          {/* Menu Items - Scrollable */}
          <ScrollView style={styles.menuContent} showsVerticalScrollIndicator={false}>
            {menuItems && menuItems.length > 0 ? (
              menuItems.map((item, index) => (
                <TouchableOpacity
                  key={`menu-item-${index}`}
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress(item)}
                  activeOpacity={0.6}
                >
                  {item.icon && (
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={24}
                      color="#B76E79"
                      style={styles.menuItemIcon}
                    />
                  )}
                  <Text style={styles.menuItemText}>{item.label}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>No menu items</Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
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

  menuBtn: {
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

  spacer: {
    width: 40,
  },

  // Modal Styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  menuPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  closeBtn: {
    padding: 12,
    alignSelf: 'flex-start',
  },

  menuContent: {
    flex: 1,
    paddingTop: 10,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6EB',
  },

  menuItemIcon: {
    marginRight: 12,
  },

  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },

  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});