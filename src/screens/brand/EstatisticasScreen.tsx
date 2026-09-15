import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useLanguage } from '@/i18n';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { BrandTabsParamList } from '@/navigation/BrandTabs';

type Props = BottomTabScreenProps<BrandTabsParamList, 'EstatisticasTab'>;
type Period = '7d' | '30d' | '90d';

type ProductStat = {
  name: string;
  count: number;
  total_cents: number;
};

function formatReais(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

export function EstatisticasScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [activeProducts, setActiveProducts] = useState(0);
  const [soldProducts, setSoldProducts] = useState(0);
  const [topProducts, setTopProducts] = useState<ProductStat[]>([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => loadData(period));
    return unsubscribe;
  }, [navigation, period]);

  useEffect(() => {
    loadData(period);
  }, [period]);

  async function loadData(p: Period) {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: brandData } = await supabase
      .from('brands')
      .select('id')
      .eq('owner_id', userData.user.id)
      .maybeSingle();
    if (!brandData) { setLoading(false); return; }

    const bId = brandData.id;

    const days = p === '7d' ? 7 : p === '30d' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();

    const [
      ordersRes,
      followersRes,
      activeRes,
      soldRes,
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total_cents, status, created_at')
        .eq('brand_id', bId)
        .gte('created_at', sinceIso),
      supabase
        .from('brand_followers')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', bId),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', bId)
        .eq('status', 'active'),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', bId)
        .eq('status', 'sold'),
    ]);

    const orders = ordersRes.data ?? [];
    const total = orders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
    const completed = orders.filter((o) => o.status === 'completed').length;

    setTotalSales(total);
    setTotalOrders(orders.length);
    setCompletedOrders(completed);
    setFollowers(followersRes.count ?? 0);
    setActiveProducts(activeRes.count ?? 0);
    setSoldProducts(soldRes.count ?? 0);

    if (orders.length > 0) {
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('product_id, price_cents, products(name)')
        .in(
          'order_id',
          orders.map((o) => o.id)
        );

      if (itemsData) {
        const productMap: Record<string, ProductStat> = {};
        itemsData.forEach((item: any) => {
          const name = item.products?.name ?? t('product');
          if (!productMap[item.product_id]) {
            productMap[item.product_id] = {
              name,
              count: 0,
              total_cents: 0,
            };
          }
          productMap[item.product_id].count += 1;
          productMap[item.product_id].total_cents += item.price_cents ?? 0;
        });
        const sorted = Object.values(productMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setTopProducts(sorted);
      }
    } else {
      setTopProducts([]);
    }

    setLoading(false);
  }

  const maxSales = Math.max(...topProducts.map((p) => p.count), 1);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('statistics')}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
      >
        <View style={styles.periodRow}>
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <Pressable
              key={p}
              style={[
                styles.periodChip,
                period === p && styles.periodChipActive,
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  styles.periodText,
                  period === p && styles.periodTextActive,
                ]}
              >
                {p === '7d' ? t('sevenDays') : p === '30d' ? t('thirtyDays') : t('ninetyDays')}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.secondary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, styles.metricCardHighlight]}>
                <Text style={styles.metricLabelHighlight}>{t('revenue')}</Text>
                <Text style={styles.metricValueHighlight}>{formatReais(totalSales)}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{t('orders')}</Text>
                <Text style={styles.metricValue}>{totalOrders}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{t('statusCompleted')}</Text>
                <Text style={styles.metricValue}>{completedOrders}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{t('followers')}</Text>
                <Text style={styles.metricValue}>{followers}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{t('activeProducts')}</Text>
                <Text style={styles.metricValue}>{activeProducts}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{t('soldPieces')}</Text>
                <Text style={styles.metricValue}>{soldProducts}</Text>
              </View>
            </View>

            {totalOrders > 0 && (
              <View style={styles.conversionCard}>
                <Feather name="trending-up" size={18} color={colors.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.conversionTitle}>{t('completionRate')}</Text>
                  <Text style={styles.conversionValue}>
                    {Math.round((completedOrders / totalOrders) * 100)}{t('ordersCompletedSuffix')}
                  </Text>
                </View>
              </View>
            )}

            {topProducts.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t('topSellingProducts')}</Text>
                <View style={styles.chartCard}>
                  {topProducts.map((product, index) => (
                    <View key={index} style={styles.barRow}>
                      <Text style={styles.barLabel} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <View style={styles.barContainer}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${(product.count / maxSales) * 100}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.barValue}>{product.count}{t('timesSuffix')}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {totalOrders > 0 && (
              <View style={styles.ticketCard}>
                <Text style={styles.ticketLabel}>{t('averageTicket')}</Text>
                <Text style={styles.ticketValue}>
                  {formatReais(Math.round(totalSales / totalOrders))}
                </Text>
                <Text style={styles.ticketSub}>{t('perOrder')}</Text>
              </View>
            )}

            {totalOrders === 0 && (
              <Text style={styles.emptyText}>{t('noOrdersInPeriod')}</Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  scroll: { flex: 1 },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  periodChipActive: { backgroundColor: colors.secondary },
  periodText: { fontSize: 12, color: colors.secondary, fontWeight: '500' },
  periodTextActive: { color: colors.primary },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
  },
  metricCardHighlight: {
    backgroundColor: colors.secondary,
    width: '100%',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 4,
  },
  metricLabelHighlight: {
    fontSize: 10,
    color: colors.primary,
    opacity: 0.85,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
  },
  metricValueHighlight: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  conversionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 18,
  },
  conversionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  conversionValue: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 10,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    width: 90,
    fontSize: 11,
    color: colors.secondary,
  },
  barContainer: {
    flex: 1,
    height: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    backgroundColor: colors.secondary,
    borderRadius: 5,
  },
  barValue: {
    width: 28,
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
    textAlign: 'right',
  },
  ticketCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: 'center',
  },
  ticketLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  ticketValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.secondary,
  },
  ticketSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: colors.secondary,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 30,
  },
});
