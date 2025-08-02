import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  Chart,
  Eye,
  User,
  Home,
  Settings,
  Mobile,
} from 'iconsax-react-nativejs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Metric, App } from '../types/navigation';
import { Colors } from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const { width } = Dimensions.get('window');

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const metrics: Metric[] = [
    {
      title: 'Conversions',
      value: '2,847',
      change: '+12.5%',
      icon: Chart,
      color: Colors.success,
      bgColor: '#E8F5E8',
    },
    {
      title: 'Users',
      value: '1,234',
      change: '+8.2%',
      icon: User,
      color: Colors.primary,
      bgColor: '#E3F2FD',
    },
  ];

  const recentApps: App[] = [
    {
      id: 'AwesomeProject',
      name: 'Awesome Project',
      lastPreviewed: '2 hours ago',
      previews: 12,
      rating: 4.8,
    },
  ];

  const handlePreviewApp = async (appId: string) => {
    setIsLoading(true);
    try {
      // Add a small delay to ensure the native component is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      navigation.navigate('Preview', { appId });
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'settings') {
      navigation.navigate('Settings');
    }
  };

  const renderMetricCard = (metric: Metric) => {
    const IconComponent = metric.icon;
    return (
      <View key={metric.title} style={styles.metricCard}>
        <View style={[styles.metricIcon, { backgroundColor: metric.bgColor }]}>
          <IconComponent size={24} color={metric.color} />
        </View>
        <View style={styles.metricContent}>
          <Text style={styles.metricValue}>{metric.value}</Text>
          <Text style={styles.metricTitle}>{metric.title}</Text>
          <Text style={[styles.metricChange, { color: metric.color }]}>
            {metric.change}
          </Text>
        </View>
      </View>
    );
  };

  const renderAppCard = (app: App) => (
    <View key={app.id} style={styles.appCard}>
      <View style={styles.appInfo}>
        <View style={styles.appIcon}>
          <Mobile size={32} color={Colors.primary} />
        </View>
        <View style={styles.appDetails}>
          <Text style={styles.appName}>{app.name}</Text>
          <View style={styles.appStats}>
            <View style={styles.statItem}>
              <Eye size={16} color={Colors.textSecondary} />
              <Text style={styles.statText}>{app.previews} previews</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statText}>• {app.lastPreviewed}</Text>
            </View>
          </View>
        </View>
      </View>
      <Pressable
        style={[styles.previewButton, isLoading && styles.previewButtonDisabled]}
        onPress={() => handlePreviewApp(app.id)}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.previewButtonText}>Preview</Text>
        )}
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PreVue</Text>
        <Pressable onPress={() => navigation.replace('Login')} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Metrics */}
        <View style={styles.metricsContainer}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.metricsGrid}>
            {metrics.map(renderMetricCard)}
          </View>
        </View>

        {/* Apps Section */}
        <View style={styles.appsSection}>
          <Text style={styles.sectionTitle}>Preview Your Apps</Text>
          {recentApps.map(renderAppCard)}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable 
          style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}
          onPress={() => handleTabPress('home')}
        >
          <Home size={24} color={activeTab === 'home' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>Home</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.navItem, activeTab === 'settings' && styles.navItemActive]}
          onPress={() => handleTabPress('settings')}
        >
          <Settings size={24} color={activeTab === 'settings' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.navText, activeTab === 'settings' && styles.navTextActive]}>Settings</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  logoutButton: {
    backgroundColor: Colors.gray[100],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  logoutText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  metricsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  metricTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metricChange: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  appsSection: {
    padding: 20,
    paddingBottom: 100, // Space for bottom nav
  },
  appCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  appDetails: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  appStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  previewButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  previewButtonDisabled: {
    backgroundColor: Colors.gray[400],
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    // Active state styling
  },
  navText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  navTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default HomeScreen; 