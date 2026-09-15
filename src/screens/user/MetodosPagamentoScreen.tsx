import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';
import { useLanguage } from '@/i18n';

type Props = NativeStackScreenProps<UserRootStackParamList, 'MetodosPagamento'>;

export function MetodosPagamentoScreen({ navigation }: Props) {
  const { t } = useLanguage();

  const INFO_ITEMS: { icon: keyof typeof Feather.glyphMap; title: string; body: string }[] = [
    {
      icon: 'zap',
      title: t('paymentPixInfoTitle'),
      body: t('paymentPixInfoBody'),
    },
    {
      icon: 'shield',
      title: t('paymentSecureInfoTitle'),
      body: t('paymentSecureInfoBody'),
    },
    {
      icon: 'credit-card',
      title: t('paymentCardSoonTitle'),
      body: t('paymentCardSoonBody'),
    },
    {
      icon: 'lock',
      title: t('paymentNoDataStorageTitle'),
      body: t('paymentNoDataStorageBody'),
    },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('paymentMethods')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.heroBanner}>
          <View style={styles.heroIcon}>
            <Feather name="zap" size={28} color={colors.secondary} />
          </View>
          <Text style={styles.heroTitle}>{t('paymentHeroTitle')}</Text>
          <Text style={styles.heroSub}>
            {t('paymentHeroSub')}
          </Text>
        </View>

        {INFO_ITEMS.map((item) => (
          <View key={item.title} style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Feather name={item.icon} size={18} color={colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>{item.title}</Text>
              <Text style={styles.infoBody}>{item.body}</Text>
            </View>
          </View>
        ))}

        <View style={styles.pixExample}>
          <Text style={styles.pixExampleLabel}>{t('pixHowItWorks')}</Text>
          {[
            { step: '1', text: t('pixStep1') },
            { step: '2', text: t('pixStep2') },
            { step: '3', text: t('pixStep3') },
            { step: '4', text: t('pixStep4') },
          ].map((s) => (
            <View key={s.step} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{s.step}</Text>
              </View>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          ))}
        </View>
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

  heroBanner: {
    backgroundColor: colors.secondary,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 17, fontWeight: '600', color: colors.primary, textAlign: 'center' },
  heroSub: { fontSize: 12, color: colors.primary, opacity: 0.8, textAlign: 'center', lineHeight: 18 },

  infoCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoTitle: { fontSize: 13, fontWeight: '600', color: colors.secondary, marginBottom: 4 },
  infoBody: { fontSize: 12, color: colors.textLabel, lineHeight: 17 },

  pixExample: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginTop: 8, gap: 14 },
  pixExampleLabel: { fontSize: 12, fontWeight: '600', color: colors.secondary, marginBottom: 4 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  stepText: { flex: 1, fontSize: 12, color: colors.textLabel, lineHeight: 18 },
});
