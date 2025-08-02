import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { Metric } from '../types/navigation';

interface MetricCardProps {
  metric: Metric;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  const IconComponent = metric.icon;
  
  return (
    <View style={styles.metricCard}>
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

const styles = StyleSheet.create({
  metricCard: {
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
});

export default MetricCard; 