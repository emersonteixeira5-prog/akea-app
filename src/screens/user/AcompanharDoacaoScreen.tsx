import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase, type Donation, type Brand } from '@/services/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';
import { useLanguage } from '@/i18n';

type Props = NativeStackScreenProps<UserRootStackParamList, 'AcompanharDoacao'>;

export function AcompanharDoacaoScreen({ route, navigation }: Props) {
  const { t } = useLanguage();
  const { donationId } = route.params;
  const [donation, setDonation] = useState<Donation | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  const STEPS: { status: Donation['status']; label: string }[] = [
    { status: 'registered', label: t('donationStepRegistered') },
    { status: 'received', label: t('donationStepReceived') },
    { status: 'evaluated', label: t('donationStepEvaluated') },
    { status: 'transforming', label: t('donationStatusTransforming') },
    { status: 'completed', label: t('donationStepCompleted') },
  ];

  useEffect(() => {
    loadData();
  }, [donationId]);

  async function loadData() {
    setLoading(true);
    const { data: donationData } = await supabase.from('donations').select('*').eq('id', donationId).maybeSingle();
    if (donationData) {
      setDonation(donationData as Donation);
      const { data: brandData } = await supabase.from('brands').select('*').eq('id', donationData.brand_id).maybeSingle();
      if (brandData) setBrand(brandData as Brand);
    }
    setLoading(false);
  }

  if (loading || !donation) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.secondary} size="large" />
      </View>
    );
  }

  if (donation.status === 'rejected') {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={20} color={colors.secondary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('trackDonation')}</Text>
          <View style={{ width: 20 }} />
        </View>
        <View style={styles.rejectedBox}>
          <Feather name="x-circle" size={36} color={colors.danger} />
          <Text style={styles.rejectedTitle}>{t('donationRejected')}</Text>
          <Text style={styles.rejectedText}>
            {t('donationRejectedMsg')}
          </Text>
        </View>
      </View>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.status === donation.status);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('trackDonation')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Feather name="scissors" size={20} color={colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryBrand}>{brand?.name}</Text>
            <Text style={styles.summaryDate}>
              {t('donationRegisteredOn')} {new Date(donation.created_at).toLocaleDateString('pt-BR')}
            </Text>
          </View>
          {donation.status === 'completed' && (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>{t('donationCompletedBadge')}</Text>
            </View>
          )}
        </View>

        {STEPS.map((step, index) => {
          const isDone = index <= currentIndex;
          const isLast = index === STEPS.length - 1;
          return (
            <View key={step.status} style={styles.stepRow}>
              <View style={styles.stepIconColumn}>
                <View style={[styles.stepCircle, isDone && styles.stepCircleDone]}>
                  {isDone ? (
                    <Feather name="check" size={14} color={colors.primary} />
                  ) : (
                    <View style={styles.stepCircleEmpty} />
                  )}
                </View>
                {!isLast && <View style={[styles.stepLine, isDone && styles.stepLineDone]} />}
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepLabel, !isDone && styles.stepLabelPending]}>{step.label}</Text>

                {step.status === 'completed' && donation.status === 'completed' && (
                  <>
                    {donation.result_photo_url ? (
                      <View style={styles.resultImage}>
                        <Feather name="image" size={28} color={colors.border} />
                      </View>
                    ) : null}
                    <Text style={styles.resultText}>
                      {t('donationResultPrefix')}{' '}
                      <Text style={{ fontWeight: '700' }}>{donation.points_awarded ?? 0} {t('donationResultSuffix')}</Text>
                    </Text>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, marginBottom: 24 },
  summaryIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  summaryBrand: { fontSize: 13, fontWeight: '500', color: colors.secondary },
  summaryDate: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  doneBadge: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  doneBadgeText: { fontSize: 10, fontWeight: '700', color: colors.secondary },
  stepRow: { flexDirection: 'row', gap: 12 },
  stepIconColumn: { alignItems: 'center', width: 24 },
  stepCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  stepCircleDone: { backgroundColor: colors.secondary },
  stepCircleEmpty: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  stepLine: { width: 2, flex: 1, minHeight: 30, backgroundColor: colors.surfaceMuted },
  stepLineDone: { backgroundColor: colors.secondary },
  stepContent: { flex: 1, paddingBottom: 24 },
  stepLabel: { fontSize: 13, fontWeight: '500', color: colors.secondary },
  stepLabelPending: { color: colors.textMuted, fontWeight: '400' },
  resultImage: { backgroundColor: colors.white, borderRadius: radius.md, height: 110, alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 8 },
  resultText: { fontSize: 11, color: colors.secondary, lineHeight: 17, marginTop: 6 },
  rejectedBox: { alignItems: 'center', padding: 40, gap: 10 },
  rejectedTitle: { fontSize: 16, fontWeight: '600', color: colors.secondary },
  rejectedText: { fontSize: 12, color: colors.secondary, opacity: 0.7, textAlign: 'center', lineHeight: 18 },
});