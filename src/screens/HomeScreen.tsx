import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Chart, Chart2, Eye, Mobile } from 'iconsax-react-nativejs';
import { Colors } from '../constants/colors';
import useAuth from '../hooks/useAuth';
import useApps from '../hooks/useApps';
import AuthGuard from '../components/AuthGuard';

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const { apps } = useApps();

  // Calculate analytics
  const totalApps = apps.length;
  const activeApps = apps.filter(app => !app.isDeleted && !app.isArchived).length;
  const totalViews = apps.reduce((sum, app) => sum + (app.views || 0), 0);

  const analyticsData = [
    {
      title: 'Total Apps',
      value: totalApps.toString(),
      icon: Mobile,
      color: Colors.primary,
    },
    {
      title: 'Active Apps',
      value: activeApps.toString(),
      icon: Chart,
      color: Colors.success,
    },
    {
      title: 'Total Views',
      value: totalViews.toString(),
      icon: Eye,
      color: Colors.warning,
    },
    {
      title: 'Analytics',
      value: 'Live',
      icon: Chart2,
      color: Colors.secondary,
    },
  ];

  return (
    <AuthGuard>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.displayName || user?.email || 'User'}</Text>
          </View>

          {/* Analytics Grid */}
          <View style={styles.analyticsContainer}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.analyticsGrid}>
              {analyticsData.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <View key={index} style={styles.analyticsCard}>
                    <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                      <IconComponent size={24} color={item.color} />
                    </View>
                    <Text style={styles.analyticsValue}>{item.value}</Text>
                    <Text style={styles.analyticsTitle}>{item.title}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={styles.quickActionCard}>
                <View style={[styles.quickActionIcon, { backgroundColor: Colors.primary + '20' }]}>
                  <Eye size={20} color={Colors.primary} />
                </View>
                <Text style={styles.quickActionText}>View Apps</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickActionCard}>
                <View style={[styles.quickActionIcon, { backgroundColor: Colors.success + '20' }]}>
                  <Chart size={20} color={Colors.success} />
                </View>
                <Text style={styles.quickActionText}>Analytics</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.recentActivityContainer}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityCard}>
              <Text style={styles.activityText}>
                {totalApps > 0 
                  ? `You have ${totalApps} app${totalApps === 1 ? '' : 's'} in your collection`
                  : 'No apps found. Check out your apps in the My Apps tab.'
                }
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuthGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  analyticsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  analyticsCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  analyticsTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  quickActionsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  recentActivityContainer: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  activityCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

export default HomeScreen;