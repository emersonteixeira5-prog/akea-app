import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { AuthScreenLayout } from '@/components/AuthScreenLayout';
import { supabase } from '@/services/supabase';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useLanguage } from '@/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';
import { showAlert } from '@/utils/alert';

type Props = NativeStackScreenProps<UserRootStackParamList, 'CompletarPerfil'>;

export function CompletarPerfilUsuarioScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [city, setCity] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { pickAndUpload, uploading: uploadingAvatar } = useImageUpload('avatars');

  async function handleSave() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ city: city.trim() || null, avatar_url: avatarUrl })
        .eq('id', userData.user.id);

      if (error) {
        showAlert(t('saveFailedTitle'), error.message);
        return;
      }
      navigation.goBack();
    } catch (err: any) {
      showAlert(t('unexpectedErrorTitle'), String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenLayout>
      <View style={styles.header}>
        <Text style={styles.title}>{t('completeProfileTitle')}</Text>
        <Text style={styles.subtitle}>{t('completeProfileSubtitle')}</Text>
      </View>

      <View style={styles.avatarWrapper}>
        <Pressable
          style={styles.avatarCircle}
          onPress={async () => {
            const url = await pickAndUpload('avatars');
            if (url) setAvatarUrl(url);
          }}
          disabled={uploadingAvatar}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : uploadingAvatar ? (
            <ActivityIndicator color={colors.secondary} />
          ) : (
            <Feather name="camera" size={30} color={colors.secondary} style={{ opacity: 0.6 }} />
          )}
        </Pressable>
        <Text style={styles.avatarLabel}>{avatarUrl ? t('changePhoto') : t('addPhotoOptional')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t('addressCity')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('whereDoYouLive')}
          value={city}
          onChangeText={setCity}
        />
      </View>

      <Pressable style={styles.submitButton} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.submitButtonText}>{t('finish')}</Text>}
      </Pressable>

      <Pressable style={styles.skipRow} onPress={() => navigation.goBack()}>
        <Text style={styles.skipText}>{t('skipForNow')}</Text>
      </Pressable>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 26 },
  title: { fontSize: 22, fontWeight: '500', color: colors.secondary },
  subtitle: { fontSize: 13, color: colors.secondary, opacity: 0.7, marginTop: 6, textAlign: 'center' },
  avatarWrapper: { alignItems: 'center', marginBottom: 28 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.secondary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarLabel: { fontSize: 12, color: colors.secondary, opacity: 0.7 },
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
  },
  submitButton: {
    height: 48,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  submitButtonText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
  skipRow: { alignItems: 'center', marginTop: 16 },
  skipText: { fontSize: 13, color: colors.secondary, opacity: 0.6 },
});
