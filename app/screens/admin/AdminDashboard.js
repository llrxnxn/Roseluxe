import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Text, Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import AdminHeader from './AdminHeader';

const { width } = Dimensions.get('window');

export default function AdminDashboard({ navigation }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const sidebarAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    Animated.timing(sidebarAnim, {
      toValue: sidebarOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [sidebarOpen]);

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

  const navigateTo = (tab, screenName) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    if (screenName) {
      navigation.navigate(screenName);
    }
  };

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

  const SidebarItem = ({ icon, label, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.sidebarItemContent}>
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={isActive ? '#B76E79' : '#999'}
        />
        <Text
          style={[
            styles.sidebarItemText,
            isActive && styles.sidebarItemTextActive,
          ]}
        >
          {label}
        </Text>
      </View>
      {isActive && <View style={styles.sidebarIndicator} />}
    </TouchableOpacity>
  );

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

  const sidebarTranslate = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-280, 0],
  });

  const overlayOpacity = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <AdminHeader onMenuPress={setSidebarOpen} />

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        <ScrollView
          style={styles.contentArea}
          contentContainerStyle={styles.contentContainer}
          scrollEnabled={!sidebarOpen}
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
                  <Text style={styles.chartTitle}>📊 Orders Per Month</Text>
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

        {/* Overlay */}
        {sidebarOpen && (
          <TouchableOpacity
            style={[styles.overlay, { opacity: overlayOpacity }]}
            activeOpacity={1}
            onPress={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Animated.View
          style={[
            styles.sidebar,
            { transform: [{ translateX: sidebarTranslate }] },
          ]}
        >
          <View style={styles.userCard}>
            <View style={styles.userAvatarContainer}>
              <Text style={styles.userAvatar}>👨‍💼</Text>
            </View>
            <View style={styles.userCardContent}>
              <Text style={styles.userCardName}>WELCOME BACK!</Text>
              <Text style={styles.userCardNameValue}>
                {user?.fullName || 'Admin'}
              </Text>
              <Text style={styles.userCardEmail}>
                {user?.email || 'admin@roseluxe.com'}
              </Text>
            </View>
          </View>

          <View style={styles.sidebarDivider} />

          <SidebarItem
            icon="view-dashboard"
            label="Overview"
            isActive={activeTab === 'overview'}
            onPress={() => navigateTo('overview')}
          />
          <SidebarItem
            icon="account-multiple"
            label="Users"
            isActive={activeTab === 'users'}
            onPress={() => navigateTo('users', 'AdminUsers')}
          />
          <SidebarItem
            icon="flower"
            label="Products"
            isActive={activeTab === 'products'}
            onPress={() => navigateTo('products', 'AdminProducts')}
          />
          <SidebarItem
            icon="tag-multiple"
            label="Categories"
            isActive={activeTab === 'categories'}
            onPress={() => navigateTo('categories', 'AdminCategories')}
          />
          <SidebarItem
            icon="clipboard-list"
            label="Orders"
            isActive={activeTab === 'orders'}
            onPress={() => navigateTo('orders', 'AdminOrders')}
          />
          <SidebarItem
            icon="star"
            label="Reviews"
            isActive={activeTab === 'reviews'}
            onPress={() => navigateTo('reviews', 'AdminReviews')}
          />

          <View style={styles.sidebarDivider} />

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="logout" size={20} color="white" />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
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

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 10,
  },

  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: 'white',
    paddingVertical: 16,
    zIndex: 20,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },

  userCard: {
    marginHorizontal: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#FFF5F7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE8ED',
  },

  userAvatarContainer: {
    marginBottom: 10,
  },

  userAvatar: {
    fontSize: 36,
  },

  userCardContent: {
    gap: 3,
  },

  userCardName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 0.5,
  },

  userCardNameValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },

  userCardEmail: {
    fontSize: 12,
    color: '#B76E79',
    fontWeight: '500',
  },

  sidebarDivider: {
    height: 1,
    backgroundColor: '#F0E6EB',
    marginVertical: 12,
  },

  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginHorizontal: 8,
    marginVertical: 3,
    borderRadius: 8,
  },

  sidebarItemActive: {
    backgroundColor: '#FFF5F7',
  },

  sidebarItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  sidebarItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },

  sidebarItemTextActive: {
    color: '#B76E79',
    fontWeight: '700',
  },

  sidebarIndicator: {
    width: 3,
    height: 22,
    backgroundColor: '#B76E79',
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginHorizontal: 8,
    marginTop: 8,
    backgroundColor: '#D8A0AC',
    borderRadius: 8,
    justifyContent: 'center',
  },

  logoutBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
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