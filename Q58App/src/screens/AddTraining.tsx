import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { trainingStorage, Exercise, formatTime } from '../services/trainingStorage';
import { TimerPickerModal, TimerButton, TimerPresets } from '../components/TimerPickerModal';

interface AddTrainingProps {
  onGoBack: () => void;
  onSave: () => void;
}

type TempExercise = Omit<Exercise, 'id'> & { tempId: string };

export const AddTraining: React.FC<AddTrainingProps> = ({ onGoBack, onSave }) => {
  const [trainingName, setTrainingName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<TempExercise[]>([]);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('12');
  const [weight, setWeight] = useState('');
  const [restSeconds, setRestSeconds] = useState<number | undefined>(undefined);
  const [setDuration, setSetDuration] = useState<number | undefined>(undefined);

  // Native picker state
  const [showRestPicker, setShowRestPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  const handleSave = async () => {
    if (!trainingName.trim()) return;

    setSaving(true);
    try {
      const newTraining = await trainingStorage.save({
        name: trainingName.trim(),
        description: description.trim(),
      });

      for (const exercise of exercises) {
        await trainingStorage.addExercise(newTraining.id, {
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          restSeconds: exercise.restSeconds,
          setDurationSeconds: exercise.setDurationSeconds,
        });
      }

      onSave();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o treino');
      setSaving(false);
    }
  };

  const handleAddExercise = () => {
    if (!exerciseName.trim()) return;

    const newExercise: TempExercise = {
      tempId: Date.now().toString(),
      name: exerciseName.trim(),
      sets: parseInt(sets) || 3,
      reps: parseInt(reps) || 12,
      weight: weight ? parseFloat(weight) : undefined,
      restSeconds: restSeconds,
      setDurationSeconds: setDuration,
    };

    setExercises([...exercises, newExercise]);
    setShowModal(false);
    resetExerciseForm();
  };

  const handleRemoveExercise = (tempId: string) => {
    setExercises(exercises.filter((e) => e.tempId !== tempId));
  };

  const resetExerciseForm = () => {
    setExerciseName('');
    setSets('3');
    setReps('12');
    setWeight('');
    setRestSeconds(undefined);
    setSetDuration(undefined);
  };

  const isFormValid = trainingName.trim().length > 0 && !saving;

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
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Novo Treino</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, !isFormValid && styles.saveButtonDisabled]}
            disabled={!isFormValid}
          >
            <Text style={[styles.saveText, !isFormValid && styles.saveTextDisabled]}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do treino</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ex: Treino A - Peito e Tríceps"
                placeholderTextColor={colors.textMuted}
                value={trainingName}
                onChangeText={setTrainingName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição (opcional)</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Adicione uma descrição ou notas sobre o treino"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.exercisesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Exercícios ({exercises.length})</Text>
              <TouchableOpacity
                style={styles.addExerciseButton}
                onPress={() => setShowModal(true)}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
                <Text style={styles.addExerciseText}>Adicionar</Text>
              </TouchableOpacity>
            </View>

            {exercises.length === 0 ? (
              <TouchableOpacity
                style={styles.emptyExercises}
                onPress={() => setShowModal(true)}
              >
                <Ionicons name="fitness-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyText}>Toque para adicionar exercícios</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.exerciseList}>
                {exercises.map((exercise, index) => (
                  <View key={exercise.tempId} style={styles.exerciseCard}>
                    <View style={styles.exerciseHeader}>
                      <View style={styles.exerciseNumber}>
                        <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveExercise(exercise.tempId)}
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
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.suggestionsSection}>
            <Text style={styles.suggestionsTitle}>Sugestões de nome</Text>
            <View style={styles.suggestionsContainer}>
              {['Treino A', 'Treino B', 'Treino C', 'Push', 'Pull', 'Legs'].map(
                (suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.suggestionChip}
                    onPress={() => setTrainingName(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </ScrollView>

        {/* Modal para adicionar exercício */}
        <Modal visible={showModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Novo Exercício</Text>
                <TouchableOpacity onPress={() => { setShowModal(false); resetExerciseForm(); }}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Nome do exercício</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ex: Supino reto"
                    placeholderTextColor={colors.textMuted}
                    value={exerciseName}
                    onChangeText={setExerciseName}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.modalInputGroup, styles.flex1]}>
                    <Text style={styles.modalLabel}>Séries</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="3"
                      placeholderTextColor={colors.textMuted}
                      value={sets}
                      onChangeText={setSets}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.gap} />
                  <View style={[styles.modalInputGroup, styles.flex1]}>
                    <Text style={styles.modalLabel}>Repetições</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="12"
                      placeholderTextColor={colors.textMuted}
                      value={reps}
                      onChangeText={setReps}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Peso (kg) - opcional</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ex: 20"
                    placeholderTextColor={colors.textMuted}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Intervalo entre séries */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Intervalo entre séries - opcional</Text>
                  <TimerPresets value={restSeconds} onSelect={setRestSeconds} />
                  <TimerButton
                    value={restSeconds}
                    onPress={() => setShowRestPicker(true)}
                    onClear={() => setRestSeconds(undefined)}
                    icon="timer-outline"
                  />
                </View>

                {/* Tempo da série */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Tempo da série - opcional</Text>
                  <TimerPresets value={setDuration} onSelect={setSetDuration} />
                  <TimerButton
                    value={setDuration}
                    onPress={() => setShowDurationPicker(true)}
                    onClear={() => setSetDuration(undefined)}
                    icon="stopwatch-outline"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalSaveButton,
                    !exerciseName.trim() && styles.modalSaveButtonDisabled,
                  ]}
                  onPress={handleAddExercise}
                  disabled={!exerciseName.trim()}
                >
                  <Text style={styles.modalSaveButtonText}>Adicionar Exercício</Text>
                </TouchableOpacity>
              </ScrollView>

            </View>
          </View>
        </Modal>

        {/* Timer Picker Modals */}
        <TimerPickerModal
          visible={showRestPicker}
          title="Intervalo entre séries"
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  saveButtonDisabled: {
    backgroundColor: colors.inactive,
  },
  saveText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveTextDisabled: {
    color: colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
  },
  input: {
    color: colors.textPrimary,
    fontSize: 16,
    paddingVertical: 16,
  },
  textAreaContainer: {
    paddingTop: 4,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  exercisesSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addExerciseText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyExercises: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 8,
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
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.cardBorder,
  },
  suggestionsSection: {
    marginTop: 8,
  },
  suggestionsTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  suggestionText: {
    color: colors.textSecondary,
    fontSize: 14,
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
  modalInputGroup: {
    marginBottom: 16,
  },
  modalLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  modalInput: {
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
  modalSaveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSaveButtonDisabled: {
    backgroundColor: colors.inactive,
  },
  modalSaveButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
