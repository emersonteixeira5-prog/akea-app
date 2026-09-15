import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius } from '@/constants/theme';
import { useLanguage } from '@/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';

type Props = NativeStackScreenProps<UserRootStackParamList, 'Notificacoes'>;

const STORAGE_KEY = '@akea:notif_prefs';

type Prefs = {
  marcas: boolean;
  doacoes: boolean;
  promocoes: boolean;
};

const DEFAULT_PREFS: Prefs = { marcas: true, doacoes: true, promocoes: false };

const TOGGLES: { key: keyof Prefs; icon: keyof typeof Feather.glyphMap; labelKey: 'notifBrandsLabel' | 'notifDonationsLabel' | 'notifPromoLabel'; descKey: 'notifBrandsDesc' | 'notifDonationsDesc' | 'notifPromoDesc' }[] = [
  {
    key: 'marcas',
    icon: 'scissors',
    labelKey: 'notifBrandsLabel',
    descKey: 'notifBrandsDesc',
  },
  {
    key: 'doacoes',
    icon: 'refresh-cw',
    labelKey: 'notifDonationsLabel',
    descKey: 'notifDonationsDesc',
  },
  {
    key: 'promocoes',
    icon: 'tag',
    labelKey: 'notifPromoLabel',
    descKey: 'notifPromoDesc',
  },
];

export function NotificacoesScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); } catch { /* use defaults */ }
      }
      setLoading(false);
    });
  }, []);

  async function toggle(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('notifications')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={colors.secondary} style={{ marginTop: 32 }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>{t('notifPreferencesTitle')}</Text>

            <View style={styles.card}>
              {TOGGLES.map((item, i) => (
                <View
                  key={item.key}
                  style={[styles.row, i < TOGGLES.length - 1 && styles.rowBorder]}
                >
                  <View style={styles.iconBox}>
                    <Feather name={item.icon} size={17} color={colors.secondary} />
                  </View>
                  <View style={styles.textBlock}>
                    <Text style={styles.rowLabel}>{t(item.labelKey)}</Text>
                    <Text style={styles.rowDesc}>{t(item.descKey)}</Text>
                  </View>
                  <Switch
                    value={prefs[item.key]}
                    onValueChange={() => toggle(item.key)}
                    trackColor={{ false: colors.border, true: colors.secondary }}
                    thumbColor={colors.white}
                  />
                </View>
              ))}
            </View>

            <View style={styles.infoCard}>
              <Feather name="info" size={14} color={colors.secondary} />
              <Text style={styles.infoText}>
                {t('notifSystemInfo')}
              </Text>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 15, fontWeight: '600', color: colors.secondary },
  scroll: { flex: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: colors.textLabel, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.surfaceMuted },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: { flex: 1 },
  rowLabel: { fontSize: 13, fontWeight: '500', color: colors.secondary },
  rowDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 15 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
  },
  infoText: { flex: 1, fontSize: 11, color: colors.textLabel, lineHeight: 16 },
});
