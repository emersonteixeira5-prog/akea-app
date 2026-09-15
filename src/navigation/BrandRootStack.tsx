import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BrandTabs } from '@/navigation/BrandTabs';
import { PostarResultadoScreen } from '@/screens/brand/PostarResultadoScreen';
import { GerenciarProducaoScreen } from '@/screens/brand/GerenciarProducaoScreen';
import { FilaDoacoesScreen } from '@/screens/brand/FilaDoacoesScreen';

export type BrandRootStackParamList = {
  BrandTabs: undefined;
  PostarResultado: { donationId: string };
  GerenciarProducao: { orderId: string };
  FilaDoacoes: undefined;
};

/** Ver a nota em UserRootNavigation. */
export type BrandRootNavigation = NativeStackNavigationProp<BrandRootStackParamList>;

const Stack = createNativeStackNavigator<BrandRootStackParamList>();

export function BrandRootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BrandTabs" component={BrandTabs} />
      <Stack.Screen name="PostarResultado" component={PostarResultadoScreen} />
      <Stack.Screen name="GerenciarProducao" component={GerenciarProducaoScreen} />
      <Stack.Screen name="FilaDoacoes" component={FilaDoacoesScreen} />
    </Stack.Navigator>
  );
}
