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
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { authService } from '../services/auth/authService';
import { useAuth } from '../services/auth/authContext';

interface AuthProps {
  onForgotPassword: () => void;
}

type AuthMode = 'login' | 'signup';

export const Auth: React.FC<AuthProps> = ({ onForgotPassword }) => {
  const insets = useSafeAreaInsets();
  const { setOfflineOnly } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isFormValid = mode === 'login'
    ? email.trim() && password.trim()
    : email.trim() && password.trim() && displayName.trim();

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    try {
      if (mode === 'login') {
        const result = await authService.signIn(email.trim(), password);
        if (!result.success) {
          Alert.alert('Erro no login', result.error);
        }
      } else {
        if (password.length < 6) {
          Alert.alert('Senha fraca', 'A senha deve ter pelo menos 6 caracteres.');
          return;
        }
        const result = await authService.signUp(email.trim(), password, displayName.trim());
        if (!result.success) {
          Alert.alert('Erro no cadastro', result.error);
        } else {
          Alert.alert(
            'Cadastro realizado!',
            'Verifique seu email para confirmar a conta.',
          );
        }
      }
    } catch {
      Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await authService.signInWithGoogle();
      if (!result.success) {
        Alert.alert('Erro', result.error);
      }
    } catch {
      Alert.alert('Erro', 'Ocorreu um erro ao conectar com o Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfflineMode = () => {
    setOfflineOnly(true);
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
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Ionicons name="fitness" size={64} color={colors.primary} />
            <Text style={styles.logoText}>NextPace</Text>
            <Text style={styles.tagline}>Seu treino, seu ritmo</Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.activeTab]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>
                Entrar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.activeTab]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.activeTabText]}>
                Cadastrar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nome"
                  placeholderTextColor={colors.textMuted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>
            )}

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
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Senha"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {mode === 'login' && (
              <TouchableOpacity onPress={onForgotPassword} style={styles.forgotButton}>
                <Text style={styles.forgotText}>Esqueci minha senha</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'login' ? 'Entrar' : 'Criar conta'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={isLoading}>
            <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
            <Text style={styles.googleText}>Continuar com Google</Text>
          </TouchableOpacity>

          {/* Offline */}
          <TouchableOpacity style={styles.offlineButton} onPress={handleOfflineMode} disabled={isLoading}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.textMuted} />
            <Text style={styles.offlineText}>Continuar sem conta</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="light" />
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '800',
    marginTop: 12,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.textPrimary,
  },
  form: {
    gap: 14,
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
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    padding: 8,
    position: 'absolute',
    right: 8,
  },
  forgotButton: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  dividerText: {
    color: colors.textMuted,
    marginHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 14,
    gap: 10,
  },
  googleText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  offlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 12,
    gap: 8,
  },
  offlineText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
