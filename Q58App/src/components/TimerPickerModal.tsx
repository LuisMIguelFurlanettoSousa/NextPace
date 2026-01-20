import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatTime } from '../services/trainingStorage';

interface TimerPickerModalProps {
  visible: boolean;
  title: string;
  value: number | undefined;
  onClose: () => void;
  onChange: (seconds: number | undefined) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  placeholder?: string;
}

const PRESETS = [
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '1:00', value: 60 },
  { label: '1:30', value: 90 },
  { label: '2:00', value: 120 },
  { label: '3:00', value: 180 },
];

const secondsToDate = (seconds: number | undefined): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (seconds) {
    date.setMinutes(Math.floor(seconds / 60));
    date.setSeconds(seconds % 60);
  } else {
    date.setMinutes(1);
    date.setSeconds(0);
  }
  return date;
};

const dateToSeconds = (date: Date): number => {
  return date.getMinutes() * 60 + date.getSeconds();
};

export const TimerPickerModal: React.FC<TimerPickerModalProps> = ({
  visible,
  title,
  value,
  onClose,
  onChange,
  icon = 'timer-outline',
  placeholder = 'Toque para definir',
}) => {
  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      onClose();
      if (event.type === 'dismissed') return;
    }

    if (selectedDate) {
      const seconds = dateToSeconds(selectedDate);
      onChange(seconds > 0 ? seconds : undefined);
    }
  };

  // Android: renderiza o picker diretamente (ele já é um modal nativo)
  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={secondsToDate(value)}
        mode="time"
        is24Hour={true}
        display="spinner"
        onChange={handleChange}
      />
    );
  }

  // iOS: renderiza dentro de um Modal customizado
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.pickerModalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={styles.pickerModalContent}
        >
          <View style={styles.pickerModalHeader}>
            <Text style={styles.pickerModalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.pickerModalDone}>OK</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={secondsToDate(value)}
            mode="countdown"
            display="spinner"
            onChange={handleChange}
            minuteInterval={1}
            style={styles.picker}
            themeVariant="dark"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// Componente para o botão que abre o picker
interface TimerButtonProps {
  value: number | undefined;
  onPress: () => void;
  onClear: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  placeholder?: string;
}

export const TimerButton: React.FC<TimerButtonProps> = ({
  value,
  onPress,
  onClear,
  icon = 'timer-outline',
  placeholder = 'Toque para definir',
}) => {
  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds) return placeholder;
    return formatTime(seconds);
  };

  const handleClear = () => {
    onClear();
  };

  return (
    <TouchableOpacity
      style={styles.timerButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text
        style={[styles.timerButtonText, !value && styles.timerButtonTextPlaceholder]}
      >
        {formatDuration(value)}
      </Text>
      {value !== undefined && (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// Componente para os chips de atalho
interface TimerPresetsProps {
  value: number | undefined;
  onSelect: (seconds: number) => void;
  presets?: Array<{ label: string; value: number }>;
}

export const TimerPresets: React.FC<TimerPresetsProps> = ({
  value,
  onSelect,
  presets = PRESETS,
}) => {
  return (
    <>
      <Text style={styles.presetsLabel}>Atalhos:</Text>
      <View style={styles.presetsRow}>
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset.value}
            style={[
              styles.presetChip,
              value === preset.value && styles.presetChipSelected,
            ]}
            onPress={() => onSelect(preset.value)}
          >
            <Text
              style={[
                styles.presetChipText,
                value === preset.value && styles.presetChipTextSelected,
              ]}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  pickerModalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  pickerModalDone: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  picker: {
    backgroundColor: colors.cardBackground,
  },
  timerButton: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    flex: 1,
  },
  timerButtonTextPlaceholder: {
    color: colors.textMuted,
  },
  presetsLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  presetChip: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  presetChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetChipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  presetChipTextSelected: {
    color: colors.textPrimary,
  },
});
