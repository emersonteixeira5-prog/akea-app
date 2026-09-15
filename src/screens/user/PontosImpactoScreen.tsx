import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase, type Profile } from '@/services/supabase';
import { useLanguage } from '@/i18n';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { UserTabsParamList } from '@/navigation/UserTabs';

type Props = BottomTabScreenProps<UserTabsParamList, 'PontosTab'>;

type PointsTransaction = {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
  order_id: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function PontosImpactoScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  async function loadData() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }

    const [{ data: profileData }, { data: txData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userData.user.id).maybeSingle(),
      supabase
        .from('points_transactions')
        .select('id, amount, reason, created_at, order_id')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    if (profileData) setProfile(profileData as Profile);
    if (txData) setTransactions(txData as PointsTransaction[]);
    setLoading(false);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('impactPoints')}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('yourBalance')}</Text>
          <Text style={styles.balanceValue}>{profile?.impact_points ?? 0}</Text>
          <Text style={styles.balanceUnit}>{t('points')}</Text>
          <View style={styles.divider} />
          <Text style={styles.conversionText}>{t('pointsConversion')}</Text>
        </View>

        <View style={styles.infoCard}>
          <Feather name="info" size={15} color={colors.secondary} style={{ marginTop: 1 }} />
          <Text style={styles.infoText}>{t('pointsExplain')}</Text>
        </View>

        <Pressable
          style={styles.exploreButton}
          onPress={() => navigation.navigate('HomeTab')}
        >
          <Feather name="shopping-bag" size={15} color={colors.secondary} />
          <Text style={styles.exploreButtonText}>+ {t('explorebrands')}</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>{t('history')}</Text>

        {loading ? (
          <ActivityIndicator color={colors.secondary} style={{ marginTop: 16 }} />
        ) : transactions.length === 0 ? (
          <Text style={styles.emptyText}>{t('noTransactions')}</Text>
        ) : (
          transactions.map((tx) => (
            <View key={tx.id} style={styles.txCard}>
              <View style={styles.txIcon}>
                <Feather name="star" size={16} color={colors.secondary} />
              </View>
              <View style={styles.txBody}>
                <Text style={styles.txReason}>{tx.reason}</Text>
                <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
              </View>
              <Text style={[styles.txAmount, tx.amount < 0 && styles.txAmountNeg]}>
                {tx.amount > 0 ? `+${tx.amount}` : String(tx.amount)}
              </Text>
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
  balanceCard: {
    backgroundColor: colors.secondary,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
  },
  balanceLabel: { fontSize: 12, color: colors.primary, opacity: 0.8, marginBottom: 4 },
  balanceValue: { fontSize: 52, fontWeight: '700', color: colors.primary, lineHeight: 56 },
  balanceUnit: { fontSize: 14, color: colors.primary, opacity: 0.8, marginBottom: 14 },
  divider: { width: 40, height: 1, backgroundColor: colors.primary, opacity: 0.3, marginBottom: 14 },
  conversionText: { fontSize: 12, color: colors.primary, fontWeight: '500' },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 14,
  },
  infoText: { flex: 1, fontSize: 12, color: colors.secondary, lineHeight: 18 },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: colors.secondary,
  },
  exploreButtonText: { fontSize: 13, fontWeight: '600', color: colors.secondary },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    opacity: 0.7,
  },
  emptyText: {
    fontSize: 12,
    color: colors.secondary,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 8,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txBody: { flex: 1 },
  txReason: { fontSize: 12, fontWeight: '500', color: colors.secondary },
  txDate: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700', color: colors.secondary },
  txAmountNeg: { color: colors.danger },
});
