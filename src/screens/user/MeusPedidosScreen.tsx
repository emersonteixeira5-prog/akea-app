import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useLanguage } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';

type Props = NativeStackScreenProps<UserRootStackParamList, 'MeusPedidos'>;

type OrderRow = {
  id: string;
  total_cents: number;
  delivery_method: 'pickup' | 'shipping';
  status: 'pending_payment' | 'paid' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
  brands: { name: string } | null;
};

const STATUS_LABEL_KEYS: Record<OrderRow['status'], TranslationKey> = {
  pending_payment: 'statusPendingPayment',
  paid: 'statusPaid',
  ready: 'statusReady',
  completed: 'statusCompleted',
  cancelled: 'statusCancelled',
};

function formatReais(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

export function MeusPedidosScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from('orders')
      .select('id, total_cents, delivery_method, status, created_at, brands(name)')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (data) setOrders(data as unknown as OrderRow[]);
    setLoading(false);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('myOrders')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }}>
        {loading ? (
          <ActivityIndicator color={colors.secondary} style={{ marginTop: 16 }} />
        ) : orders.length === 0 ? (
          <Text style={styles.emptyText}>{t('noOrders')}</Text>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.brandName}>{order.brands?.name ?? t('brandFallback')}</Text>
                <View style={[styles.statusBadge, order.status === 'completed' && styles.statusBadgeDone]}>
                  <Text style={[styles.statusText, order.status === 'completed' && styles.statusTextDone]}>
                    {t(STATUS_LABEL_KEYS[order.status])}
                  </Text>
                </View>
              </View>
              <Text style={styles.date}>{new Date(order.created_at).toLocaleDateString('pt-BR')}</Text>
              <View style={styles.cardBottom}>
                <View style={styles.deliveryRow}>
                  <Feather name={order.delivery_method === 'pickup' ? 'map-pin' : 'truck'} size={12} color={colors.textMuted} />
                  <Text style={styles.deliveryText}>{order.delivery_method === 'pickup' ? t('deliveryPickupLabel') : t('deliveryHomeLabel')}</Text>
                </View>
                <Text style={styles.total}>{formatReais(order.total_cents)}</Text>
              </View>
              {order.status !== 'cancelled' && (
                <Pressable
                  style={styles.trackButton}
                  onPress={() => navigation.navigate('AcompanharProducao', { orderId: order.id })}
                >
                  <Feather name="activity" size={13} color={colors.secondary} />
                  <Text style={styles.trackButtonText}>{t('trackProduction')}</Text>
                </Pressable>
              )}
            </View>
          ))
        )}
      </ScrollView>
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
  emptyText: { fontSize: 12, color: colors.secondary, opacity: 0.6, textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  brandName: { fontSize: 13, fontWeight: '500', color: colors.secondary },
  statusBadge: { backgroundColor: colors.surfaceMuted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeDone: { backgroundColor: colors.successBg },
  statusText: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
  statusTextDone: { color: colors.success },
  date: { fontSize: 10, color: colors.textMuted, marginBottom: 10 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 0.5, borderTopColor: colors.surfaceMuted },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deliveryText: { fontSize: 11, color: colors.textMuted },
  total: { fontSize: 14, fontWeight: '700', color: colors.secondary },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: colors.surfaceMuted,
  },
  trackButtonText: { fontSize: 12, fontWeight: '500', color: colors.secondary },
});