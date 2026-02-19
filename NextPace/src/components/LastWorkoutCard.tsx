import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { WorkoutLog } from '../services/workout/workoutService';

interface LastWorkoutCardProps {
  workout: WorkoutLog;
  onPress: (trainingId: string) => void;
}

const getRelativeDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `Há ${weeks} semana${weeks > 1 ? 's' : ''}`;
  const months = Math.floor(diffDays / 30);
  return `Há ${months} mês${months > 1 ? 'es' : ''}`;
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && mins > 0) return `${hours}h${mins}min`;
  if (hours > 0) return `${hours}h`;
  return `${mins}min`;
};

export const LastWorkoutCard: React.FC<LastWorkoutCardProps> = ({ workout, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => onPress(workout.trainingId)}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        </View>
        <Text style={styles.name} numberOfLines={1}>{workout.trainingName}</Text>
        <Text style={styles.date}>{getRelativeDate(workout.completedAt)}</Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.statText}>{formatDuration(workout.durationSeconds)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Ionicons name="layers-outline" size={14} color={colors.textMuted} />
          <Text style={styles.statText}>{workout.setsCompleted} séries</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Ionicons name="fitness-outline" size={14} color={colors.textMuted} />
          <Text style={styles.statText}>{workout.exercisesCompleted} exercícios</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 10,
  },
  name: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    color: colors.textMuted,
    fontSize: 13,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  statText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: colors.cardBorder,
  },
});
