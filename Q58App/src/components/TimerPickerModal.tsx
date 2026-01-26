import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
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

const ITEM_HEIGHT = 50;

// Wheel Picker Column Component
const WheelPickerColumn: React.FC<{
  data: number[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  label: string;
  accentColor?: string;
}> = ({ data, selectedValue, onValueChange, label, accentColor = colors.primary }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const initialScrollDone = useRef(false);

  // Scroll to selected value on mount
  useEffect(() => {
    if (!initialScrollDone.current) {
      const index = data.indexOf(selectedValue);
      if (index >= 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: index * ITEM_HEIGHT,
            animated: false,
          });
        }, 50);
      }
      initialScrollDone.current = true;
    }
  }, []);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
    const newValue = data[clampedIndex];

    // Snap to the nearest item
    scrollViewRef.current?.scrollTo({
      y: clampedIndex * ITEM_HEIGHT,
      animated: true,
    });

    if (newValue !== selectedValue) {
      onValueChange(newValue);
    }
  };

  return (
    <View style={styles.androidPickerColumn}>
      <Text style={styles.androidPickerLabel}>{label}</Text>
      <View style={styles.wheelContainer}>
        {/* Selection indicator behind */}
        <View style={[styles.selectionIndicator, { backgroundColor: accentColor }]} />

        <ScrollView
          ref={scrollViewRef}
          style={styles.androidPickerScroll}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          nestedScrollEnabled={true}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
        >
          {/* Top padding */}
          <View style={{ height: ITEM_HEIGHT }} />

          {data.map((item) => {
            const isSelected = item === selectedValue;
            return (
              <View key={item} style={styles.androidPickerItem}>
                <Text
                  style={[
                    styles.androidPickerItemText,
                    isSelected && styles.androidPickerItemTextSelected,
                  ]}
                >
                  {item.toString().padStart(2, '0')}
                </Text>
              </View>
            );
          })}

          {/* Bottom padding */}
          <View style={{ height: ITEM_HEIGHT }} />
        </ScrollView>
      </View>
    </View>
  );
};

// Custom Android Picker Component
const AndroidTimerPicker: React.FC<{
  value: number | undefined;
  onChange: (seconds: number) => void;
  accentColor?: string;
}> = ({ value, onChange, accentColor = colors.primary }) => {
  const currentMinutes = value ? Math.floor(value / 60) : 1;
  const currentSeconds = value ? value % 60 : 0;

  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const seconds = Array.from({ length: 60 }, (_, i) => i);

  const handleMinutesChange = (min: number) => {
    onChange(min * 60 + currentSeconds);
  };

  const handleSecondsChange = (sec: number) => {
    onChange(currentMinutes * 60 + sec);
  };

  return (
    <View style={styles.androidPickerContainer}>
      <WheelPickerColumn
        data={minutes}
        selectedValue={currentMinutes}
        onValueChange={handleMinutesChange}
        label="MIN"
        accentColor={accentColor}
      />

      <Text style={styles.androidPickerSeparator}>:</Text>

      <WheelPickerColumn
        data={seconds}
        selectedValue={currentSeconds}
        onValueChange={handleSecondsChange}
        label="SEG"
        accentColor={accentColor}
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
              <TouchableOpacity onPress={handleAndroidConfirm}>
                <Text style={[styles.pickerModalDone, { color: accentColor }]}>OK</Text>
              </TouchableOpacity>
            </View>
            <AndroidTimerPicker
              value={tempValue}
              onChange={setTempValue}
              accentColor={accentColor}
            />
          </TouchableOpacity>
        </TouchableOpacity>
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
  // Android custom picker styles
  androidPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  androidPickerColumn: {
    alignItems: 'center',
    width: 100,
  },
  androidPickerLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 1,
  },
  wheelContainer: {
    height: 150,
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 50,
    left: 5,
    right: 5,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 10,
    zIndex: 0,
  },
  androidPickerScroll: {
    height: 150,
    width: 100,
    zIndex: 1,
  },
  androidPickerItem: {
    height: 50,
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidPickerItemText: {
    color: colors.textSecondary,
    fontSize: 26,
    fontWeight: '500',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  androidPickerItemTextSelected: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  androidPickerSeparator: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    marginTop: 28,
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
