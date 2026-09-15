import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { useLanguage } from '@/i18n';
import { supabase, type Order, type OrderStatus } from '@/services/supabase';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { BrandTabsParamList } from '@/navigation/BrandTabs';
import { showAlert } from '@/utils/alert';
import type { BrandRootNavigation } from '@/navigation/BrandRootStack';

type Props = BottomTabScreenProps<BrandTabsParamList, 'PedidosTab'>;

type OrderItem = {
  id: string;
  quantity: number;
  unit_price_cents: number;
  products: { name: string } | null;
};

type OrderWithItems = Order & {
  order_items: OrderItem[];
};

type FilterTab = 'pending_payment' | 'paid' | 'ready' | 'completed';

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending_payment: 'paid',
  paid: 'ready',
  ready: 'completed',
};

const STATUS_BADGE_STYLE: Record<OrderStatus, object> = {
  pending_payment: { backgroundColor: '#FEF3C7' },
  paid:            { backgroundColor: '#E8F5EE' },
  ready:           { backgroundColor: '#EDE9FE' },
  completed:       { backgroundColor: '#F1EFE8' },
};

const STATUS_TEXT_STYLE: Record<OrderStatus, object> = {
  pending_payment: { color: '#92400E' },
  paid:            { color: '#1A7A4A' },
  ready:           { color: '#5B21B6' },
  completed:       { color: '#888780' },
};

function formatReais(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

function formatDate(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function PedidosScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filter, setFilter] = useState<FilterTab>('pending_payment');
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState<string | null>(null);

  const FILTER_LABELS: Record<FilterTab, string> = {
    pending_payment: t('pending'),
    paid: t('statusPaid'),
    ready: t('statusReady'),
    completed: t('statusCompleted'),
  };

  const STATUS_LABELS: Record<OrderStatus, string> = {
    pending_payment: t('awaitingPayment'),
    paid: t('paymentConfirmed'),
    ready: t('readyForPickup'),
    completed: t('statusCompleted'),
  };

  const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
    pending_payment: t('confirmPayment'),
    paid: t('markAsReady'),
    ready: t('markAsDelivered'),
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  async function loadData() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: brandData } = await supabase
      .from('brands')
      .select('id')
      .eq('owner_id', userData.user.id)
      .maybeSingle();

    if (!brandData) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(id, quantity, unit_price_cents, products(name))')
      .eq('brand_id', brandData.id)
      .order('created_at', { ascending: false });

    if (error) {
      showAlert(t('errorLoadingOrders'), error.message);
    } else if (data) {
      setOrders(data as unknown as OrderWithItems[]);
    }
    setLoading(false);
  }

  async function handleAdvance(order: OrderWithItems) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    setAdvancing(order.id);
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id);
    setAdvancing(null);

    if (error) {
      showAlert(t('unableToUpdate'), error.message);
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
  }

  const counts: Record<FilterTab, number> = {
    pending_payment: orders.filter((o) => o.status === 'pending_payment').length,
    paid: orders.filter((o) => o.status === 'paid').length,
    ready: orders.filter((o) => o.status === 'ready').length,
    completed: orders.filter((o) => o.status === 'completed').length,
  };

  const list = orders.filter((o) => o.status === filter);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('orders')}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ gap: 8 }}>
          {(Object.keys(FILTER_LABELS) as FilterTab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.filterChip, filter === tab && styles.filterChipActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>
                {FILTER_LABELS[tab]} {counts[tab] > 0 ? `(${counts[tab]})` : ''}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.secondary} style={{ marginTop: 24 }} />
        ) : list.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={32} color={colors.border} />
            <Text style={styles.emptyText}>{t('noOrdersInStatus', { status: FILTER_LABELS[filter].toLowerCase() })}</Text>
          </View>
        ) : (
          list.map((order) => (
            <View key={order.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.orderIconBox}>
                  <Feather name="shopping-bag" size={16} color={colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderId}>{t('orderNumberPrefix')}{order.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                </View>
                <Text style={styles.orderTotal}>{formatReais(order.total_cents)}</Text>
              </View>

              {order.order_items.length > 0 && (
                <View style={styles.itemsList}>
                  {order.order_items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.products?.name ?? t('product')}
                      </Text>
                      <Text style={styles.itemQty}>x{item.quantity}</Text>
                      <Text style={styles.itemPrice}>{formatReais(item.unit_price_cents * item.quantity)}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Pressable
                style={styles.manageButton}
                onPress={() => navigation.getParent<BrandRootNavigation>()?.navigate('GerenciarProducao', { orderId: order.id })}
              >
                <Feather name="tool" size={13} color={colors.secondary} />
                <Text style={styles.manageButtonText}>{t('manageProduction')}</Text>
              </Pressable>

              <View style={styles.cardFooter}>
                <View style={[styles.statusBadge, STATUS_BADGE_STYLE[order.status]]}>
                  <Text style={[styles.statusText, STATUS_TEXT_STYLE[order.status]]}>
                    {STATUS_LABELS[order.status]}
                  </Text>
                </View>

                {NEXT_STATUS[order.status] && (
                  <Pressable
                    style={[styles.advanceButton, advancing === order.id && styles.advanceButtonDisabled]}
                    onPress={() => handleAdvance(order)}
                    disabled={advancing === order.id}
                  >
                    {advancing === order.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Feather name="arrow-right-circle" size={13} color={colors.primary} />
                        <Text style={styles.advanceButtonText}>{ADVANCE_LABEL[order.status]}</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  header: { backgroundColor: colors.white, paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.secondary },
  scroll: { flex: 1 },
  filterScroll: { marginBottom: 16 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.white },
  filterChipActive: { backgroundColor: colors.secondary },
  filterText: { fontSize: 11, color: colors.secondary },
  filterTextActive: { color: colors.primary, fontWeight: '500' },
  emptyState: { alignItems: 'center', gap: 10, paddingTop: 48 },
  emptyText: { fontSize: 12, color: colors.secondary, opacity: 0.5 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  orderIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  orderId: { fontSize: 13, fontWeight: '600', color: colors.secondary },
  orderDate: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  orderTotal: { fontSize: 14, fontWeight: '700', color: colors.secondary },
  itemsList: { borderTopWidth: 0.5, borderTopColor: colors.surfaceMuted, paddingTop: 10, marginBottom: 12, gap: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { flex: 1, fontSize: 11, color: colors.secondary },
  itemQty: { fontSize: 11, color: colors.textMuted, width: 24, textAlign: 'right' },
  itemPrice: { fontSize: 11, fontWeight: '500', color: colors.secondary, width: 64, textAlign: 'right' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  statusText: { fontSize: 10, fontWeight: '600' },

  advanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginLeft: 'auto',
  },
  advanceButtonDisabled: { opacity: 0.6 },
  advanceButtonText: { fontSize: 11, fontWeight: '500', color: colors.primary },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.surfaceMuted,
  },
  manageButtonText: { fontSize: 12, fontWeight: '500', color: colors.secondary },
});
