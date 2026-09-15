import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { useLanguage, setLanguage, type Lang } from '@/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';
import { showAlert } from '@/utils/alert';

type Props = NativeStackScreenProps<UserRootStackParamList, 'Idioma'>;

export function IdiomaScreen({ navigation }: Props) {
  const { lang, t } = useLanguage();

  const LANGUAGES: { code: Lang; label: string; subtitle: string }[] = [
    { code: 'pt', label: t('portuguese'), subtitle: t('portugueseSubtitle') },
    { code: 'es', label: t('spanish'), subtitle: t('spanishSubtitle') },
  ];

  async function handleSelect(code: Lang) {
    await setLanguage(code);
    showAlert(t('languageSaved'));
    navigation.goBack();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('languageTitle')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.list}>
        {LANGUAGES.map((item) => {
          const selected = lang === item.code;
          return (
            <Pressable
              key={item.code}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => handleSelect(item.code)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, selected && styles.labelSelected]}>{item.label}</Text>
                <Text style={[styles.subtitle, selected && styles.subtitleSelected]}>{item.subtitle}</Text>
              </View>
              {selected && <Feather name="check" size={18} color={colors.primary} />}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.note}>{t('languageAutoDetectedNote')}</Text>
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
  list: { padding: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 10,
  },
  rowSelected: { backgroundColor: colors.secondary },
  label: { fontSize: 14, fontWeight: '500', color: colors.secondary },
  labelSelected: { color: colors.primary },
  subtitle: { fontSize: 11, color: colors.secondary, opacity: 0.6, marginTop: 2 },
  subtitleSelected: { color: colors.primary, opacity: 0.8 },
  note: {
    fontSize: 11,
    color: colors.secondary,
    opacity: 0.6,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 8,
  },
});
