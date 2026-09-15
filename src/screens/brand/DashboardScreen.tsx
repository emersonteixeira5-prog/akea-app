import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { useLanguage, type TranslationKey } from '@/i18n';
import { supabase, type Brand } from '@/services/supabase';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { BrandTabsParamList } from '@/navigation/BrandTabs';
import type { BrandRootNavigation } from '@/navigation/BrandRootStack';

type Props = BottomTabScreenProps<BrandTabsParamList, 'DashboardTab'>;

const COMMISSION_RATE = 0.1;

type ActivityItem = {
  id: string;
  kind: 'order' | 'donation';
  label: string;
  subtitle: string;
  amountCents?: number;
  createdAt: string;
};

function formatReais(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

function timeAgo(dateString: string, t: (key: TranslationKey, params?: Record<string, string | number>) => string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return t('justNow');
  if (hours < 24) return t('hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('daysAgo', { count: days });
}

export function DashboardScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [salesCents, setSalesCents] = useState(0);
  const [pendingDonations, setPendingDonations] = useState(0);
  const [activeProducts, setActiveProducts] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  async function loadData() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: brandData } = await supabase.from('brands').select('*').eq('owner_id', userData.user.id).maybeSingle();
    if (!brandData) {
      setLoading(false);
      return;
    }
    setBrand(brandData as Brand);
    const brandId = brandData.id;

    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [ordersRes, pendingRes, productsRes, followersRes, recentOrdersRes, recentDonationsRes] = await Promise.all([
      supabase.from('orders').select('total_cents').eq('brand_id', brandId).gte('created_at', firstDayOfMonth).in('status', ['paid', 'ready', 'completed']),
      supabase.from('donations').select('id', { count: 'exact', head: true }).eq('brand_id', brandId).in('status', ['registered', 'received']),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('brand_id', brandId).eq('status', 'active'),
      supabase.from('brand_followers').select('id', { count: 'exact', head: true }).eq('brand_id', brandId),
      supabase.from('orders').select('id, total_cents, created_at').eq('brand_id', brandId).order('created_at', { ascending: false }).limit(3),
      supabase.from('donations').select('id, status, created_at').eq('brand_id', brandId).order('created_at', { ascending: false }).limit(3),
    ]);

    const monthSales = (ordersRes.data ?? []).reduce((sum, o: any) => sum + o.total_cents, 0);
    setSalesCents(monthSales);
    setPendingDonations(pendingRes.count ?? 0);
    setActiveProducts(productsRes.count ?? 0);
    setFollowers(followersRes.count ?? 0);

    const orderItems: ActivityItem[] = (recentOrdersRes.data ?? []).map((o: any) => ({
      id: `order-${o.id}`,
      kind: 'order',
      label: t('newOrderLabel'),
      subtitle: timeAgo(o.created_at, t),
      amountCents: o.total_cents,
      createdAt: o.created_at,
    }));
    const donationItems: ActivityItem[] = (recentDonationsRes.data ?? []).map((d: any) => ({
      id: `donation-${d.id}`,
      kind: 'donation',
      label: d.status === 'registered' ? t('donationReceivedPending') : t('donationUpdated'),
      subtitle: timeAgo(d.created_at, t),
      createdAt: d.created_at,
    }));

    const merged = [...orderItems, ...donationItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    setActivity(merged);

    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.secondary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>{t('brandModeLabel')}</Text>
          <Text style={styles.headerTitle}>{brand?.name ?? t('yourBrand')}</Text>
        </View>
        <Feather name="bell" size={20} color={colors.secondary} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('monthlySales')}</Text>
            <Text style={styles.metricValue}>{formatReais(salesCents)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('commission')}</Text>
            <Text style={styles.metricValue}>{formatReais(Math.round(salesCents * COMMISSION_RATE))}</Text>
          </View>
          <Pressable
            style={[styles.metricCard, styles.metricCardHighlight]}
            onPress={() => navigation.getParent<BrandRootNavigation>()?.navigate('FilaDoacoes')}
          >
            <Text style={styles.metricLabelHighlight}>{t('pendingDonations')}</Text>
            <Text style={styles.metricValueHighlight}>{pendingDonations}</Text>
          </Pressable>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('activeProducts')}</Text>
            <Text style={styles.metricValue}>{activeProducts}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('followers')}</Text>
            <Text style={styles.metricValue}>{followers}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.actionPrimary} onPress={() => navigation.navigate('EstatisticasTab')}>
            <Text style={styles.actionPrimaryText}>{t('viewStatistics')}</Text>
          </Pressable>
          <Pressable style={styles.actionSecondary} onPress={() => navigation.navigate('CatalogoTab')}>
            <Text style={styles.actionSecondaryText}>{t('addProductButton')}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>{t('recentActivity')}</Text>

        {activity.length === 0 ? (
          <Text style={styles.emptyText}>{t('noActivity')}</Text>
        ) : (
          activity.map((item) => (
            <View key={item.id} style={styles.activityCard}>
              <View style={[styles.activityIcon, item.kind === 'order' && styles.activityIconOrder]}>
                {item.kind === 'order' ? (
                  <Feather name="shopping-bag" size={15} color={colors.secondary} />
                ) : (
                  <Image
                    source={require('../../../assets/logo-icon.png')}
                    style={styles.brandMark}
                    resizeMode="contain"
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityLabel}>{item.label}</Text>
                <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
              </View>
              {item.amountCents != null && <Text style={styles.activityAmount}>{formatReais(item.amountCents)}</Text>}
            </View>
          ))
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerSubtitle: { fontSize: 11, color: colors.textMuted },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.secondary },
  scroll: { flex: 1 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  metricCard: { width: '47%', backgroundColor: colors.white, borderRadius: radius.lg, padding: 14 },
  metricCardHighlight: { backgroundColor: colors.secondary },
  metricLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 4 },
  metricLabelHighlight: { fontSize: 10, color: colors.primary, opacity: 0.85, marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: '700', color: colors.secondary },
  metricValueHighlight: { fontSize: 18, fontWeight: '700', color: colors.primary },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  actionPrimary: { flex: 1, height: 42, backgroundColor: colors.secondary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actionPrimaryText: { fontSize: 12, fontWeight: '500', color: colors.primary },
  actionSecondary: { flex: 1, height: 42, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.secondary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actionSecondaryText: { fontSize: 12, fontWeight: '500', color: colors.secondary },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.secondary, marginBottom: 12 },
  emptyText: { fontSize: 12, color: colors.secondary, opacity: 0.6 },
  activityCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.md, padding: 12, marginBottom: 8 },
  activityIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  activityIconOrder: { backgroundColor: colors.primary },
  brandMark: { width: 16, height: 16 },
  activityLabel: { fontSize: 12, fontWeight: '500', color: colors.secondary },
  activitySubtitle: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  activityAmount: { fontSize: 12, fontWeight: '600', color: colors.secondary },
});