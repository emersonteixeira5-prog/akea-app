import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase, type OrderStage, type OrderStatus } from '@/services/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';
import { useLanguage, type TranslationKey } from '@/i18n';

type Props = NativeStackScreenProps<UserRootStackParamList, 'AcompanharProducao'>;

type OrderHeader = {
  id: string;
  total_cents: number;
  status: OrderStatus;
  created_at: string;
  brands: { name: string } | null;
};

const STATUS_LABEL_KEYS: Record<OrderStatus, TranslationKey> = {
  pending_payment: 'awaitingPayment',
  paid: 'paymentConfirmed',
  ready: 'readyForPickup',
  completed: 'statusCompleted',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AcompanharProducaoScreen({ route, navigation }: Props) {
  const { t } = useLanguage();
  const { orderId } = route.params;
  const [order, setOrder] = useState<OrderHeader | null>(null);
  const [stages, setStages] = useState<OrderStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [orderId]);

  async function loadData() {
    setLoading(true);
    const [{ data: orderData }, { data: stagesData }] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total_cents, status, created_at, brands(name)')
        .eq('id', orderId)
        .maybeSingle(),
      supabase
        .from('order_stages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),
    ]);
    if (orderData) setOrder(orderData as unknown as OrderHeader);
    if (stagesData) setStages(stagesData as OrderStage[]);
    setLoading(false);
  }

  if (loading || !order) {
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
        <Text style={styles.headerTitle}>{t('trackProduction')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Feather name="scissors" size={20} color={colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryBrand}>{order.brands?.name ?? t('brandFallback')}</Text>
            <Text style={styles.summaryDate}>
              {t('orderedOn')} {new Date(order.created_at).toLocaleDateString('pt-BR')}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{t(STATUS_LABEL_KEYS[order.status])}</Text>
          </View>
        </View>

        {stages.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="clock" size={32} color={colors.border} />
            <Text style={styles.emptyText}>
              {t('noStages')}
            </Text>
          </View>
        ) : (
          stages.map((stage, index) => {
            const isLast = index === stages.length - 1;
            return (
              <View key={stage.id} style={styles.stepRow}>
                <View style={styles.stepIconColumn}>
                  <View style={styles.stepCircle}>
                    <Feather name="check" size={14} color={colors.primary} />
                  </View>
                  {!isLast && <View style={styles.stepLine} />}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepLabel}>{stage.stage_name}</Text>
                  {stage.description ? (
                    <Text style={styles.stepDesc}>{stage.description}</Text>
                  ) : null}
                  {stage.photo_url ? (
                    <Image
                      source={{ uri: stage.photo_url }}
                      style={styles.stagePhoto}
                      resizeMode="cover"
                    />
                  ) : null}
                  <Text style={styles.stepDate}>{formatDateTime(stage.created_at)}</Text>
                </View>
              </View>
            );
          })
        )}
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 24,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBrand: { fontSize: 13, fontWeight: '500', color: colors.secondary },
  summaryDate: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  statusBadge: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: colors.secondary },
  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 32, paddingHorizontal: 8 },
  emptyText: { fontSize: 12, color: colors.secondary, textAlign: 'center', lineHeight: 18, opacity: 0.8 },
  stepRow: { flexDirection: 'row', gap: 12 },
  stepIconColumn: { alignItems: 'center', width: 24 },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: { width: 2, flex: 1, minHeight: 30, backgroundColor: colors.secondary },
  stepContent: { flex: 1, paddingBottom: 24 },
  stepLabel: { fontSize: 13, fontWeight: '600', color: colors.secondary },
  stepDesc: { fontSize: 11, color: colors.textLabel, marginTop: 4, lineHeight: 16 },
  stagePhoto: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    marginTop: 10,
    marginBottom: 4,
  },
  stepDate: { fontSize: 10, color: colors.textMuted, marginTop: 6 },
});
