import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { workoutService, WorkoutLog, WeeklySummary as WeeklySummaryData } from '../services/workout/workoutService';
import { trainingService, Training } from '../services/training/trainingService';
import { QuickStartCard } from '../components/QuickStartCard';
import { WeeklySummary } from '../components/WeeklySummary';
import { ActivityCalendar } from '../components/ActivityCalendar';
import { LastWorkoutCard } from '../components/LastWorkoutCard';

interface DashboardProps {
  onTrainingPress: () => void;
  onProfilePress: () => void;
  onQuickStart: (trainingId: string) => void;
  onSelectTraining: (trainingId: string) => void;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia!';
  if (hour < 18) return 'Boa tarde!';
  return 'Boa noite!';
};

export const Dashboard: React.FC<DashboardProps> = ({
  onTrainingPress,
  onProfilePress,
  onQuickStart,
  onSelectTraining,
}) => {
  const insets = useSafeAreaInsets();
  const [lastWorkout, setLastWorkout] = useState<WorkoutLog | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummaryData>({ workouts: 0, totalSeconds: 0, totalSets: 0 });
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set());
  const [favorites, setFavorites] = useState<Training[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();

  const loadData = useCallback(async () => {
    const [last, summary, days, favs] = await Promise.all([
      workoutService.getLastWorkout(),
      workoutService.getWeeklySummary(),
      workoutService.getMonthActivity(now.getFullYear(), now.getMonth()),
      trainingService.getFavorites(),
    ]);
    setLastWorkout(last);
    setWeeklySummary(summary);
    setActiveDays(days);
    setFavorites(favs);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const hasHistory = lastWorkout !== null;

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={[styles.safeArea, { paddingTop: insets.top + 16 }]}>
        <StatusBar style="light" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.headerTitle}>NextPace</Text>
            </View>
            <TouchableOpacity onPress={onProfilePress} style={styles.profileButton}>
              <Ionicons name="person-circle-outline" size={36} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Quick Start / CTA Principal */}
          <View style={styles.section}>
            <QuickStartCard
              onGoToTrainings={onTrainingPress}
            />
          </View>

          {/* Favoritos */}
          {favorites.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Favoritos</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.favoritesScroll}
              >
                {favorites.map((fav) => (
                  <TouchableOpacity
                    key={fav.id}
                    style={styles.favoriteCard}
                    onPress={() => onQuickStart(fav.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.favoriteName} numberOfLines={1}>{fav.name}</Text>
                    <Text style={styles.favoriteInfo}>
                      {(fav.exercises?.filter(e => e.type !== 'rest').length || 0) * (fav.rounds || 1)} exercícios
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Resumo Semanal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Esta semana</Text>
            <WeeklySummary summary={weeklySummary} />
          </View>

          {/* Calendário de Atividade */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Atividade</Text>
            <ActivityCalendar
              activeDays={activeDays}
              year={now.getFullYear()}
              month={now.getMonth()}
            />
          </View>

          {/* Último Treino */}
          {lastWorkout && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Último treino</Text>
              <LastWorkoutCard
                workout={lastWorkout}
                onPress={onSelectTraining}
              />
            </View>
          )}

        </ScrollView>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 4,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  favoritesScroll: {
    gap: 12,
  },
  favoriteCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    width: 150,
    gap: 6,
  },
  favoriteName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  favoriteInfo: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
