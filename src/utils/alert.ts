import { Alert, Platform } from 'react-native';

export type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/**
 * Alerta que funciona também na web.
 *
 * O react-native-web não implementa Alert — a classe existe e o método é
 * um corpo vazio. Na prática todo aviso de erro do app simplesmente sumia
 * no navegador: o usuário clicava em salvar, nada acontecia e nenhuma
 * mensagem aparecia, mesmo quando o Supabase devolvia erro.
 *
 * No nativo repassa para o Alert do RN sem mudar nada. Na web cai para os
 * diálogos do browser.
 *
 * Limitação: window.confirm só tem dois botões. Com três ou mais opções a
 * web mostra a última ação não-cancelar contra o cancelar; se precisar de
 * um menu de verdade, use um modal em vez desta função.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }

  if (buttons.length === 1) {
    window.alert(text);
    buttons[0].onPress?.();
    return;
  }

  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const confirmButton = buttons.filter((b) => b.style !== 'cancel').pop();

  if (window.confirm(text)) confirmButton?.onPress?.();
  else cancelButton?.onPress?.();
}
