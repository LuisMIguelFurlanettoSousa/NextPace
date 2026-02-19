import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { WeeklySummary as WeeklySummaryData } from '../services/workout/workoutService';

interface WeeklySummaryProps {
  summary: WeeklySummaryData;
}

const formatDuration = (totalSeconds: number): string => {
  if (totalSeconds === 0) return '0m';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0 && mins > 0) return `${hours}h${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ summary }) => {
  const stats = [
    {
      value: String(summary.workouts),
      label: 'treinos',
      icon: 'fitness-outline' as const,
      color: colors.primary,
    },
    {
      value: formatDuration(summary.totalSeconds),
      label: 'tempo',
      icon: 'time-outline' as const,
      color: colors.secondary,
    },
    {
      value: String(summary.totalSets),
      label: 'séries',
      icon: 'layers-outline' as const,
      color: colors.success,
    },
  ];

  return (
    <View style={styles.container}>
      {stats.map((stat, index) => (
        <View key={stat.label} style={styles.statCard}>
          <Ionicons name={stat.icon} size={18} color={stat.color} style={styles.icon} />
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  icon: {
    marginBottom: 8,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
