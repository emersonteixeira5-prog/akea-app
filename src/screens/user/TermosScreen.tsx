import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';
import { useLanguage } from '@/i18n';

type Props = NativeStackScreenProps<UserRootStackParamList, 'Termos'>;

export function TermosScreen({ navigation }: Props) {
  const { t } = useLanguage();

  const SECTIONS = [
    { title: t('termsSectionTitle1'), body: t('termsSectionBody1') },
    { title: t('termsSectionTitle2'), body: t('termsSectionBody2') },
    { title: t('termsSectionTitle3'), body: t('termsSectionBody3') },
    { title: t('termsSectionTitle4'), body: t('termsSectionBody4') },
    { title: t('termsSectionTitle5'), body: t('termsSectionBody5') },
    { title: t('termsSectionTitle6'), body: t('termsSectionBody6') },
    { title: t('termsSectionTitle7'), body: t('termsSectionBody7') },
    { title: t('termsSectionTitle8'), body: t('termsSectionBody8') },
    { title: t('termsSectionTitle9'), body: t('termsSectionBody9') },
    { title: t('termsSectionTitle10'), body: t('termsSectionBody10') },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('termsHeaderTitle')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.heroBanner}>
          <Feather name="file-text" size={24} color={colors.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{t('termsHeroTitle')}</Text>
            <Text style={styles.heroDate}>{t('termsVersionInfo')}</Text>
          </View>
        </View>

        <Text style={styles.intro}>
          {t('termsIntro')}
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.contactCard}>
          <Feather name="mail" size={16} color={colors.secondary} />
          <Text style={styles.contactText}>
            {t('termsContactText')}{'\n'}
            <Text style={styles.contactEmail}>privacidade@akea.com.br</Text>
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
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
  },
  heroTitle: { fontSize: 13, fontWeight: '600', color: colors.secondary },
  heroDate: { fontSize: 10, color: colors.textMuted, marginTop: 3 },
  intro: { fontSize: 12, color: colors.textLabel, lineHeight: 18, marginBottom: 16 },
  section: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.secondary, marginBottom: 8 },
  sectionBody: { fontSize: 12, color: colors.textLabel, lineHeight: 18 },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 8,
  },
  contactText: { fontSize: 12, color: colors.textLabel, lineHeight: 18 },
  contactEmail: { color: colors.secondary, fontWeight: '600' },
});
