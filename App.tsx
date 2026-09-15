import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from '@/navigation/RootNavigator';
import { CartProvider } from '@/contexts/CartContext';
import { loadLanguage } from '@/i18n';

export default function App() {
  useEffect(() => { loadLanguage(); }, []);

  return (
    <CartProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </CartProvider>
  );
}