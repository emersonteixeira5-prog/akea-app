import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase, type Brand } from '@/services/supabase';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useLanguage } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';
import { showAlert } from '@/utils/alert';

type Props = NativeStackScreenProps<UserRootStackParamList, 'RegistrarDoacao'>;
type QuantityEstimate = 'few_items' | 'medium_bag' | 'large_bag';

const MATERIAL_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: 'Roupas', labelKey: 'categoryClothes' },
  { value: 'Tecidos/retalhos', labelKey: 'materialFabrics' },
  { value: 'Calçados', labelKey: 'materialShoes' },
  { value: 'Acessórios', labelKey: 'categoryAccessories' },
];
const QUANTITY_OPTIONS: { value: QuantityEstimate; labelKey: TranslationKey }[] = [
  { value: 'few_items', labelKey: 'quantityFewItems' },
  { value: 'medium_bag', labelKey: 'quantityMediumBag' },
  { value: 'large_bag', labelKey: 'quantityLargeBag' },
];

export function RegistrarDoacaoScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<QuantityEstimate>('medium_bag');
  const [donationPhotoUrl, setDonationPhotoUrl] = useState<string | null>(null);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { pickAndUpload, uploading: uploadingPhoto } = useImageUpload('donation-photos');

  useEffect(() => {
    loadBrands();
  }, []);

  async function loadBrands() {
    setLoadingBrands(true);
    const { data } = await supabase.from('brands').select('*').not('pickup_address', 'is', null).order('name');
    if (data) {
      setBrands(data as Brand[]);
      if (data.length > 0) setSelectedBrandId(data[0].id);
    }
    setLoadingBrands(false);
  }

  function toggleMaterial(material: string) {
    setMaterialTypes((prev) => (prev.includes(material) ? prev.filter((m) => m !== material) : [...prev, material]));
  }

  async function handleSubmit() {
    if (!selectedBrandId) {
      showAlert(t('selectCollectionPointAlert'));
      return;
    }
    if (materialTypes.length === 0) {
      showAlert(t('selectMaterialTypeAlert'));
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error(t('invalidSessionMsg'));

      const { data: donation, error } = await supabase
        .from('donations')
        .insert({
          user_id: userData.user.id,
          brand_id: selectedBrandId,
          material_types: materialTypes,
          quantity_estimate: quantity,
          status: 'registered',
          photo_url: donationPhotoUrl,
        })
        .select()
        .single();

      if (error || !donation) throw new Error(error?.message ?? t('donationRegistrationFailed'));

      navigation.replace('AcompanharDoacao', { donationId: donation.id });
    } catch (err: any) {
      showAlert(t('couldNotRegisterDonation'), String(err?.message ?? err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('registerDonation')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <View style={styles.introBanner}>
          <Image
            source={require('../../../assets/logo-icon.png')}
            style={styles.brandMark}
            resizeMode="contain"
          />
          <Text style={styles.introText}>{t('donationIntroText')}</Text>
        </View>

        <Text style={styles.label}>{t('chooseCollectionPoint')}</Text>
        {loadingBrands ? (
          <ActivityIndicator color={colors.secondary} style={{ marginVertical: 16 }} />
        ) : brands.length === 0 ? (
          <Text style={styles.emptyText}>{t('noCollectionPoints')}</Text>
        ) : (
          brands.map((brand) => {
            const selected = brand.id === selectedBrandId;
            return (
              <Pressable
                key={brand.id}
                style={[styles.brandCard, selected && styles.brandCardSelected]}
                onPress={() => setSelectedBrandId(brand.id)}
              >
                <View style={styles.brandIcon}>
                  <Feather name="scissors" size={18} color={colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.brandName}>{brand.name}</Text>
                  <Text style={styles.brandAddress}>{brand.pickup_address}</Text>
                </View>
                <Feather name={selected ? 'check-circle' : 'circle'} size={20} color={selected ? colors.secondary : colors.border} />
              </Pressable>
            );
          })
        )}

        <Text style={[styles.label, { marginTop: 8 }]}>{t('whatWillYouDonate')}</Text>
        <View style={styles.chipsRow}>
          {MATERIAL_OPTIONS.map((material) => (
            <Pressable
              key={material.value}
              onPress={() => toggleMaterial(material.value)}
              style={[styles.chip, materialTypes.includes(material.value) && styles.chipActive]}
            >
              <Text style={[styles.chipText, materialTypes.includes(material.value) && styles.chipTextActive]}>{t(material.labelKey)}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('estimatedQuantity')}</Text>
        <View style={styles.quantityRow}>
          {QUANTITY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setQuantity(opt.value)}
              style={[styles.quantityButton, quantity === opt.value && styles.quantityButtonActive]}
            >
              <Text style={[styles.quantityText, quantity === opt.value && styles.quantityTextActive]}>{t(opt.labelKey)}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('photoOptional')}</Text>
        <Pressable
          style={styles.photoBox}
          onPress={async () => {
            const url = await pickAndUpload(selectedBrandId ?? 'donations');
            if (url) setDonationPhotoUrl(url);
          }}
          disabled={uploadingPhoto}
        >
          {donationPhotoUrl ? (
            <Image source={{ uri: donationPhotoUrl }} style={styles.photoPreview} />
          ) : uploadingPhoto ? (
            <ActivityIndicator color={colors.secondary} />
          ) : (
            <>
              <Feather name="camera" size={20} color={colors.secondary} style={{ opacity: 0.6 }} />
              <Text style={styles.photoText}>{t('tapToAddPhoto')}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.submitButtonText}>{t('registerDonation')}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  header: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  scroll: { flex: 1 },
  introBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, marginBottom: 20 },
  brandMark: { width: 30, height: 30 },
  introText: { flex: 1, fontSize: 12, color: colors.secondary, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textLabel, marginBottom: 10 },
  emptyText: { fontSize: 12, color: colors.secondary, opacity: 0.6, marginBottom: 16 },
  brandCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.md, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent' },
  brandCardSelected: { borderColor: colors.secondary },
  brandIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 12, fontWeight: '500', color: colors.secondary },
  brandAddress: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 12, color: colors.secondary },
  chipTextActive: { color: colors.primary, fontWeight: '500' },
  quantityRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  quantityButton: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center' },
  quantityButtonActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  quantityText: { fontSize: 11, color: colors.secondary },
  quantityTextActive: { color: colors.primary, fontWeight: '500' },
  photoBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 64, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.secondary, borderStyle: 'dashed', backgroundColor: colors.white, overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%' },
  photoText: { fontSize: 11, color: colors.secondary, opacity: 0.7 },
  bottomBar: { backgroundColor: colors.white, padding: 20, borderTopWidth: 0.5, borderTopColor: colors.surfaceMuted },
  submitButton: { height: 48, backgroundColor: colors.secondary, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  submitButtonText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
});