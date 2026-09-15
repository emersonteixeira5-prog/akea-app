import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase, type Donation } from '@/services/supabase';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useLanguage } from '@/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BrandRootStackParamList } from '@/navigation/BrandRootStack';
import { showAlert } from '@/utils/alert';

type Props = NativeStackScreenProps<BrandRootStackParamList, 'PostarResultado'>;
type DonationWithDonor = Donation & { profiles: { full_name: string } | null };

const POINTS_BY_QUANTITY: Record<Donation['quantity_estimate'], number> = {
  few_items: 15,
  medium_bag: 30,
  large_bag: 50,
};

function timeAgo(dateString: string, t: ReturnType<typeof useLanguage>['t']) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 1) return t('today');
  return `${t('daysAgoPrefix')} ${days} ${days > 1 ? t('dayPlural') : t('daySingular')}`;
}

export function PostarResultadoScreen({ route, navigation }: Props) {
  const { t } = useLanguage();
  const { donationId } = route.params;
  const [donation, setDonation] = useState<DonationWithDonor | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [resultPhotoUrl, setResultPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const { pickAndUpload, uploading: uploadingPhoto } = useImageUpload('result-photos');

  useEffect(() => {
    loadDonation();
  }, [donationId]);

  async function loadDonation() {
    setLoading(true);
    const { data } = await supabase.from('donations').select('*, profiles(full_name)').eq('id', donationId).maybeSingle();
    if (data) setDonation(data as unknown as DonationWithDonor);
    setLoading(false);
  }

  const pointsToAward = donation ? POINTS_BY_QUANTITY[donation.quantity_estimate] : 0;

  async function handlePublish() {
    if (!donation) return;
    const priceNumber = Number(price.replace(',', '.'));
    if (!name.trim() || !priceNumber || priceNumber <= 0) {
      showAlert(t('fillNameAndPrice'), t('priceMustBePositive'));
      return;
    }

    setPublishing(true);
    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          brand_id: donation.brand_id,
          name: name.trim(),
          price_cents: Math.round(priceNumber * 100),
          status: 'active',
          is_unique_piece: true,
          photo_url: resultPhotoUrl,
        })
        .select()
        .single();

      if (productError || !product) throw new Error(productError?.message ?? t('productCreationFailed'));

      const { error: donationError } = await supabase
        .from('donations')
        .update({
          status: 'completed',
          points_awarded: pointsToAward,
          result_product_id: product.id,
          result_photo_url: resultPhotoUrl,
        })
        .eq('id', donation.id);

      if (donationError) throw new Error(donationError.message);

      showAlert(t('resultPublished'), `${donation.profiles?.full_name ?? t('donorFallbackCapitalized')} ${t('wasNotifiedAndEarned')} ${pointsToAward} pontos.`, [
        { text: t('ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      showAlert(t('publishFailed'), String(err?.message ?? err));
    } finally {
      setPublishing(false);
    }
  }

  if (loading || !donation) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.secondary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('postResultTitle')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.refCard}>
          <View style={styles.refIcon}>
            <Feather name="user" size={16} color={colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.refTitle}>Doação de {donation.profiles?.full_name ?? t('donorFallback')}</Text>
            <Text style={styles.refSubtitle}>
              {t('acceptedLabel')} {timeAgo(donation.created_at, t)} · {donation.material_types.join(', ')}
            </Text>
          </View>
        </View>

        <Text style={styles.label}>{t('finalProductPhoto')}</Text>
        <Pressable
          style={styles.photoBox}
          onPress={async () => {
            const url = await pickAndUpload(donationId);
            if (url) setResultPhotoUrl(url);
          }}
          disabled={uploadingPhoto}
        >
          {resultPhotoUrl ? (
            <Image source={{ uri: resultPhotoUrl }} style={styles.photoPreview} />
          ) : uploadingPhoto ? (
            <ActivityIndicator color={colors.secondary} />
          ) : (
            <>
              <Feather name="camera" size={26} color={colors.secondary} style={{ opacity: 0.6 }} />
              <Text style={styles.photoText}>{t('tapToAddPhoto')}</Text>
            </>
          )}
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.label}>{t('productName')}</Text>
          <TextInput style={styles.input} placeholder={t('productNamePlaceholder')} value={name} onChangeText={setName} />
          <Text style={styles.label}>{t('salePrice')}</Text>
          <TextInput style={styles.input} placeholder={t('priceExamplePlaceholder')} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        </View>

        <View style={styles.pointsCard}>
          <View style={styles.pointsLeft}>
            <Feather name="star" size={16} color={colors.secondary} />
            <Text style={styles.pointsLabel}>{t('impactPointsFor')} {donation.profiles?.full_name?.split(' ')[0] ?? t('donorFallbackLowercase')}</Text>
          </View>
          <Text style={styles.pointsValue}>{pointsToAward}</Text>
        </View>

        <Text style={styles.note}>
          {t('publishNote')}
        </Text>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.publishButton} onPress={handlePublish} disabled={publishing}>
          {publishing ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.publishButtonText}>{t('publishResult')}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
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
  refCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, marginBottom: 20 },
  refIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  refTitle: { fontSize: 12, fontWeight: '500', color: colors.secondary },
  refSubtitle: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textLabel, marginBottom: 8 },
  photoBox: {
    height: 120,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.secondary,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoText: { fontSize: 11, color: colors.secondary, opacity: 0.6 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginBottom: 14 },
  input: { height: 42, borderRadius: radius.md, borderWidth: 0.5, borderColor: colors.border, paddingHorizontal: 14, fontSize: 14, color: colors.secondary, marginBottom: 14 },
  pointsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginBottom: 14 },
  pointsLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  pointsLabel: { fontSize: 12, color: colors.secondary, flex: 1 },
  pointsValue: { fontSize: 16, fontWeight: '700', color: colors.secondary },
  note: { fontSize: 11, color: colors.textLabel, lineHeight: 16 },
  bottomBar: { backgroundColor: colors.white, padding: 20, borderTopWidth: 0.5, borderTopColor: colors.surfaceMuted },
  publishButton: { height: 48, backgroundColor: colors.secondary, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  publishButtonText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
});