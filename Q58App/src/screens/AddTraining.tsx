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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { trainingStorage, Exercise, formatTime } from '../services/trainingStorage';
import { TimerPickerModal, TimerButton, TimerPresets, REST_PRESETS } from '../components/TimerPickerModal';

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
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [restSeconds, setRestSeconds] = useState<number | undefined>(undefined);
  const [setDuration, setSetDuration] = useState<number | undefined>(undefined);

  // Timer picker state
  const [showRestPicker, setShowRestPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  // Menu de seleção de tipo e modal de descanso
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showRestModal, setShowRestModal] = useState(false);
  const [restCardDuration, setRestCardDuration] = useState<number | undefined>(undefined);
  const [showRestCardPicker, setShowRestCardPicker] = useState(false);

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
          type: exercise.type,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          restSeconds: exercise.restSeconds,
          setDurationSeconds: exercise.setDurationSeconds,
          durationSeconds: exercise.durationSeconds,
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
      type: 'exercise',
      sets: sets ? parseInt(sets) : undefined,
      reps: reps ? parseInt(reps) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      restSeconds: restSeconds,
      setDurationSeconds: setDuration,
    };

    setExercises([...exercises, newExercise]);
    setShowModal(false);
    resetExerciseForm();
  };

  const handleAddRestCard = () => {
    if (!restCardDuration) return;

    const newRest: TempExercise = {
      tempId: Date.now().toString(),
      name: 'Descanso',
      type: 'rest',
      durationSeconds: restCardDuration,
    };

    setExercises([...exercises, newRest]);
    setShowRestModal(false);
    resetRestForm();
  };

  const handleRemoveExercise = (tempId: string) => {
    setExercises(exercises.filter((e) => e.tempId !== tempId));
  };

  const resetExerciseForm = () => {
    setExerciseName('');
    setSets('');
    setReps('');
    setWeight('');
    setRestSeconds(undefined);
    setSetDuration(undefined);
  };

  const resetRestForm = () => {
    setRestCardDuration(undefined);
  };

  const handleAddButtonPress = () => {
    setShowTypeMenu(true);
  };

  const handleSelectExerciseType = () => {
    setShowTypeMenu(false);
    setShowModal(true);
  };

  const handleSelectRestType = () => {
    setShowTypeMenu(false);
    setShowRestModal(true);
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
                onPress={handleAddButtonPress}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
                <Text style={styles.addExerciseText}>Adicionar</Text>
              </TouchableOpacity>
            </View>

            {exercises.length === 0 ? (
              <TouchableOpacity
                style={styles.emptyExercises}
                onPress={handleAddButtonPress}
              >
                <Ionicons name="fitness-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyText}>Toque para adicionar exercícios</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.exerciseList}>
                {exercises.map((exercise, index) => {
                  // Calcula o número do exercício (não conta rest cards)
                  const exerciseNumber = exercises.slice(0, index + 1).filter(e => e.type !== 'rest').length;
                  return exercise.type === 'rest' ? (
                    // Card de descanso
                    <View key={exercise.tempId} style={styles.restCard}>
                      <View style={styles.exerciseHeader}>
                        <View style={styles.restIconContainer}>
                          <Ionicons name="cafe-outline" size={18} color={colors.textPrimary} />
                        </View>
                        <Text style={styles.restCardTitle}>Descanso</Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveExercise(exercise.tempId)}
                          style={styles.deleteButton}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.restCardContent}>
                        <Ionicons name="time-outline" size={24} color={colors.rest} />
                        <Text style={styles.restCardTime}>
                          {exercise.durationSeconds ? formatTime(exercise.durationSeconds) : '0:00'}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    // Card de exercício normal
                    <View key={exercise.tempId} style={styles.exerciseCard}>
                      <View style={styles.exerciseHeader}>
                        <View style={styles.exerciseNumber}>
                          <Text style={styles.exerciseNumberText}>{exerciseNumber}</Text>
                        </View>
                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveExercise(exercise.tempId)}
                          style={styles.deleteButton}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>

                      {(() => {
                        const stats: Array<{ value: string; label: string }> = [];
                        if (exercise.sets !== undefined) stats.push({ value: String(exercise.sets), label: 'séries' });
                        if (exercise.reps !== undefined) stats.push({ value: String(exercise.reps), label: 'reps' });
                        if (exercise.restSeconds) stats.push({ value: formatTime(exercise.restSeconds), label: 'descanso' });
                        if (exercise.weight) stats.push({ value: `${exercise.weight}kg`, label: 'peso' });
                        if (exercise.setDurationSeconds) stats.push({ value: formatTime(exercise.setDurationSeconds), label: 'tempo' });

                        if (stats.length === 0) return null;

                        return (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.exerciseStatsScroll}
                            contentContainerStyle={[styles.exerciseStats, styles.exerciseStatsCentered]}
                          >
                            {stats.map((stat, idx) => (
                              <React.Fragment key={stat.label}>
                                {idx > 0 && <View style={styles.statDivider} />}
                                <View style={styles.stat}>
                                  <Text style={styles.statValue}>{stat.value}</Text>
                                  <Text style={styles.statLabel}>{stat.label}</Text>
                                </View>
                              </React.Fragment>
                            ))}
                          </ScrollView>
                        );
                      })()}
                    </View>
                  );
                })}
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
        <Modal
          visible={showModal}
          animationType="slide"
          transparent
          presentationStyle="overFullScreen"
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
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
                contentContainerStyle={styles.modalScrollContent}
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
                    <Text style={styles.modalLabel}>Séries - opcional</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Ex: 3"
                      placeholderTextColor={colors.textMuted}
                      value={sets}
                      onChangeText={setSets}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.gap} />
                  <View style={[styles.modalInputGroup, styles.flex1]}>
                    <Text style={styles.modalLabel}>Repetições - opcional</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Ex: 12"
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

                {/* Descanso entre séries */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Descanso entre séries - opcional</Text>
                  <TimerPresets value={restSeconds} onSelect={setRestSeconds} presets={REST_PRESETS} />
                  <TimerButton
                    value={restSeconds}
                    onPress={() => setShowRestPicker(true)}
                    onClear={() => setRestSeconds(undefined)}
                    icon="timer-outline"
                  />
                </View>
              </ScrollView>

              {/* Botão fixo na parte inferior */}
              <View style={styles.modalFooter}>
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
              </View>

              {/* Timer Picker Modals */}
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
          </KeyboardAvoidingView>
        </Modal>

        {/* Menu de seleção de tipo */}
        <Modal
          visible={showTypeMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTypeMenu(false)}
        >
          <TouchableOpacity
            style={styles.typeMenuOverlay}
            activeOpacity={1}
            onPress={() => setShowTypeMenu(false)}
          >
            <View style={styles.typeMenuContent}>
              <Text style={styles.typeMenuTitle}>Adicionar</Text>

              <TouchableOpacity style={styles.typeMenuItem} onPress={handleSelectExerciseType}>
                <View style={[styles.typeMenuIcon, { backgroundColor: colors.primary }]}>
                  <Ionicons name="fitness-outline" size={24} color={colors.textPrimary} />
                </View>
                <View style={styles.typeMenuTextContainer}>
                  <Text style={styles.typeMenuItemTitle}>Exercício</Text>
                  <Text style={styles.typeMenuItemSubtitle}>Adicione séries, reps, peso...</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.typeMenuItem} onPress={handleSelectRestType}>
                <View style={[styles.typeMenuIcon, { backgroundColor: colors.rest }]}>
                  <Ionicons name="cafe-outline" size={24} color={colors.textPrimary} />
                </View>
                <View style={styles.typeMenuTextContainer}>
                  <Text style={styles.typeMenuItemTitle}>Descanso</Text>
                  <Text style={styles.typeMenuItemSubtitle}>Pausa entre exercícios</Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Modal para adicionar descanso */}
        <Modal
          visible={showRestModal}
          animationType="slide"
          transparent
          presentationStyle="overFullScreen"
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.restModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Novo Descanso</Text>
                <TouchableOpacity onPress={() => { setShowRestModal(false); resetRestForm(); }}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.restModalBody}>
                <View style={styles.restModalIconContainer}>
                  <Ionicons name="cafe-outline" size={48} color={colors.rest} />
                </View>
                <Text style={styles.restModalDescription}>
                  Adicione um intervalo de descanso entre os exercícios
                </Text>

                <View style={[styles.modalInputGroup, { width: '100%' }]}>
                  <Text style={styles.modalLabel}>Tempo de descanso</Text>
                  <TimerPresets value={restCardDuration} onSelect={setRestCardDuration} presets={REST_PRESETS} accentColor={colors.rest} />
                  <TimerButton
                    value={restCardDuration}
                    onPress={() => setShowRestCardPicker(true)}
                    onClear={() => setRestCardDuration(undefined)}
                    icon="time-outline"
                    placeholder="Toque para definir o tempo"
                    accentColor={colors.rest}
                  />
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.restSaveButton, !restCardDuration && styles.modalSaveButtonDisabled]}
                  onPress={handleAddRestCard}
                  disabled={!restCardDuration}
                >
                  <Text style={styles.modalSaveButtonText}>Adicionar Descanso</Text>
                </TouchableOpacity>
              </View>

              <TimerPickerModal
                visible={showRestCardPicker}
                title="Tempo de descanso"
                value={restCardDuration}
                onClose={() => setShowRestCardPicker(false)}
                onChange={setRestCardDuration}
                accentColor={colors.rest}
              />
            </View>
          </KeyboardAvoidingView>
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
  // Rest card styles
  restCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.rest,
  },
  restIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.rest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  restCardTitle: {
    color: colors.rest,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  restCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  restCardTime: {
    color: colors.rest,
    fontSize: 28,
    fontWeight: '700',
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
  exerciseStatsScroll: {
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  exerciseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 4,
  },
  exerciseStatsCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: 12,
    minWidth: 50,
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
    paddingTop: 24,
    paddingHorizontal: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  modalFooter: {
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'android' ? 32 : 24,
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
  },
  modalSaveButtonDisabled: {
    backgroundColor: colors.inactive,
  },
  modalSaveButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Type menu styles
  typeMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  typeMenuContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  typeMenuTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  typeMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  typeMenuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  typeMenuTextContainer: {
    flex: 1,
  },
  typeMenuItemTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  typeMenuItemSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  // Rest modal styles
  restModalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  restModalBody: {
    alignItems: 'center',
    paddingVertical: 16,
    width: '100%',
  },
  restModalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  restModalDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  restSaveButton: {
    backgroundColor: colors.rest,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
});
