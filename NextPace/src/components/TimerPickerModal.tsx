import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatTime } from '../utils/formatTime';

interface TimerPickerModalProps {
  visible: boolean;
  title: string;
  value: number | undefined;
  onClose: () => void;
  onChange: (seconds: number | undefined) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  placeholder?: string;
  accentColor?: string;
}

const PRESETS = [
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '1:00', value: 60 },
  { label: '1:30', value: 90 },
  { label: '2:00', value: 120 },
  { label: '3:00', value: 180 },
];

export const REST_PRESETS = [
  { label: '10s', value: 10 },
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '1:00', value: 60 },
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

// Stepper Column para Android - botões +/− confiáveis
const StepperColumn: React.FC<{
  value: number;
  maxValue: number;
  label: string;
  accentColor?: string;
  onValueChange: (value: number) => void;
}> = ({ value, maxValue, label, accentColor = colors.primary, onValueChange }) => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const valueRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);

  useEffect(() => {
    valueRef.current = value;
    onValueChangeRef.current = onValueChange;
  }, [value, onValueChange]);

  const stopRepeating = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const increment = useCallback(() => {
    const v = valueRef.current;
    const next = v >= maxValue ? 0 : v + 1;
    valueRef.current = next;
    onValueChangeRef.current(next);
  }, [maxValue]);

  const decrement = useCallback(() => {
    const v = valueRef.current;
    const next = v <= 0 ? maxValue : v - 1;
    valueRef.current = next;
    onValueChangeRef.current(next);
  }, [maxValue]);

  const startRepeating = useCallback((action: () => void) => {
    intervalRef.current = setInterval(action, 120);
  }, []);

  useEffect(() => {
    return stopRepeating;
  }, [stopRepeating]);

  return (
    <View style={styles.stepperColumn}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.stepperButton, { borderColor: accentColor }]}
        onPress={increment}
        onLongPress={() => startRepeating(increment)}
        onPressOut={stopRepeating}
        activeOpacity={0.6}
      >
        <Ionicons name="chevron-up" size={28} color={accentColor} />
      </TouchableOpacity>
      <View style={[styles.stepperValueBox, { borderColor: accentColor }]}>
        <Text style={styles.stepperValueText}>
          {value.toString().padStart(2, '0')}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.stepperButton, { borderColor: accentColor }]}
        onPress={decrement}
        onLongPress={() => startRepeating(decrement)}
        onPressOut={stopRepeating}
        activeOpacity={0.6}
      >
        <Ionicons name="chevron-down" size={28} color={accentColor} />
      </TouchableOpacity>
    </View>
  );
};

// Custom Android Picker com botões +/−
const AndroidTimerPicker: React.FC<{
  value: number | undefined;
  onChange: (seconds: number) => void;
  accentColor?: string;
}> = ({ value, onChange, accentColor = colors.primary }) => {
  const currentMinutes = value ? Math.floor(value / 60) : 1;
  const currentSeconds = value ? value % 60 : 0;

  const handleMinutesChange = (min: number) => {
    onChange(min * 60 + currentSeconds);
  };

  const handleSecondsChange = (sec: number) => {
    onChange(currentMinutes * 60 + sec);
  };

  return (
    <View style={styles.androidPickerContainer}>
      <StepperColumn
        value={currentMinutes}
        maxValue={59}
        label="MIN"
        accentColor={accentColor}
        onValueChange={handleMinutesChange}
      />

      <Text style={styles.androidPickerSeparator}>:</Text>

      <StepperColumn
        value={currentSeconds}
        maxValue={59}
        label="SEG"
        accentColor={accentColor}
        onValueChange={handleSecondsChange}
      />
    </View>
  );
};

export const TimerPickerModal: React.FC<TimerPickerModalProps> = ({
  visible,
  title,
  value,
  onClose,
  onChange,
  icon = 'timer-outline',
  placeholder = 'Toque para definir',
  accentColor = colors.primary,
}) => {
  const [tempValue, setTempValue] = useState(value || 60);

  // Sync tempValue when modal opens or value changes
  useEffect(() => {
    if (visible) {
      setTempValue(value || 60);
    }
  }, [visible, value]);

  const handleChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      const seconds = dateToSeconds(selectedDate);
      onChange(seconds > 0 ? seconds : undefined);
    }
  };

  const handleAndroidConfirm = () => {
    onChange(tempValue > 0 ? tempValue : undefined);
    onClose();
  };

  // Android: Modal customizado com picker de minutos/segundos
  if (Platform.OS === 'android') {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable
          style={styles.pickerModalOverlay}
          onPress={onClose}
        >
          <View
            style={styles.pickerModalContent}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>{title}</Text>
              <TouchableOpacity onPress={handleAndroidConfirm}>
                <Text style={[styles.pickerModalDone, { color: accentColor }]}>OK</Text>
              </TouchableOpacity>
            </View>
            <AndroidTimerPicker
              value={tempValue}
              onChange={setTempValue}
              accentColor={accentColor}
            />
          </View>
        </Pressable>
      </Modal>
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
  accentColor?: string;
}

export const TimerButton: React.FC<TimerButtonProps> = ({
  value,
  onPress,
  onClear,
  icon = 'timer-outline',
  placeholder = 'Toque para definir',
  accentColor = colors.primary,
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
      <Ionicons name={icon} size={24} color={accentColor} />
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
  accentColor?: string;
}

export const TimerPresets: React.FC<TimerPresetsProps> = ({
  value,
  onSelect,
  presets = PRESETS,
  accentColor = colors.primary,
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
              value === preset.value && { backgroundColor: accentColor, borderColor: accentColor },
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
  // Android stepper picker styles
  androidPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  stepperColumn: {
    alignItems: 'center',
    width: 100,
  },
  stepperLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 1,
  },
  stepperButton: {
    width: 64,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  stepperValueBox: {
    width: 80,
    height: 60,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    marginVertical: 8,
  },
  stepperValueText: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
  },
  androidPickerSeparator: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    marginTop: 30,
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
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginHorizontal: 2,
    alignItems: 'center',
    minWidth: 40,
  },
  presetChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  presetChipTextSelected: {
    color: colors.textPrimary,
  },
});
