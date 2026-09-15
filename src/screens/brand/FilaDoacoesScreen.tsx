import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase, type Donation } from '@/services/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BrandRootStackParamList } from '@/navigation/BrandRootStack';
import { useLanguage } from '@/i18n';
import { showAlert } from '@/utils/alert';

type Props = NativeStackScreenProps<BrandRootStackParamList, 'FilaDoacoes'>;
type FilterTab = 'pending' | 'accepted' | 'rejected';

type DonationWithDonor = Donation & { profiles: { full_name: string } | null };

function timeAgo(dateString: string, t: ReturnType<typeof useLanguage>['t']) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return t('justNow');
  if (hours < 24) return t('hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('daysAgo', { count: days });
}

export function FilaDoacoesScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [donations, setDonations] = useState<DonationWithDonor[]>([]);
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  async function loadData() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: brandData } = await supabase.from('brands').select('id').eq('owner_id', userData.user.id).maybeSingle();
    if (!brandData) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('donations')
      .select('*, profiles(full_name)')
      .eq('brand_id', brandData.id)
      .order('created_at', { ascending: false });

    if (data) setDonations(data as unknown as DonationWithDonor[]);
    setLoading(false);
  }

  async function handleAccept(donationId: string) {
    const { error } = await supabase.from('donations').update({ status: 'evaluated' }).eq('id', donationId);
    if (error) {
      showAlert(t('unableToAccept'), error.message);
      return;
    }
    loadData();
  }

  async function handleReject(donationId: string) {
    const { error } = await supabase.from('donations').update({ status: 'rejected' }).eq('id', donationId);
    if (error) {
      showAlert(t('unableToReject'), error.message);
      return;
    }
    loadData();
  }

  function handlePostResult(donationId: string) {
    navigation.navigate('PostarResultado', { donationId });
  }

  const pending = donations.filter((d) => ['registered', 'received'].includes(d.status));
  const accepted = donations.filter((d) => ['evaluated', 'transforming', 'completed'].includes(d.status));
  const rejected = donations.filter((d) => d.status === 'rejected');

  const list = filter === 'pending' ? pending : filter === 'accepted' ? accepted : rejected;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('donationsQueue')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.filterRow}>
          <Pressable style={[styles.filterChip, filter === 'pending' && styles.filterChipActive]} onPress={() => setFilter('pending')}>
            <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>{t('pending')} ({pending.length})</Text>
          </Pressable>
          <Pressable style={[styles.filterChip, filter === 'accepted' && styles.filterChipActive]} onPress={() => setFilter('accepted')}>
            <Text style={[styles.filterText, filter === 'accepted' && styles.filterTextActive]}>{t('accepted')} ({accepted.length})</Text>
          </Pressable>
          <Pressable style={[styles.filterChip, filter === 'rejected' && styles.filterChipActive]} onPress={() => setFilter('rejected')}>
            <Text style={[styles.filterText, filter === 'rejected' && styles.filterTextActive]}>{t('rejected')} ({rejected.length})</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.secondary} style={{ marginTop: 16 }} />
        ) : list.length === 0 ? (
          <Text style={styles.emptyText}>{t('nothingHereYet')}</Text>
        ) : (
          list.map((donation) => (
            <View key={donation.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Feather name="user" size={16} color={colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.donorName}>{donation.profiles?.full_name || t('donor')}</Text>
                  <Text style={styles.timeText}>{t('receivedLabel')} {timeAgo(donation.created_at, t)}</Text>
                </View>
              </View>

              <View style={styles.tagsRow}>
                {donation.material_types.map((m) => (
                  <View key={m} style={styles.tag}>
                    <Text style={styles.tagText}>{m}</Text>
                  </View>
                ))}
              </View>

              {filter === 'pending' && (
                <View style={styles.actionsRow}>
                  <Pressable style={styles.rejectButton} onPress={() => handleReject(donation.id)}>
                    <Text style={styles.rejectButtonText}>{t('reject')}</Text>
                  </Pressable>
                  <Pressable style={styles.acceptButton} onPress={() => handleAccept(donation.id)}>
                    <Text style={styles.acceptButtonText}>{t('accept')}</Text>
                  </Pressable>
                </View>
              )}

              {filter === 'accepted' && donation.status !== 'completed' && (
                <Pressable style={styles.postButton} onPress={() => handlePostResult(donation.id)}>
                  <Text style={styles.postButtonText}>{t('postResultTitle')}</Text>
                </Pressable>
              )}

              {donation.status === 'completed' && (
                <View style={styles.completedBadge}>
                  <Feather name="check-circle" size={13} color={colors.success} />
                  <Text style={styles.completedText}>{t('resultAlreadyPosted')}</Text>
                </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.secondary },
  scroll: { flex: 1 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.white },
  filterChipActive: { backgroundColor: colors.secondary },
  filterText: { fontSize: 11, color: colors.secondary },
  filterTextActive: { color: colors.primary, fontWeight: '500' },
  emptyText: { fontSize: 12, color: colors.secondary, opacity: 0.6 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  donorName: { fontSize: 12, fontWeight: '500', color: colors.secondary },
  timeText: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, color: colors.secondary },
  actionsRow: { flexDirection: 'row', gap: 8 },
  rejectButton: { flex: 1, height: 38, borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rejectButtonText: { fontSize: 12, fontWeight: '500', color: colors.danger },
  acceptButton: { flex: 1, height: 38, backgroundColor: colors.secondary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  acceptButtonText: { fontSize: 12, fontWeight: '500', color: colors.primary },
  postButton: { height: 38, backgroundColor: colors.secondary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  postButtonText: { fontSize: 12, fontWeight: '500', color: colors.primary },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  completedText: { fontSize: 11, color: colors.success },
});