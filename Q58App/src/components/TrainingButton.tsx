import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface TrainingButtonProps {
  onPress: () => void;
}

export const TrainingButton: React.FC<TrainingButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconWrapper}>
          <Ionicons name="fitness" size={32} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Meus Treinos</Text>
          <Text style={styles.subtitle}>Iniciar cronômetro</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginLeft: 16,
    marginRight: 16,
    flexShrink: 1,
    flexGrow: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 4,
  },
});
