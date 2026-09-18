import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { AuthScreenLayout } from '@/components/AuthScreenLayout';
import { LanguageToggle } from '@/components/LanguageToggle';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useLanguage } from '@/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/AuthStack';
import { showAlert } from '@/utils/alert';

type Props = NativeStackScreenProps<AuthStackParamList, 'Cadastro'>;
type AccountType = 'user' | 'brand';

export function CadastroScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [accountType, setAccountType] = useState<AccountType>('user');
  const [name, setName] = useState(''); // nome completo (usuário) ou nome da marca
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!isSupabaseConfigured) {
      showAlert(
        t('supabaseNotConfiguredTitle'),
        t('supabaseEnvInstructionsMsg')
      );
      return;
    }
    if (!name.trim() || !email.trim() || !password) {
      showAlert(t('missingFieldsTitle'), t('missingFieldsMsg'));
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            account_type: accountType,
          },
        },
      });

      if (error) {
        showAlert(t('signupFailedTitle'), error.message);
        return;
      }

      // O registro em `profiles` já foi criado automaticamente pelo trigger
      // `handle_new_user` (ver supabase/schema.sql). Se for marca, criamos
      // também a linha em `brands` — o resto do perfil da marca (Instagram,
      // descrição, ponto de coleta) é preenchido na tela CompletarPerfil.
      if (accountType === 'brand' && data.user) {
        const { error: brandError } = await supabase.from('brands').insert({
          owner_id: data.user.id,
          name: name.trim(),
          cnpj_cpf: cnpjCpf.trim() || null,
        });
        if (brandError) {
          showAlert(
            t('accountCreatedWithIssueTitle'),
            t('brandSaveFailedMsg') + brandError.message
          );
        }
      }

      if (!data.session) {
        // O projeto Supabase está com confirmação de e-mail ativada
        // (configuração padrão) — sem sessão ainda, precisa confirmar antes.
        showAlert(
          t('almostThereTitle'),
          t('confirmEmailMsg')
        );
        navigation.navigate('Login');
      }
      // Se já veio com sessão (confirmação de e-mail desativada no projeto),
      // o RootNavigator detecta automaticamente via onAuthStateChange e troca
      // de tela — não precisa navegar manualmente daqui.
    } catch (err: any) {
      // Captura qualquer exceção que o signUp/insert não tenha retornado
      // como `{ error }` normal (ex: falha de rede, URL do Supabase errada).
      // Sem isso, esse tipo de falha deixava a tela "travada" sem aviso nenhum.
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

      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Image
            source={require('../../../assets/logo-icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>{t('createAccount')}</Text>
        <Text style={styles.subtitle}>
          {accountType === 'user' ? t('joinCircularFashion') : t('registerPartnerBrand')}
        </Text>
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleButton, accountType === 'user' && styles.toggleButtonActive]}
          onPress={() => setAccountType('user')}
        >
          <Text style={[styles.toggleText, accountType === 'user' && styles.toggleTextActive]}>{t('accountTypeUser')}</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, accountType === 'brand' && styles.toggleButtonActive]}
          onPress={() => setAccountType('brand')}
        >
          <Text style={[styles.toggleText, accountType === 'brand' && styles.toggleTextActive]}>
            {t('accountTypeBrand')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{accountType === 'user' ? t('fullName') : t('brandOrThriftName')}</Text>
        <TextInput
          style={styles.input}
          placeholder={accountType === 'user' ? t('fullNamePlaceholder') : t('brandNamePlaceholder')}
          value={name}
          onChangeText={setName}
        />

        {accountType === 'brand' && (
          <>
            <Text style={styles.label}>{t('cnpjCpfLabel')}</Text>
            <TextInput style={styles.input} placeholder={t('cnpjCpfPlaceholder')} value={cnpjCpf} onChangeText={setCnpjCpf} />
            <Text style={styles.hint}>{t('brandDetailsHint')}</Text>
          </>
        )}

        <Text style={styles.label}>{t('email')}</Text>
        <TextInput
          style={styles.input}
          placeholder={accountType === 'user' ? t('emailPlaceholder') : t('emailPlaceholderBrand')}
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

        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.submitButtonText}>{t('createAccount')}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.loginRow}>
        <Text style={styles.loginText}>{t('haveAccount')} </Text>
        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>{t('login')}</Text>
        </Pressable>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  langRow: { alignItems: 'flex-end', marginBottom: 12 },
  header: { alignItems: 'center', marginBottom: 18 },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  title: { fontSize: 22, fontWeight: '500', color: colors.secondary },
  subtitle: { fontSize: 13, color: colors.secondary, opacity: 0.7, marginTop: 4, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 12, padding: 4, marginBottom: 16 },
  toggleButton: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: colors.secondary },
  toggleText: { fontSize: 13, fontWeight: '500', color: colors.secondary },
  toggleTextActive: { color: colors.primary },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 18 },
  label: { fontSize: 12, color: colors.textLabel, marginBottom: 4 },
  hint: { fontSize: 11, color: colors.textMuted, marginBottom: 12, lineHeight: 15 },
  input: {
    height: 42,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 12,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  eyeButton: { padding: 4 },
  submitButton: {
    height: 46,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  loginText: { fontSize: 13, color: colors.secondary, opacity: 0.75 },
  loginLink: { fontSize: 13, color: colors.secondary, fontWeight: '500' },
});
