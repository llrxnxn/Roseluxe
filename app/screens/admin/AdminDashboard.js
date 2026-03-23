import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text, Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import AdminHeader from './AdminHeader';
import AdminService from '../../utils/AdminService';
import ExportReport from '../../utils/ExportReport';

const { width } = Dimensions.get('window');

export default function AdminDashboard({ navigation }) {
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalCategories: 0,
    ordersByStatus: {
      pending: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    },
    monthlyOrderData: [0, 0, 0, 0, 0, 0],
    users: [],
    products: [],
    categories: [],
    orders: [],
  });

  useEffect(() => {
    loadUserData();
    fetchDashboardData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');

      if (userData) {
        const userObj = JSON.parse(userData);
        setUser(userObj);

        // Verify user is admin
        if (userObj.role !== 'admin') {
          Alert.alert('Access Denied', 'You do not have admin privileges');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        }
      }
    } catch (error) {
      console.log('Error loading user data:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all required data in parallel
      const dashData = await AdminService.getDashboardData();

      // Extract arrays safely with defaults
      const users = dashData?.users?.users || [];
      const products = dashData?.products?.products || [];
      const categories = dashData?.categories?.categories || [];
      const orders = Array.isArray(dashData?.orders?.orders)
      ? dashData.orders.orders
      : [];

      console.log('[Dashboard] Processing data:', {
        users: users.length,
        products: products.length,
        categories: categories.length,
        orders: orders.length,
      });

      const stats = {
        totalUsers: users.length,
        totalProducts: products.length,
        totalOrders: orders.length,
        totalCategories: categories.length,
        ordersByStatus: {
          pending: orders.filter(o => o?.orderStatus === 'pending').length,
          shipped: orders.filter(o => o?.orderStatus === 'shipped').length,
          delivered: orders.filter(o => o?.orderStatus === 'delivered').length,
          cancelled: orders.filter(o => o?.orderStatus === 'cancelled').length,
        },
        monthlyOrderData: calculateMonthlyOrders(orders),
        users,
        products,
        categories,
        orders,
      };

      console.log('[Dashboard] Stats calculated:', stats);
      setDashboardData(prev => ({
        ...prev,
        ...stats,
      }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyOrders = (orders) => {
  if (!Array.isArray(orders)) return [0, 0, 0, 0, 0, 0];

  const months = [0, 0, 0, 0, 0, 0];
  const now = new Date();

  orders.forEach(order => {
    if (!order?.createdAt) return;

    const orderDate = new Date(order.createdAt);

    const diffMonths =
      (now.getFullYear() - orderDate.getFullYear()) * 12 +
      (now.getMonth() - orderDate.getMonth());

    if (diffMonths >= 0 && diffMonths < 6) {
      months[5 - diffMonths] += 1;
    }
  });

  return months;
};

  const exportReport = async () => {
  try {
    setExporting(true);
    // Ensure all required data is present
    const dataToExport = {
      ...dashboardData,
      totalUsers: dashboardData.totalUsers,
      totalProducts: dashboardData.totalProducts,
      totalOrders: dashboardData.totalOrders,
      totalCategories: dashboardData.totalCategories,
    };
    
    const result = await ExportReport.exportToPDF(dataToExport);
    
    Alert.alert(
      'Success',
      'Report exported successfully!'
    );
  } catch (error) {
    console.error('Export error:', error);
    Alert.alert('Error', 'Failed to export report: ' + error.message);
  } finally {
    setExporting(false);
  }
};

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        onPress: () => {},
      },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          } catch (error) {
            console.log('Logout error:', error);
          }
        },
      },
    ]);
  };

  const navigateTo = (screenName) => {
    if (screenName === 'logout') {
      handleLogout();
      return;
    }

    if (screenName === 'overview') {
      setActiveTab('overview');
      return;
    }

    setActiveTab(screenName);
    navigation.navigate(screenName);
  };

  const menuItems = [
    {
      label: 'Overview',
      icon: 'view-dashboard',
      onPress: () => navigateTo('overview'),
    },
    {
      label: 'Users',
      icon: 'account-multiple',
      onPress: () => navigateTo('AdminUsers'),
    },
    {
      label: 'Products',
      icon: 'flower',
      onPress: () => navigateTo('AdminProducts'),
    },
    {
      label: 'Categories',
      icon: 'tag-multiple',
      onPress: () => navigateTo('AdminCategories'),
    },
    {
      label: 'Discounts',
      icon: 'percent',
      onPress: () => navigateTo('AdminDiscounts'),
    },
    {
      label: 'Orders',
      icon: 'clipboard-list',
      onPress: () => navigateTo('AdminOrders'),
    },
    {
      label: 'Reviews',
      icon: 'star',
      onPress: () => navigateTo('AdminReviews'),
    },
    {
      label: 'Logout',
      icon: 'logout',
      onPress: () => navigateTo('logout'),
    },
  ];

  const stats = [
    {
      icon: 'package-variant',
      label: 'Products',
      value: dashboardData.totalProducts.toString(),
      color: '#E8A4B0',
      bgColor: '#FFE8ED',
    },
    {
      icon: 'account-multiple',
      label: 'Users',
      value: dashboardData.totalUsers.toString(),
      color: '#B76E79',
      bgColor: '#FFD4E5',
    },
    {
      icon: 'cart-outline',
      label: 'Orders',
      value: dashboardData.totalOrders.toString(),
      color: '#9B5568',
      bgColor: '#FFC0D9',
    },
    {
      icon: 'tag-multiple',
      label: 'Categories',
      value: dashboardData.totalCategories.toString(),
      color: '#7A3D52',
      bgColor: '#FFACC7',
    },
  ];

  const getLast6Months = () => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i);
      months.push(d.toLocaleString('default', { month: 'short' }));
    }

    return months;
  };

  const lineChartData = {
  labels: getLast6Months(),
  datasets: [
    {
      data: dashboardData.monthlyOrderData || [0, 0, 0, 0, 0, 0],
      color: (opacity = 1) => `rgba(183, 110, 121, ${opacity})`,
      strokeWidth: 3,
    },
  ],
};

  const pieChartData = [
  {
    name: 'Pending',
    population: dashboardData.ordersByStatus?.pending || 0,
    color: '#FFA726',
  },
  {
    name: 'Shipped',
    population: dashboardData.ordersByStatus?.shipped || 0,
    color: '#42A5F5',
  },
  {
    name: 'Delivered',
    population: dashboardData.ordersByStatus?.delivered || 0,
    color: '#66BB6A',
  },
  {
    name: 'Cancelled',
    population: dashboardData.ordersByStatus?.cancelled || 0,
    color: '#EF5350',
  },
];

  const StatCard = ({ icon, label, value, color, bgColor }) => (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={20} color="white" />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B76E79" />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AdminHeader
        menuItems={menuItems}
        onMenuPress={(isOpen) => setIsMenuOpen(isOpen)}
      />

      <View style={styles.mainContent}>
        <ScrollView
          style={styles.contentArea}
          contentContainerStyle={styles.contentContainer}
          scrollEnabled={!isMenuOpen}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchDashboardData().then(() => setRefreshing(false));
              }}
              colors={['#B76E79']}
            />
          }
        >
          {activeTab === 'overview' && (
            <>
              <View style={styles.welcomeSection}>
                <View style={styles.welcomeContent}>
                  <Text style={styles.welcomeTitle}>Dashboard Overview</Text>
                  <Text style={styles.welcomeSubtitle}>
                    Welcome, {user?.fullName || 'Admin'}
                  </Text>
                </View>
                <Text style={styles.flowerEmoji}>🌹</Text>
              </View>

              <View style={styles.statsGrid}>
                {stats.map((stat, index) => (
                  <View key={index} style={styles.statGridItem}>
                    <StatCard {...stat} />
                  </View>
                ))}
              </View>

              <View style={styles.analyticsHeader}>
                <Text style={styles.analyticsTitle}>Analytics</Text>
                <TouchableOpacity 
                  style={styles.exportButton}
                  onPress={exportReport}
                  disabled={exporting}
                >
                  <MaterialCommunityIcons name="file-pdf-box" size={18} color="white" />
                  <Text style={styles.exportButtonText}>
                    {exporting ? 'EXPORTING...' : 'EXPORT REPORT'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.chartsSection}>
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Orders Per Month</Text>
                  <LineChart
                    data={lineChartData}
                    width={width - 48}
                    height={220}
                    chartConfig={{
                      backgroundColor: 'white',
                      backgroundGradientFrom: 'white',
                      backgroundGradientTo: 'white',
                      color: (opacity = 1) =>
                        `rgba(183, 110, 121, ${opacity})`,
                      strokeWidth: 2,
                      decimalPlaces: 0,
                      useShadowColorFromDataset: false,
                    }}
                    formatYLabel={(y) => Math.round(y).toString()}
                    bezier
                    style={styles.lineChart}
                  />
                </View>

                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Order Status</Text>
                  {(dashboardData.ordersByStatus.pending +
                    dashboardData.ordersByStatus.shipped +
                    dashboardData.ordersByStatus.delivered +
                    dashboardData.ordersByStatus.cancelled) > 0 ? (
                    <View style={styles.pieChartContainer}>
                      <PieChart
                        data={pieChartData.filter(item => item.population > 0).map(item => ({
                          ...item,
                          name: `${item.name}\n(${item.population})`
                        }))}
                        width={width - 48}
                        height={220}
                        chartConfig={{
                          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        }}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="10"
                        absolute
                        style={styles.pieChart}
                      />
                    </View>
                  ) : (
                    <View style={styles.emptyChart}>
                      <Text style={styles.emptyChartText}>No orders yet</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.bottomPadding} />
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#B76E79',
  },

  mainContent: {
    flex: 1,
    width: '100%',
  },

  contentArea: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FAFAFA',
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: '#FFF5F7',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#B76E79',
    borderWidth: 1,
    borderTopColor: '#FFE8ED',
    borderRightColor: '#FFE8ED',
    borderBottomColor: '#FFE8ED',
  },

  welcomeContent: {
    flex: 1,
  },

  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },

  welcomeSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  flowerEmoji: {
    fontSize: 36,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
    justifyContent: 'space-between',
  },

  statGridItem: {
    width: '48%',
  },

  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },

  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statContent: {
    flex: 1,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },

  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
  },

  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  analyticsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },

  exportButton: {
    flexDirection: 'row',
    backgroundColor: '#B76E79',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },

  exportButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },

  chartsSection: {
    gap: 12,
    marginBottom: 18,
  },

  chartCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 14,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F0E6EB',
  },

  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },

  lineChart: {
    borderRadius: 8,
  },

  pieChartContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },

  pieChart: {
    borderRadius: 8,
  },

  emptyChart: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },

  emptyChartText: {
    fontSize: 14,
    color: '#999',
  },

  bottomPadding: {
    height: 30,
  },
});