import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { trainingStorage, Training, Exercise, formatTime } from '../services/trainingStorage';
import { TimerPickerModal, TimerButton, TimerPresets } from '../components/TimerPickerModal';
import { DraggableList } from '../components/DraggableList';

interface TrainingDetailProps {
  trainingId: string;
  onGoBack: () => void;
}

export const TrainingDetail: React.FC<TrainingDetailProps> = ({ trainingId, onGoBack }) => {
  const [training, setTraining] = useState<Training | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('12');
  const [weight, setWeight] = useState('');
  const [restSeconds, setRestSeconds] = useState<number | undefined>(undefined);
  const [setDuration, setSetDuration] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  // Native picker state
  const [showRestPicker, setShowRestPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isEditing = editingExerciseId !== null;

  useEffect(() => {
    loadTraining();
  }, []);

  const loadTraining = async () => {
    const data = await trainingStorage.getById(trainingId);
    setTraining(data);
  };

  const handleOpenEditModal = (exercise: Exercise) => {
    setEditingExerciseId(exercise.id);
    setExerciseName(exercise.name);
    setSets(exercise.sets.toString());
    setReps(exercise.reps.toString());
    setWeight(exercise.weight?.toString() || '');
    setRestSeconds(exercise.restSeconds);
    setSetDuration(exercise.setDurationSeconds);
    setShowModal(true);
  };

  const handleSaveExercise = async () => {
    if (!exerciseName.trim()) return;

    setSaving(true);
    try {
      if (isEditing && editingExerciseId) {
        await trainingStorage.updateExercise(trainingId, editingExerciseId, {
          name: exerciseName.trim(),
          sets: parseInt(sets) || 3,
          reps: parseInt(reps) || 12,
          weight: weight ? parseFloat(weight) : undefined,
          restSeconds: restSeconds,
          setDurationSeconds: setDuration,
        });
      } else {
        await trainingStorage.addExercise(trainingId, {
          name: exerciseName.trim(),
          sets: parseInt(sets) || 3,
          reps: parseInt(reps) || 12,
          weight: weight ? parseFloat(weight) : undefined,
          restSeconds: restSeconds,
          setDurationSeconds: setDuration,
        });
      }
      await loadTraining();
      setShowModal(false);
      resetForm();
    } catch (error) {
      Alert.alert('Erro', isEditing ? 'Não foi possível atualizar o exercício' : 'Não foi possível adicionar o exercício');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    try {
      await trainingStorage.removeExercise(trainingId, exerciseId);
      await loadTraining();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover o exercício');
    }
  };

  const handleReorderExercises = async (exercises: Exercise[]) => {
    if (!training) return;

    // Atualiza estado local para feedback imediato
    setTraining({ ...training, exercises });

    // Salva no storage
    try {
      await trainingStorage.reorderExercises(trainingId, exercises);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível reordenar os exercícios');
      await loadTraining();
    }
  };

  const resetForm = () => {
    setEditingExerciseId(null);
    setExerciseName('');
    setSets('3');
    setReps('12');
    setWeight('');
    setRestSeconds(undefined);
    setSetDuration(undefined);
  };

  const renderExerciseItem = (exercise: Exercise, index: number, isDragging: boolean) => {
    return (
      <View style={[styles.exerciseCard, isDragging && styles.exerciseCardDragging]}>
        <View style={styles.exerciseHeader}>
          <View style={styles.dragHandle}>
            <Ionicons name="menu" size={20} color={isDragging ? colors.primary : colors.textMuted} />
          </View>
          <View style={styles.exerciseNumber}>
            <Text style={styles.exerciseNumberText}>{index + 1}</Text>
          </View>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <TouchableOpacity
            onPress={() => handleDeleteExercise(exercise.id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.exerciseStats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{exercise.sets}</Text>
            <Text style={styles.statLabel}>séries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{exercise.reps}</Text>
            <Text style={styles.statLabel}>reps</Text>
          </View>
          {exercise.restSeconds && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatTime(exercise.restSeconds)}</Text>
                <Text style={styles.statLabel}>descanso</Text>
              </View>
            </>
          )}
          {exercise.weight && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{exercise.weight}kg</Text>
                <Text style={styles.statLabel}>peso</Text>
              </View>
            </>
          )}
          {exercise.setDurationSeconds && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatTime(exercise.setDurationSeconds)}</Text>
                <Text style={styles.statLabel}>tempo</Text>
              </View>
            </>
          )}
        </View>
        <View style={styles.editHint}>
          <Ionicons name="pencil" size={12} color={colors.textMuted} />
          <Text style={styles.editHintText}>Toque para editar • Segure e arraste para ordenar</Text>
        </View>
      </View>
    );
  };

  if (!training) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.safeArea}>
        <StatusBar style="light" />

        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {training.name}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.exerciseCountContainer}>
          <Text style={styles.exerciseCount}>
            {training.exercises.length} exercício{training.exercises.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {training.exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhum exercício adicionado</Text>
            <Text style={styles.emptySubtext}>Toque no + para adicionar</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isDragging}
          >
            <DraggableList
              data={training.exercises}
              renderItem={renderExerciseItem}
              keyExtractor={(item) => item.id}
              onReorder={handleReorderExercises}
              onItemTap={(exercise) => handleOpenEditModal(exercise)}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
              contentContainerStyle={styles.listContent}
            />
          </ScrollView>
        )}

        <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={32} color={colors.textPrimary} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Modal para adicionar exercício */}
        <Modal
          visible={showModal}
          animationType="slide"
          transparent
          presentationStyle="overFullScreen"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditing ? 'Editar Exercício' : 'Novo Exercício'}</Text>
                <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nome do exercício</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Supino reto"
                    placeholderTextColor={colors.textMuted}
                    value={exerciseName}
                    onChangeText={setExerciseName}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.label}>Séries</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="3"
                      placeholderTextColor={colors.textMuted}
                      value={sets}
                      onChangeText={setSets}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.gap} />
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.label}>Repetições</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="12"
                      placeholderTextColor={colors.textMuted}
                      value={reps}
                      onChangeText={setReps}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Peso (kg) - opcional</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 20"
                    placeholderTextColor={colors.textMuted}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Tempo da série */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Tempo da série - opcional</Text>
                  <TimerPresets value={setDuration} onSelect={setSetDuration} />
                  <TimerButton
                    value={setDuration}
                    onPress={() => setShowDurationPicker(true)}
                    onClear={() => setSetDuration(undefined)}
                    icon="stopwatch-outline"
                  />
                </View>

                {/* Descanso entre séries */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Descanso entre séries - opcional</Text>
                  <TimerPresets value={restSeconds} onSelect={setRestSeconds} />
                  <TimerButton
                    value={restSeconds}
                    onPress={() => setShowRestPicker(true)}
                    onClear={() => setRestSeconds(undefined)}
                    icon="timer-outline"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, !exerciseName.trim() && styles.saveButtonDisabled]}
                  onPress={handleSaveExercise}
                  disabled={!exerciseName.trim() || saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Adicionar Exercício'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Timer Picker Modals - Inside exercise modal for proper stacking */}
              <TimerPickerModal
                visible={showRestPicker}
                title="Descanso entre séries"
                value={restSeconds}
                onClose={() => setShowRestPicker(false)}
                onChange={setRestSeconds}
              />

              <TimerPickerModal
                visible={showDurationPicker}
                title="Tempo da série"
                value={setDuration}
                onClose={() => setShowDurationPicker(false)}
                onChange={setSetDuration}
              />
            </View>
          </View>
        </Modal>
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
    paddingTop: 60,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 40,
  },
  exerciseCountContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  exerciseCount: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  exerciseList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  exerciseCardDragging: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dragHandle: {
    padding: 4,
    marginRight: 8,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  exerciseNumberText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.cardBorder,
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  editHintText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  gap: {
    width: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: colors.inactive,
  },
  saveButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
