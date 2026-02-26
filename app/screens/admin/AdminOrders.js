import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const AdminOrders = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          labelStyle={styles.backBtn}
        >
          ← Back
        </Button>
        <Text style={styles.title}>Manage Orders</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.placeholder}>
          <MaterialCommunityIcons
            name="clipboard-list"
            size={80}
            color="#B76E79"
          />
          <Text style={styles.placeholderTitle}>Orders Management</Text>
          <Text style={styles.placeholderText}>
            Coming soon - Track and manage customer orders
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { color: '#B76E79' },
  title: { fontSize: 18, fontWeight: '700', color: '#333', flex: 1, textAlign: 'center' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  placeholder: { alignItems: 'center' },
  placeholderTitle: { fontSize: 22, fontWeight: '700', color: '#333', marginTop: 16 },
  placeholderText: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' },
});

export default AdminOrders;
