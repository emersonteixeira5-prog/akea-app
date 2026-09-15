import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, ActivityIndicator, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { colors, radius } from '@/constants/theme';
import { supabase, type Brand } from '@/services/supabase';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { CATEGORY_OPTIONS, CATEGORY_LABEL_KEYS } from '@/constants/categories';
import { useLanguage, type TranslationKey } from '@/i18n';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { BrandTabsParamList } from '@/navigation/BrandTabs';
import { showAlert } from '@/utils/alert';

type Props = BottomTabScreenProps<BrandTabsParamList, 'PerfilTab'>;

const MENU_ITEMS: { icon: keyof typeof Feather.glyphMap; labelKey: TranslationKey }[] = [
  { icon: 'file-text', labelKey: 'termsPrivacy' },
  { icon: 'help-circle', labelKey: 'helpSupport' },
];

export function PerfilMarcaConfigScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [bio, setBio] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [savingInfo, setSavingInfo] = useState(false);
  const { pickAndUpload: pickLogo, uploading: uploadingLogo } = useImageUpload('Logos');
  const { pickAndUpload: pickVideo, uploading: uploadingVideo, progress } = useVideoUpload();
  const player = useVideoPlayer(brand?.video_url ?? null, (p) => {
    p.loop = false;
  });
  const playerStatus = useEvent(player, 'statusChange', { status: player.status });
  const videoFailed = playerStatus?.status === 'error';

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!brand?.video_url) return;
    // replaceAsync rejeita quando o formato não é suportado ou a URL não
    // carrega. Sem o catch a rejeição vira "Uncaught (in promise)" no console
    // e, no nativo, pode derrubar a tela.
    player.replaceAsync(brand.video_url).catch((err) => {
      console.warn('Falha ao carregar o vídeo da marca:', err);
    });
  }, [brand?.video_url, player]);

  async function loadData() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setEmail(userData.user.email ?? '');

    // maybeSingle em vez de single: com zero ou várias marcas para o mesmo
    // dono, o single() falha e — sem tratar o erro — a tela renderizava vazia
    // sem explicação, e o Salvar saía calado no `if (!brand) return`.
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('owner_id', userData.user.id)
      .maybeSingle();

    if (error) {
      showAlert(t('error'), error.message);
      return;
    }
    if (data) {
      const b = data as Brand;
      setBrand(b);
      setInstagram(b.instagram ?? '');
      setWebsiteUrl(b.website_url ?? '');
      setBio(b.bio ?? '');
      setPickupAddress(b.pickup_address ?? '');
      setCategories(b.categories ?? []);
    }
  }

  function toggleCategory(cat: string) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  async function handleSaveInfo() {
    if (!brand) return;

    setSavingInfo(true);
    const payload = {
      instagram: instagram.trim() || null,
      website_url: websiteUrl.trim() || null,
      bio: bio.trim() || null,
      pickup_address: pickupAddress.trim(),
      categories,
    };

    const { error } = await supabase.from('brands').update(payload).eq('id', brand.id);
    setSavingInfo(false);

    if (error) {
      showAlert(t('error'), t('profileSaveError'));
      return;
    }
    setBrand((prev) => (prev ? { ...prev, ...payload } : prev));
    showAlert(t('success'), t('profileUpdateSuccess'));
  }

  async function handleChangeLogo() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user || !brand) return;
    const url = await pickLogo(brand.id);
    if (!url) return;
    const { error } = await supabase.from('brands').update({ logo_url: url }).eq('id', brand.id);
    if (error) {
      showAlert(t('error'), t('logoSaveError'));
      return;
    }
    setBrand((prev) => (prev ? { ...prev, logo_url: url } : prev));
    showAlert(t('success'), t('logoUpdateSuccess'));
  }

  async function handleChangeVideo() {
    if (!brand) return;
    const url = await pickVideo(brand.id);
    if (!url) return;
    const { error } = await supabase.from('brands').update({ video_url: url }).eq('id', brand.id);
    if (error) {
      showAlert(t('error'), t('videoSaveError'));
      return;
    }
    setBrand((prev) => (prev ? { ...prev, video_url: url } : prev));
    showAlert(t('success'), t('videoUpdateSuccess'));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('brandProfile')}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.brandCard}>
          <View style={{ alignItems: 'center' }}>
            <Pressable style={styles.logoCircle} onPress={handleChangeLogo} disabled={uploadingLogo}>
              {uploadingLogo ? (
                <ActivityIndicator color={colors.secondary} />
              ) : brand?.logo_url ? (
                <Image source={{ uri: brand.logo_url }} style={styles.logoImage} />
              ) : (
                <Feather name="scissors" size={22} color={colors.secondary} />
              )}
            </Pressable>
            <Text style={{ fontSize: 11, color: colors.secondary, opacity: 0.6, marginTop: 4 }}>
              {brand?.logo_url ? t('tapToChangeLogo') : t('tapToAddLogo')}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandName}>{brand?.name || t('yourBrand')}</Text>
            <Text style={styles.brandEmail}>{email}</Text>
          </View>
        </View>

        <View style={styles.infoForm}>
          <Text style={styles.sectionLabel}>{t('brandInfoSection')}</Text>

          <Text style={styles.label}>{t('instagramLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('instagramPlaceholder')}
            value={instagram}
            onChangeText={setInstagram}
            autoCapitalize="none"
          />

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
              <Pressable
                key={cat}
                onPress={() => toggleCategory(cat)}
                style={[styles.chip, categories.includes(cat) && styles.chipActive]}
              >
                <Text style={[styles.chipText, categories.includes(cat) && styles.chipTextActive]}>
                  {t(CATEGORY_LABEL_KEYS[cat])}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.saveButton} onPress={handleSaveInfo} disabled={savingInfo}>
            {savingInfo ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>{t('save')}</Text>
            )}
          </Pressable>
        </View>

        {/* Seção de vídeo de apresentação */}
        <View style={styles.videoSection}>
          <Text style={styles.sectionLabel}>{t('videoPresentation')}</Text>

          {!brand?.video_url ? (
            <View style={styles.videoPlaceholder}>
              <Feather name="video" size={26} color={colors.textMuted} />
              <Text style={styles.videoPlaceholderText}>{t('noVideoPublished')}</Text>
            </View>
          ) : videoFailed ? (
            <View style={styles.videoPlaceholder}>
              <Feather name="alert-circle" size={26} color={colors.textMuted} />
              <Text style={styles.videoPlaceholderText}>{t('videoLoadError')}</Text>
            </View>
          ) : (
            <VideoView
              player={player}
              style={styles.videoPlayer}
              nativeControls
              contentFit="cover"
            />
          )}

          {uploadingVideo && (
            progress > 0 ? (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { flex: progress }]} />
                <View style={{ flex: 100 - progress }} />
              </View>
            ) : (
              <ActivityIndicator size="small" color={colors.secondary} style={styles.progressSpinner} />
            )
          )}

          <Pressable style={styles.uploadVideoButton} onPress={handleChangeVideo} disabled={uploadingVideo}>
            <Feather name={uploadingVideo ? 'loader' : 'upload'} size={14} color={colors.secondary} />
            <Text style={styles.uploadVideoText}>
              {uploadingVideo
                ? progress > 0
                  ? t('uploadingVideoPercent', { progress })
                  : t('preparingVideo')
                : brand?.video_url
                  ? t('replaceVideo')
                  : t('addVideo')}
            </Text>
          </Pressable>

          <Text style={styles.videoHint}>
            {t('videoUploadHint')}
          </Text>
        </View>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <View key={item.labelKey} style={[styles.menuItem, i < MENU_ITEMS.length - 1 && styles.menuItemBorder]}>
              <Feather name={item.icon} size={18} color={colors.secondary} style={{ width: 18 }} />
              <Text style={styles.menuLabel}>{t(item.labelKey)}</Text>
              <Feather name="chevron-right" size={14} color={colors.border} />
            </View>
          ))}
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>{t('signOut')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  header: { backgroundColor: colors.white, paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.secondary },
  scroll: { flex: 1 },
  brandCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginBottom: 14 },
  logoCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImage: { width: 52, height: 52, borderRadius: 26 },
  brandName: { fontSize: 15, fontWeight: '600', color: colors.secondary },
  brandEmail: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  infoForm: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginBottom: 14 },
  label: { fontSize: 12, color: colors.textLabel, marginBottom: 4 },
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
  textarea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 0.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 12, color: colors.secondary },
  chipTextActive: { color: colors.primary, fontWeight: '500' },
  saveButton: {
    height: 42,
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  saveButtonText: { color: colors.primary, fontSize: 13, fontWeight: '500' },
  videoSection: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginTop: 8, marginBottom: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: colors.textLabel, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  videoPlayer: { width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.secondary, marginBottom: 12 },
  videoPlaceholder: { height: 110, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  videoPlaceholderText: { fontSize: 11, color: colors.textMuted },
  progressTrack: { flexDirection: 'row', height: 4, backgroundColor: colors.surfaceMuted, borderRadius: 2, marginBottom: 12, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.secondary, borderRadius: 2 },
  progressSpinner: { marginBottom: 12 },
  uploadVideoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 38, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, marginBottom: 8 },
  uploadVideoText: { fontSize: 13, fontWeight: '500', color: colors.secondary },
  videoHint: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  menuCard: { backgroundColor: colors.white, borderRadius: radius.lg, marginTop: 8, marginBottom: 18, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.surfaceMuted },
  menuLabel: { flex: 1, fontSize: 13, color: colors.secondary },
  signOutButton: {
    height: 44,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { fontSize: 13, fontWeight: '500', color: colors.textLabel },
});
