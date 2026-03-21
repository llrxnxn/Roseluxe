import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Text, Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import AdminHeader from './AdminHeader';

const { width } = Dimensions.get('window');

export default function AdminDashboard({ navigation }) {
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.log('Error loading user data:', error);
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
            await AsyncStorage.removeItem('authToken');
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

  // Menu items configuration
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
      value: '156',
      color: '#E8A4B0',
      bgColor: '#FFE8ED',
    },
    {
      icon: 'account-multiple',
      label: 'Users',
      value: '89',
      color: '#B76E79',
      bgColor: '#FFD4E5',
    },
    {
      icon: 'cart-outline',
      label: 'Orders',
      value: '342',
      color: '#9B5568',
      bgColor: '#FFC0D9',
    },
    {
      icon: 'currency-php',
      label: 'Sales',
      value: '₱45.2K',
      color: '#7A3D52',
      bgColor: '#FFACC7',
    },
  ];

  const lineChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [30, 45, 32, 56, 48, 72],
        color: (opacity = 1) => `rgba(183, 110, 121, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const pieChartData = [
    {
      name: 'Pending',
      value: 45,
      color: '#FFB3D9',
      legendFontColor: '#7F8C8D',
      legendFontSize: 11,
    },
    {
      name: 'Shipped',
      value: 120,
      color: '#E8A4B0',
      legendFontColor: '#7F8C8D',
      legendFontSize: 11,
    },
    {
      name: 'Delivered',
      value: 156,
      color: '#B76E79',
      legendFontColor: '#7F8C8D',
      legendFontSize: 11,
    },
    {
      name: 'Cancelled',
      value: 21,
      color: '#9B5568',
      legendFontColor: '#7F8C8D',
      legendFontSize: 11,
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with new modal menu */}
      <AdminHeader
        menuItems={menuItems}
        onMenuPress={(isOpen) => setIsMenuOpen(isOpen)}
      />

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        <ScrollView
          style={styles.contentArea}
          contentContainerStyle={styles.contentContainer}
          scrollEnabled={!isMenuOpen}
        >
          {activeTab === 'overview' && (
            <>
              <View style={styles.welcomeSection}>
                <View style={styles.welcomeContent}>
                  <Text style={styles.welcomeTitle}>Dashboard Overview</Text>
                  <Text style={styles.welcomeSubtitle}>
                    Your ROSELUXE admin center
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
                      barPercentage: 0.5,
                      useShadowColorFromDataset: false,
                    }}
                    bezier
                    style={styles.lineChart}
                  />
                </View>

                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>📦 Order Status</Text>
                  <PieChart
                    data={pieChartData}
                    width={width - 48}
                    height={180}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor="value"
                    backgroundColor="white"
                    paddingLeft="10"
                    style={styles.pieChart}
                  />
                </View>
              </View>

              <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>Quick Summary</Text>

                <View style={styles.summaryCardsContainer}>
                  <Card style={styles.summaryCard}>
                    <Card.Content>
                      <View style={styles.summaryCardRow}>
                        <MaterialCommunityIcons
                          name="package-variant-closed"
                          size={24}
                          color="#B76E79"
                        />
                        <View style={styles.summaryCardText}>
                          <Text style={styles.summaryCardLabel}>
                            New Orders Today
                          </Text>
                          <Text style={styles.summaryCardValue}>12</Text>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>

                  <Card style={styles.summaryCard}>
                    <Card.Content>
                      <View style={styles.summaryCardRow}>
                        <MaterialCommunityIcons
                          name="currency-php"
                          size={24}
                          color="#B76E79"
                        />
                        <View style={styles.summaryCardText}>
                          <Text style={styles.summaryCardLabel}>
                            Today's Revenue
                          </Text>
                          <Text style={styles.summaryCardValue}>₱3.2K</Text>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>

                  <Card style={styles.summaryCard}>
                    <Card.Content>
                      <View style={styles.summaryCardRow}>
                        <MaterialCommunityIcons
                          name="account-plus"
                          size={24}
                          color="#B76E79"
                        />
                        <View style={styles.summaryCardText}>
                          <Text style={styles.summaryCardLabel}>
                            New Customers
                          </Text>
                          <Text style={styles.summaryCardValue}>5</Text>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
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

  pieChart: {
    borderRadius: 8,
  },

  summarySection: {
    marginBottom: 18,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },

  summaryCardsContainer: {
    gap: 10,
  },

  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0E6EB',
    elevation: 1,
    paddingVertical: 2,
  },

  summaryCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  summaryCardText: {
    flex: 1,
  },

  summaryCardLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },

  summaryCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B76E79',
    marginTop: 2,
  },

  bottomPadding: {
    height: 30,
  },
});