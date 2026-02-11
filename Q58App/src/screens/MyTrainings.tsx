import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { trainingStorage, Training } from '../services/trainingStorage';

interface MyTrainingsProps {
  onAddTraining: () => void;
  onGoBack: () => void;
  onSelectTraining: (trainingId: string) => void;
  onStartTraining: (trainingId: string) => void;
}

export const MyTrainings: React.FC<MyTrainingsProps> = ({
  onAddTraining,
  onGoBack,
  onSelectTraining,
  onStartTraining,
}) => {
  const insets = useSafeAreaInsets();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrainings();
  }, []);

  const loadTrainings = async () => {
    try {
      const data = await trainingStorage.getAll();
      setTrainings(data);
    } catch (error) {
      console.error('Error loading trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await trainingStorage.delete(id);
      setTrainings((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Error deleting training:', error);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const duplicated = await trainingStorage.duplicate(id);
      if (duplicated) {
        setTrainings((prev) => [...prev, duplicated]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error duplicating training:', error);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      const isFavorite = await trainingStorage.toggleFavorite(id);
      setTrainings((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isFavorite } : t))
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Ordenar: favoritos primeiro
  const sortedTrainings = [...trainings].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return 0;
  });

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={[styles.safeArea, { paddingTop: insets.top + 16 }]}>
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meus Treinos</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 + insets.bottom }]}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : trainings.length === 0 ? (
            /* Empty State */
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="barbell-outline" size={64} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Nenhum treino ainda</Text>
              <Text style={styles.emptySubtitle}>
                Adicione seu primeiro treino para começar a acompanhar seu progresso
              </Text>
            </View>
          ) : (
            /* Training List */
            <View style={styles.trainingList}>
              {sortedTrainings.map((training) => (
                <View key={training.id} style={styles.trainingCard}>
                  {/* Play Button */}
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => onStartTraining(training.id)}
                    disabled={!training.exercises?.length}
                  >
                    <LinearGradient
                      colors={training.exercises?.length ? [colors.primary, colors.primaryDark] : [colors.inactive, colors.inactive]}
                      style={styles.playButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="play" size={20} color={colors.textPrimary} />
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Training Info */}
                  <TouchableOpacity
                    style={styles.trainingInfo}
                    onPress={() => onSelectTraining(training.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.trainingName}>{training.name}</Text>
                    <Text style={styles.exerciseCount}>
                      {(() => {
                        const exercises = training.exercises || [];
                        const rounds = training.rounds || 1;
                        const exerciseCount = exercises.filter(e => e.type !== 'rest').length;
                        const restCardCount = exercises.filter(e => e.type === 'rest').length;

                        let defaultRestCount = 0;
                        if (training.defaultRestSeconds) {
                          for (let i = 0; i < exercises.length; i++) {
                            if (exercises[i].type !== 'rest' && exercises[i + 1] && exercises[i + 1].type !== 'rest') {
                              defaultRestCount++;
                            }
                          }
                        }

                        const totalExercises = exerciseCount * rounds;
                        const totalRests = (restCardCount + defaultRestCount) * rounds;

                        let text = `${totalExercises} exercício${totalExercises !== 1 ? 's' : ''}`;
                        if (totalRests > 0) {
                          text += ` + ${totalRests} descanso${totalRests !== 1 ? 's' : ''}`;
                        }
                        return text;
                      })()}
                    </Text>
                  </TouchableOpacity>

                  {/* Actions */}
                  <View style={styles.trainingActions}>
                    <TouchableOpacity
                      onPress={() => handleToggleFavorite(training.id)}
                      style={styles.actionButton}
                    >
                      <Ionicons
                        name={training.isFavorite ? 'star' : 'star-outline'}
                        size={20}
                        color={training.isFavorite ? '#FFD700' : colors.textMuted}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDuplicate(training.id)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="copy-outline" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(training.id)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onSelectTraining(training.id)}>
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Floating Add Button */}
        <TouchableOpacity style={[styles.fab, { bottom: 20 + insets.bottom }]} onPress={onAddTraining}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={32} color={colors.textPrimary} />
          </LinearGradient>
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  trainingList: {
    gap: 12,
  },
  trainingCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  playButton: {
    marginRight: 12,
  },
  playButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingInfo: {
    flex: 1,
  },
  trainingName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseCount: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  trainingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    borderRadius: 30,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
