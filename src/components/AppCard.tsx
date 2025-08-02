import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Mobile, Calendar, Eye, Star } from 'iconsax-react-nativejs';
import { Colors } from '../constants/colors';
import { App } from '../types/navigation';

interface AppCardProps {
  app: App;
  onPreview: (appId: string) => void;
}

const AppCard: React.FC<AppCardProps> = ({ app, onPreview }) => {
  return (
    <View style={styles.appCard}>
      <View style={styles.appInfo}>
        <View style={styles.appIcon}>
          <Mobile size={32} color={Colors.primary} />
        </View>
        <View style={styles.appDetails}>
          <Text style={styles.appName}>{app.name}</Text>
          <View style={styles.appStats}>
            <View style={styles.statItem}>
              <Calendar size={16} color={Colors.textSecondary} />
              <Text style={styles.statText}>{app.lastPreviewed}</Text>
            </View>
            <View style={styles.statItem}>
              <Eye size={16} color={Colors.textSecondary} />
              <Text style={styles.statText}>{app.previews} previews</Text>
            </View>
            <View style={styles.statItem}>
              <Star size={16} color="#FFD700" />
              <Text style={styles.statText}>{app.rating}</Text>
            </View>
          </View>
        </View>
      </View>
      <Pressable
        style={styles.previewButton}
        onPress={() => onPreview(app.id)}
      >
        <Text style={styles.previewButtonText}>Preview</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
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
    gap: 16,
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
    paddingVertical: 8,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default AppCard; 