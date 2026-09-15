import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { AuthScreenLayout } from '@/components/AuthScreenLayout';
import { supabase } from '@/services/supabase';
import { useImageUpload } from '@/hooks/useImageUpload';
import { CATEGORY_OPTIONS, CATEGORY_LABEL_KEYS } from '@/constants/categories';
import { useLanguage } from '@/i18n';
import { showAlert } from '@/utils/alert';


export function CompletarPerfilMarcaScreen({ onDone }: { onDone: () => void }) {
  const { t } = useLanguage();
  const [instagram, setInstagram] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [bio, setBio] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { pickAndUpload, uploading } = useImageUpload('Logos');

  function toggleCategory(cat: string) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  async function handleLogoUpload() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const url = await pickAndUpload(userData.user.id);
    if (url) setLogoUrl(url);
  }

  async function handleSubmit() {
    if (!pickupAddress.trim()) {
      showAlert(t('missingAddressTitle'), t('pickupAddressRequiredMsg'));
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const payload = {
        instagram: instagram.trim() || null,
        website_url: websiteUrl.trim() || null,
        bio: bio.trim() || null,
        pickup_address: pickupAddress.trim(),
        categories,
        ...(logoUrl ? { logo_url: logoUrl } : {}),
      };

      const { data: existingBrand } = await supabase
        .from('brands')
        .select('id')
        .eq('owner_id', userData.user.id)
        .maybeSingle();

      let error;
      if (existingBrand) {
        ({ error } = await supabase.from('brands').update(payload).eq('id', existingBrand.id));
      } else {
        // Não existe linha em `brands` pra esse dono ainda (ex: foi apagada
        // manualmente, ou o insert lá no Cadastro falhou) — cria agora, com
        // o nome salvo no perfil como fallback, pra não deixar o usuário
        // travado sem conseguir concluir o cadastro.
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userData.user.id)
          .maybeSingle();
        ({ error } = await supabase.from('brands').insert({
          owner_id: userData.user.id,
          name: profileData?.full_name || 'Minha marca',
          ...payload,
        }));
      }

      if (error) {
        showAlert(t('saveFailedTitle'), error.message);
        return;
      }
      onDone();
    } catch (err: any) {
      showAlert(t('unexpectedErrorTitle'), String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenLayout>
      <View style={styles.header}>
        <Text style={styles.title}>{t('completeBrandProfileTitle')}</Text>
        <Text style={styles.subtitle}>{t('completeBrandProfileSubtitle')}</Text>
      </View>

      <View style={styles.logoWrapper}>
        <Pressable style={styles.logoCircle} onPress={handleLogoUpload} disabled={uploading}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logoImage} />
          ) : uploading ? (
            <ActivityIndicator color={colors.secondary} />
          ) : (
            <Feather name="camera" size={26} color={colors.secondary} style={{ opacity: 0.6 }} />
          )}
        </Pressable>
        <Text style={styles.logoLabel}>{logoUrl ? t('changeLogo') : t('addBrandLogo')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t('instagramLabel')}</Text>
        <TextInput style={styles.input} placeholder={t('instagramPlaceholder')} value={instagram} onChangeText={setInstagram} autoCapitalize="none" />

        <Text style={styles.label}>{t('websiteLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('websitePlaceholder')}
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.label}>{t('description')}</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder={t('bioPlaceholder')}
          value={bio}
          onChangeText={setBio}
          multiline
        />

        <Text style={styles.label}>{t('pickupAddressLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('addressPlaceholder')}
          value={pickupAddress}
          onChangeText={setPickupAddress}
        />

        <Text style={styles.label}>{t('productCategories')}</Text>
        <View style={styles.chipsRow}>
          {CATEGORY_OPTIONS.map((cat) => (
            <Pressable key={cat} onPress={() => toggleCategory(cat)} style={[styles.chip, categories.includes(cat) && styles.chipActive]}>
              <Text style={[styles.chipText, categories.includes(cat) && styles.chipTextActive]}>{t(CATEGORY_LABEL_KEYS[cat])}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.submitButtonText}>{t('completeRegistration')}</Text>}
      </Pressable>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 21, fontWeight: '500', color: colors.secondary, textAlign: 'center' },
  subtitle: { fontSize: 12, color: colors.secondary, opacity: 0.7, marginTop: 6, textAlign: 'center' },
  logoWrapper: { alignItems: 'center', marginBottom: 20 },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.secondary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  logoImage: { width: 76, height: 76, borderRadius: 38 },
  logoLabel: { fontSize: 12, color: colors.secondary, opacity: 0.7 },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 18 },
  label: { fontSize: 12, color: colors.textLabel, marginBottom: 4 },
  input: {
    height: 42,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 14,
  },
  textarea: { height: 64, paddingTop: 10, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 0.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 12, color: colors.secondary },
  chipTextActive: { color: colors.primary, fontWeight: '500' },
  submitButton: {
    height: 46,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  submitButtonText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
});
