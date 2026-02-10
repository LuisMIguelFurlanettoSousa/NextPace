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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { trainingStorage, Training, Exercise, formatTime } from '../services/trainingStorage';
import { TimerPickerModal, TimerButton, TimerPresets, REST_PRESETS } from '../components/TimerPickerModal';
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
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [setDuration, setSetDuration] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  // Native picker state
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Menu de seleção de tipo e modal de descanso
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showRestModal, setShowRestModal] = useState(false);
  const [restCardDuration, setRestCardDuration] = useState<number | undefined>(undefined);
  const [showRestCardPicker, setShowRestCardPicker] = useState(false);
  const [editingRestCardId, setEditingRestCardId] = useState<string | null>(null);

  const isEditing = editingExerciseId !== null;
  const isEditingRestCard = editingRestCardId !== null;

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
    setSets(exercise.sets?.toString() || '');
    setReps(exercise.reps?.toString() || '');
    setWeight(exercise.weight?.toString() || '');
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
          sets: sets ? parseInt(sets) : undefined,
          reps: reps ? parseInt(reps) : undefined,
          weight: weight ? parseFloat(weight) : undefined,
          setDurationSeconds: setDuration,
        });
      } else {
        await trainingStorage.addExercise(trainingId, {
          name: exerciseName.trim(),
          sets: sets ? parseInt(sets) : undefined,
          reps: reps ? parseInt(reps) : undefined,
          weight: weight ? parseFloat(weight) : undefined,
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
    setSets('');
    setReps('');
    setWeight('');
    setSetDuration(undefined);
  };

  const resetRestForm = () => {
    setEditingRestCardId(null);
    setRestCardDuration(undefined);
  };

  const handleOpenEditRestCard = (exercise: Exercise) => {
    setEditingRestCardId(exercise.id);
    setRestCardDuration(exercise.durationSeconds);
    setShowRestModal(true);
  };

  const handleSaveRestCard = async () => {
    if (!restCardDuration) return;

    setSaving(true);
    try {
      if (isEditingRestCard && editingRestCardId) {
        await trainingStorage.updateExercise(trainingId, editingRestCardId, {
          name: 'Descanso',
          type: 'rest',
          durationSeconds: restCardDuration,
        });
      } else {
        await trainingStorage.addExercise(trainingId, {
          name: 'Descanso',
          type: 'rest',
          durationSeconds: restCardDuration,
        });
      }
      await loadTraining();
      setShowRestModal(false);
      resetRestForm();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o descanso');
    } finally {
      setSaving(false);
    }
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

  const renderExerciseItem = (exercise: Exercise, index: number, isDragging: boolean) => {
    // Calcula o número do exercício (não conta rest cards)
    const exerciseNumber = training?.exercises.slice(0, index + 1).filter(e => e.type !== 'rest').length || 0;

    // Card de descanso
    if (exercise.type === 'rest') {
      return (
        <View style={[styles.restCard, isDragging && styles.restCardDragging]}>
          <View style={styles.exerciseHeader}>
            <View style={styles.dragHandle}>
              <Ionicons name="menu" size={20} color={isDragging ? colors.rest : colors.textMuted} />
            </View>
            <View style={styles.restIconContainer}>
              <Ionicons name="cafe-outline" size={18} color={colors.textPrimary} />
            </View>
            <Text style={styles.restCardTitle}>Descanso</Text>
            <TouchableOpacity
              onPress={() => handleDeleteExercise(exercise.id)}
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
          <View style={styles.editHint}>
            <Ionicons name="pencil" size={12} color={colors.textMuted} />
            <Text style={styles.editHintText}>Toque para editar • Segure e arraste para ordenar</Text>
          </View>
        </View>
      );
    }

    // Card de exercício normal
    return (
      <View style={[styles.exerciseCard, isDragging && styles.exerciseCardDragging]}>
        <View style={styles.exerciseHeader}>
          <View style={styles.dragHandle}>
            <Ionicons name="menu" size={20} color={isDragging ? colors.primary : colors.textMuted} />
          </View>
          <View style={styles.exerciseNumber}>
            <Text style={styles.exerciseNumberText}>{exerciseNumber}</Text>
          </View>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <TouchableOpacity
            onPress={() => handleDeleteExercise(exercise.id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {(() => {
          const stats: Array<{ value: string; label: string }> = [];
          if (exercise.sets !== undefined) stats.push({ value: String(exercise.sets), label: 'séries' });
          if (exercise.reps !== undefined) stats.push({ value: String(exercise.reps), label: 'reps' });
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
            {training.exercises.filter(e => e.type !== 'rest').length} exercício{training.exercises.filter(e => e.type !== 'rest').length !== 1 ? 's' : ''}
            {training.exercises.filter(e => e.type === 'rest').length > 0 && ` • ${training.exercises.filter(e => e.type === 'rest').length} descanso${training.exercises.filter(e => e.type === 'rest').length !== 1 ? 's' : ''}`}
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
              onItemTap={(exercise) => {
                if (exercise.type === 'rest') {
                  handleOpenEditRestCard(exercise);
                } else {
                  handleOpenEditModal(exercise);
                }
              }}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
              contentContainerStyle={styles.listContent}
            />
          </ScrollView>
        )}

        <TouchableOpacity style={styles.fab} onPress={handleAddButtonPress}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={32} color={colors.textPrimary} />
          </LinearGradient>
        </TouchableOpacity>

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
                <Text style={styles.modalTitle}>{isEditing ? 'Editar Exercício' : 'Novo Exercício'}</Text>
                <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
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
                    <Text style={styles.label}>Séries - opcional</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: 3"
                      placeholderTextColor={colors.textMuted}
                      value={sets}
                      onChangeText={setSets}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.gap} />
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.label}>Repetições - opcional</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: 12"
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

              </ScrollView>

              {/* Botão fixo na parte inferior */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.saveButton, !exerciseName.trim() && styles.saveButtonDisabled]}
                  onPress={handleSaveExercise}
                  disabled={!exerciseName.trim() || saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Adicionar Exercício'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Timer Picker Modals - Inside exercise modal for proper stacking */}
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
                <Text style={styles.modalTitle}>
                  {isEditingRestCard ? 'Editar Descanso' : 'Novo Descanso'}
                </Text>
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

                <View style={[styles.inputGroup, { width: '100%' }]}>
                  <Text style={styles.label}>Tempo de descanso</Text>
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
                  style={[styles.restSaveButton, !restCardDuration && styles.saveButtonDisabled]}
                  onPress={handleSaveRestCard}
                  disabled={!restCardDuration || saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Salvando...' : isEditingRestCard ? 'Salvar Alterações' : 'Adicionar Descanso'}
                  </Text>
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
  // Rest card styles
  restCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.rest,
    marginBottom: 12,
  },
  restCardDragging: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.rest,
    borderWidth: 2,
    shadowColor: colors.rest,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  modalFooter: {
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'android' ? 32 : 24,
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
