import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { AuthScreenLayout } from '@/components/AuthScreenLayout';
import { LanguageToggle } from '@/components/LanguageToggle';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/AuthStack';
import { useLanguage } from '@/i18n';
import { showAlert } from '@/utils/alert';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleForgotPassword() {
    if (!email.trim()) {
      showAlert(t('enterEmailTitle'), t('enterEmailMsg'));
      return;
    }
    if (!isSupabaseConfigured) {
      showAlert(t('supabaseNotConfiguredTitle'), t('supabaseNotConfiguredMsg'));
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        showAlert(t('sendFailedTitle'), error.message);
      } else {
        showAlert(
          t('emailSentTitle'),
          t('resetLinkSentMsg', { email: email.trim() })
        );
      }
    } catch (err: any) {
      showAlert(t('unexpectedErrorTitle'), String(err?.message ?? err));
    } finally {
      setResetting(false);
    }
  }

  async function handleLogin() {
    if (!isSupabaseConfigured) {
      showAlert(
        t('supabaseNotConfiguredTitle'),
        t('supabaseEnvInstructionsMsg')
      );
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        showAlert(t('loginFailedTitle'), error.message);
      }
      // Se o login der certo, o RootNavigator detecta a sessão automaticamente
      // (via supabase.auth.onAuthStateChange) e troca pra área logada.
    } catch (err: any) {
      // Captura exceções que signInWithPassword não tenha retornado como
      // `{ error }` normal (ex: falha de rede, URL do Supabase errada).
      showAlert(t('unexpectedErrorTitle'), String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenLayout>
      <View style={styles.langRow}>
        <LanguageToggle />
      </View>

      {!isSupabaseConfigured && (
        <View style={styles.warningBanner}>
          <Feather name="alert-triangle" size={14} color={colors.secondary} />
          <Text style={styles.warningText}>
            {t('supabaseWarningBanner')}
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Image
            source={require('../../../assets/logo-icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>{t('welcomeBackTitle')}</Text>
        <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>
      </View>

      <View style={styles.infoBanner}>
        <Feather name="info" size={14} color={colors.secondary} />
        <Text style={styles.infoText}>{t('loginInfoBanner')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t('email')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>{t('password')}</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <Pressable style={styles.forgotRow} onPress={handleForgotPassword} disabled={resetting}>
          {resetting ? (
            <ActivityIndicator size="small" color={colors.secondary} />
          ) : (
            <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
          )}
        </Pressable>

        <Pressable style={styles.loginButton} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.loginButtonText}>{t('login')}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.signupRow}>
        <Text style={styles.signupText}>{t('noAccount')} </Text>
        <Pressable onPress={() => navigation.navigate('Cadastro')}>
          <Text style={styles.signupLink}>{t('signUpLink')}</Text>
        </Pressable>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 20,
  },
  warningText: { flex: 1, fontSize: 11, color: colors.secondary, lineHeight: 15 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(45,43,143,0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 12,
    color: colors.secondary,
    flex: 1,
  },
  langRow: { alignItems: 'flex-end', marginBottom: 12 },
  header: { alignItems: 'center', marginBottom: 28 },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  title: { fontSize: 22, fontWeight: '500', color: colors.secondary },
  subtitle: { fontSize: 13, color: colors.secondary, opacity: 0.7, marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 20 },
  label: { fontSize: 12, color: colors.textLabel, marginBottom: 4 },
  input: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 14,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  eyeButton: { padding: 4 },
  forgotRow: { alignItems: 'flex-end', marginBottom: 18 },
  forgotText: { fontSize: 12, color: colors.secondary, opacity: 0.75 },
  loginButton: {
    height: 48,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  signupText: { fontSize: 13, color: colors.secondary, opacity: 0.75 },
  signupLink: { fontSize: 13, color: colors.secondary, fontWeight: '500' },
});
