import { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';
import { useLanguage, type TranslationKey } from '@/i18n';

type Props = NativeStackScreenProps<UserRootStackParamList, 'Ajuda'>;

const FAQ_KEYS: { qKey: TranslationKey; aKey: TranslationKey }[] = [
  { qKey: 'faqDonationHowQ', aKey: 'faqDonationHowA' },
  { qKey: 'faqDonationTimeQ', aKey: 'faqDonationTimeA' },
  { qKey: 'faqPointsEarnQ', aKey: 'faqPointsEarnA' },
  { qKey: 'faqPointsUseQ', aKey: 'faqPointsUseA' },
  { qKey: 'faqBrandApprovalQ', aKey: 'faqBrandApprovalA' },
  { qKey: 'faqDonationCancelQ', aKey: 'faqDonationCancelA' },
  { qKey: 'faqProductsOriginQ', aKey: 'faqProductsOriginA' },
  { qKey: 'faqContactBrandQ', aKey: 'faqContactBrandA' },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  function toggle() {
    const toValue = open ? 0 : 1;
    Animated.timing(anim, { toValue, duration: 200, useNativeDriver: true }).start();
    setOpen((v) => !v);
  }

  const opacity = anim;
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] });

  return (
    <View style={styles.faqItem}>
      <Pressable style={styles.faqQuestion} onPress={toggle}>
        <Text style={styles.faqQuestionText}>{question}</Text>
        <Feather
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.secondary}
        />
      </Pressable>
      {open && (
        <Animated.View style={[styles.faqAnswer, { opacity, transform: [{ translateY }] }]}>
          <Text style={styles.faqAnswerText}>{answer}</Text>
        </Animated.View>
      )}
    </View>
  );
}

export function AjudaScreen({ navigation }: Props) {
  const { t } = useLanguage();
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('helpSupport')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.heroBanner}>
          <View style={styles.heroIcon}>
            <Feather name="help-circle" size={24} color={colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{t('faqTitle')}</Text>
            <Text style={styles.heroSub}>{t('faqHint')}</Text>
          </View>
        </View>

        <View style={styles.faqList}>
          {FAQ_KEYS.map((faq) => (
            <FaqItem key={faq.qKey} question={t(faq.qKey)} answer={t(faq.aKey)} />
          ))}
        </View>

        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>{t('helpNotFoundTitle')}</Text>
          <Text style={styles.supportBody}>
            {t('supportEmailIntro')}{' '}
            <Text style={styles.supportEmail}>suporte@akea.com.br</Text>
            {' '}{t('supportInstagramIntro')}{' '}
            <Text style={styles.supportEmail}>@akea.modacircular</Text>
            {t('supportResponseTime')}
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  heroSub: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  faqList: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 16 },
  faqItem: { borderBottomWidth: 0.5, borderBottomColor: colors.surfaceMuted },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
  },
  faqQuestionText: { flex: 1, fontSize: 13, fontWeight: '500', color: colors.secondary, lineHeight: 18 },
  faqAnswer: { paddingHorizontal: 16, paddingBottom: 14 },
  faqAnswerText: { fontSize: 12, color: colors.textLabel, lineHeight: 18 },
  supportCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16 },
  supportTitle: { fontSize: 13, fontWeight: '600', color: colors.secondary, marginBottom: 8 },
  supportBody: { fontSize: 12, color: colors.textLabel, lineHeight: 18 },
  supportEmail: { color: colors.secondary, fontWeight: '600' },
});
