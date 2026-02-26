import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import axios from 'axios';

const TransactionHistoryScreen = ({ navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      const res = await axios.get('http://192.168.88.101/api/transactions');
      setTransactions(res.data || []);
    } catch (error) {
      console.log('Error fetching transactions:', error);
      // Mock data for demonstration
      setTransactions([
        {
          id: '1',
          orderNumber: 'ORD-2024-001',
          date: '2024-02-15',
          amount: '₱1,500.00',
          status: 'Completed',
          items: 'Red Rose Bouquet x1',
          statusColor: '#4CAF50',
        },
        {
          id: '2',
          orderNumber: 'ORD-2024-002',
          date: '2024-02-10',
          amount: '₱2,300.00',
          status: 'Completed',
          items: 'Mixed Satin Flowers x2',
          statusColor: '#4CAF50',
        },
        {
          id: '3',
          orderNumber: 'ORD-2024-003',
          date: '2024-02-05',
          amount: '₱890.00',
          status: 'Pending',
          items: 'White Lily Arrangement x1',
          statusColor: '#FFC107',
        },
        {
          id: '4',
          orderNumber: 'ORD-2024-004',
          date: '2024-01-28',
          amount: '₱3,200.00',
          status: 'Completed',
          items: 'Premium Gift Set x1',
          statusColor: '#4CAF50',
        },
        {
          id: '5',
          orderNumber: 'ORD-2024-005',
          date: '2024-01-20',
          amount: '₱1,200.00',
          status: 'Cancelled',
          items: 'Pink Rose Bundle x1',
          statusColor: '#F44336',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return 'check-circle';
      case 'Pending':
        return 'clock-outline';
      case 'Cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const TransactionCard = ({ item }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('TransactionDetail', { transaction: item })}
    >
      <View style={styles.transactionHeader}>
        <View>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <Text style={styles.orderDate}>{item.date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${item.statusColor}22` }]}>
          <MaterialCommunityIcons
            name={getStatusIcon(item.status)}
            size={16}
            color={item.statusColor}
          />
          <Text style={[styles.statusText, { color: item.statusColor }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <Divider style={styles.transactionDivider} />

      <View style={styles.transactionDetails}>
        <Text style={styles.itemsText}>Items: {item.items}</Text>
        <Text style={styles.amountText}>{item.amount}</Text>
      </View>
    </TouchableOpacity>
  );

  const FilterButton = ({ label, value }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === value && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          selectedFilter === value && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#B76E79" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* FILTER BUTTONS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        <FilterButton label="All" value="all" />
        <FilterButton label="Completed" value="completed" />
        <FilterButton label="Pending" value="pending" />
        <FilterButton label="Cancelled" value="cancelled" />
      </ScrollView>

      {/* TRANSACTIONS LIST */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B76E79" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="history"
            size={64}
            color="#ddd"
          />
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptySubtext}>
            Your purchase history will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={({ item }) => <TransactionCard item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
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

  filterContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'white',
    marginBottom: 5,
  },

  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#B76E79',
    backgroundColor: 'transparent',
  },

  filterButtonActive: {
    backgroundColor: '#B76E79',
    borderColor: '#B76E79',
  },

  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B76E79',
  },

  filterButtonTextActive: {
    color: 'white',
  },

  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 90,
  },

  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
  },

  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },

  orderDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  transactionDivider: {
    marginVertical: 8,
    backgroundColor: '#f0f0f0',
  },

  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  itemsText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },

  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B76E79',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    color: '#999',
    fontSize: 14,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },

  emptySubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default TransactionHistoryScreen;