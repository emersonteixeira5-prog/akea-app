import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';

/**
 * Envolve telas de formulário (Login, Cadastro, Completar perfil) garantindo
 * que o conteúdo role e fique acessível mesmo com o teclado aberto — sem
 * isso, em telas com vários campos o teclado pode cobrir o botão de
 * submit e parecer que "nada funciona" quando na verdade o usuário só não
 * está conseguindo tocar no botão real.
 */
export function AuthScreenLayout({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.content, style]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.primary },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
});
