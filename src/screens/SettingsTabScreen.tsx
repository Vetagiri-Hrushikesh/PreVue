import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Setting2, User, Shield, InfoCircle } from 'iconsax-react-nativejs';
import { Colors } from '../constants/colors';
import useAuth from '../hooks/useAuth';
import AuthGuard from '../components/AuthGuard';

const SettingsTabScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const settingsItems = [
    {
      title: 'Profile',
      subtitle: 'Manage your account',
      icon: User,
      onPress: () => {
        // TODO: Navigate to profile
      },
    },
    {
      title: 'Privacy & Security',
      subtitle: 'Control your privacy settings',
      icon: Shield,
      onPress: () => {
        // TODO: Navigate to privacy settings
      },
    },
    {
      title: 'About',
      subtitle: 'App version and information',
      icon: InfoCircle,
      onPress: () => {
        // TODO: Show about dialog
      },
    },
  ];

  return (
    <AuthGuard>
      <SafeAreaView style={styles.container}>

        {/* User Info */}
        <View style={styles.userInfoCard}>
          <View style={styles.userAvatar}>
            <User size={24} color={Colors.primary} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {user?.displayName || user?.email || 'User'}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Settings Items */}
        <View style={styles.settingsContainer}>
          {settingsItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.settingItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.settingIcon}>
                  <IconComponent size={20} color={Colors.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </AuthGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  userInfoCard: {
    backgroundColor: Colors.white,
    margin: 20,
    marginTop: 20,
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
    elevation: 3,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  settingsContainer: {
    margin: 20,
    marginTop: 16,
  },
  settingItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
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
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  logoutContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 100,
  },
  logoutButton: {
    backgroundColor: Colors.error,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsTabScreen;
