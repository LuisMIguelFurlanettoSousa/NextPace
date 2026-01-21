import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface DashboardProps {
  onTrainingPress: () => void;
  onProfilePress: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onTrainingPress, onProfilePress }) => {
  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.safeArea}>
        <StatusBar style="light" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Olá!</Text>
              <Text style={styles.headerTitle}>Q58</Text>
            </View>
            <TouchableOpacity onPress={() => { console.log('Profile pressed'); onProfilePress(); }} style={styles.profileButton}>
              <Ionicons name="person-circle-outline" size={36} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Main CTA - Training Button */}
          <View style={styles.section}>
            <TouchableOpacity onPress={onTrainingPress} activeOpacity={0.8}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.trainingButton}
              >
                <View style={styles.iconWrapper}>
                  <Ionicons name="fitness" size={32} color="#fff" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.buttonTitle}>Meus Treinos</Text>
                  <Text style={styles.buttonSubtitle}>Iniciar cronômetro</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumo</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>0h</Text>
                <Text style={styles.statLabel}>Esta semana</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Treinos</Text>
              </View>
            </View>
          </View>
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
    paddingTop: 60,
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
    marginBottom: 30,
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
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  trainingButton: {
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
  buttonTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  buttonSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
