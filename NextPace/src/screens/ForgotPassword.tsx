import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { authService } from '../services/auth/authService';

interface ForgotPasswordProps {
  onGoBack: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onGoBack }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const result = await authService.resetPassword(email.trim());
      if (result.success) {
        setEmailSent(true);
      } else {
        Alert.alert('Erro', result.error);
      }
    } catch {
      Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
          <StatusBar style="light" />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Recuperar Senha</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.content}>
            {emailSent ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="mail" size={48} color={colors.success} />
                </View>
                <Text style={styles.successTitle}>Email enviado!</Text>
                <Text style={styles.successText}>
                  Enviamos um link de recuperação para{'\n'}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>
                <Text style={styles.successHint}>
                  Verifique sua caixa de entrada e spam.
                </Text>
                <TouchableOpacity style={styles.backToLoginButton} onPress={onGoBack}>
                  <Text style={styles.backToLoginText}>Voltar ao login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.iconContainer}>
                  <Ionicons name="key" size={48} color={colors.primary} />
                </View>
                <Text style={styles.description}>
                  Digite seu email e enviaremos um link para redefinir sua senha.
                </Text>

                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, !email.trim() && styles.submitButtonDisabled]}
                  onPress={handleResetPassword}
                  disabled={!email.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.submitText}>Enviar link</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  successText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  emailHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  successHint: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 32,
  },
  backToLoginButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  backToLoginText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
