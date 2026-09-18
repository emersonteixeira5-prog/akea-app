import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { useLanguage, setLanguage, type Lang } from '@/i18n';

/**
 * Alternador PT/ES para as telas de fora do app (onboarding, login,
 * cadastro).
 *
 * A tela de Idioma completa só existe dentro da área logada do usuário
 * (UserRootStack), então quem abre o link e cai no onboarding ficava preso
 * no idioma que a detecção automática escolheu — e a detecção lê o idioma
 * do navegador, não o país. Um colombiano com o Chrome em inglês via o app
 * inteiro num idioma que não é o dele, sem nenhuma saída visível.
 *
 * Fica curto de propósito ("PT"/"ES"): é overlay sobre foto no onboarding e
 * canto de formulário no login, onde não cabe o nome do idioma por extenso.
 */
const OPTIONS: { code: Lang; label: string; nameKey: 'portuguese' | 'spanish' }[] = [
  { code: 'pt', label: 'PT', nameKey: 'portuguese' },
  { code: 'es', label: 'ES', nameKey: 'spanish' },
];

export function LanguageToggle({ style }: { style?: ViewStyle }) {
  const { lang, t } = useLanguage();

  return (
    <View style={[styles.container, style]}>
      {OPTIONS.map((option) => {
        const selected = lang === option.code;
        return (
          <Pressable
            key={option.code}
            onPress={() => { void setLanguage(option.code); }}
            style={[styles.option, selected && styles.optionSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={t(option.nameKey)}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    padding: 3,
    gap: 2,
  },
  option: {
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: { backgroundColor: colors.secondary },
  label: { fontSize: 12, fontWeight: '600', color: colors.secondary, opacity: 0.55 },
  labelSelected: { color: colors.primary, opacity: 1 },
});
