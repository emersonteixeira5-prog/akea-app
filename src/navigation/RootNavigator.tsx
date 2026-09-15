import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { Session } from '@supabase/supabase-js';
import { supabase, type AccountType } from '@/services/supabase';
import { colors } from '@/constants/theme';
import { AuthStack } from '@/navigation/AuthStack';
import { UserRootStack } from '@/navigation/UserRootStack';
import { BrandRootStack } from '@/navigation/BrandRootStack';
import { CompletarPerfilMarcaScreen } from '@/screens/brand/CompletarPerfilMarcaScreen';

// Vídeos demo rotativos para marcas que ainda não subiram um vídeo próprio.

/**
 * Ponto único que decide o que mostrar:
 *  1. Sem sessão → AuthStack (Onboarding/Login/Cadastro)
 *  2. Sessão + account_type = 'brand' SEM pickup_address ainda → tela de
 *     completar perfil da marca, em tela cheia, sem tabs (gate obrigatório
 *     — sem ponto de coleta a marca não consegue operar)
 *  3. Sessão + account_type = 'user' → UserRootStack
 *  4. Sessão + account_type = 'brand' (perfil já completo) → BrandRootStack
 */
export function RootNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [brandNeedsCompletion, setBrandNeedsCompletion] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) fetchAccountInfo(data.session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) fetchAccountInfo(newSession.user.id);
      else {
        setAccountType(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchAccountInfo(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      const type = data.account_type as AccountType;
      setAccountType(type);

      if (type === 'brand') {
        const { data: brandData } = await supabase
          .from('brands')
          .select('id, pickup_address, video_url')
          .eq('owner_id', userId)
          .maybeSingle();
        setBrandNeedsCompletion(!brandData?.pickup_address);
      }
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
        <ActivityIndicator color={colors.secondary} size="large" />
      </View>
    );
  }

  if (session && accountType === 'brand' && brandNeedsCompletion) {
    return (
      <NavigationContainer>
        <CompletarPerfilMarcaScreen onDone={() => setBrandNeedsCompletion(false)} />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {!session ? <AuthStack /> : accountType === 'brand' ? <BrandRootStack /> : <UserRootStack />}
    </NavigationContainer>
  );
}
