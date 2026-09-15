import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UserTabs } from '@/navigation/UserTabs';
import { CompletarPerfilUsuarioScreen } from '@/screens/user/CompletarPerfilUsuarioScreen';
import { PerfilMarcaScreen } from '@/screens/user/PerfilMarcaScreen';
import { DetalhesProdutoScreen } from '@/screens/user/DetalhesProdutoScreen';
import { CarrinhoScreen } from '@/screens/user/CarrinhoScreen';
import { CheckoutScreen } from '@/screens/user/CheckoutScreen';
import { MeusPedidosScreen } from '@/screens/user/MeusPedidosScreen';
import { MinhasDoacoesScreen } from '@/screens/user/MinhasDoacoesScreen';
import { EnderecosScreen } from '@/screens/user/EnderecosScreen';
import { MetodosPagamentoScreen } from '@/screens/user/MetodosPagamentoScreen';
import { TermosScreen } from '@/screens/user/TermosScreen';
import { AjudaScreen } from '@/screens/user/AjudaScreen';
import { NotificacoesScreen } from '@/screens/user/NotificacoesScreen';
import { AcompanharProducaoScreen } from '@/screens/user/AcompanharProducaoScreen';
import { IdiomaScreen } from '@/screens/user/IdiomaScreen';
import { MarcasQueSegueScreen } from '@/screens/user/MarcasQueSegueScreen';

export type UserRootStackParamList = {
  UserTabs: undefined;
  // mantidas no tipo para os arquivos de tela não quebrarem o tsc
  RegistrarDoacao: undefined;
  AcompanharDoacao: { donationId: string };
  CompletarPerfil: undefined;
  PerfilMarca: { brandId: string; brandName: string };
  DetalhesProduto: { productId: string; productName: string };
  Carrinho: undefined;
  Checkout: undefined;
  MeusPedidos: undefined;
  MinhasDoacoes: undefined;
  Enderecos: undefined;
  MetodosPagamento: undefined;
  Termos: undefined;
  Ajuda: undefined;
  Notificacoes: undefined;
  AcompanharProducao: { orderId: string };
  Idioma: undefined;
  MarcasQueSigo: undefined;
};

/**
 * Tipo do `navigation` desta stack, para as telas das abas alcançarem as
 * rotas daqui via `getParent<UserRootNavigation>()`. Sem isso o getParent()
 * vem sem tipo e o `as any` deixava passar rota inexistente — e até chamada
 * em tela que não tem pai, onde o `?.` engolia a navegação em silêncio.
 */
export type UserRootNavigation = NativeStackNavigationProp<UserRootStackParamList>;

const Stack = createNativeStackNavigator<UserRootStackParamList>();

export function UserRootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UserTabs" component={UserTabs} />
      <Stack.Screen name="PerfilMarca" component={PerfilMarcaScreen} />
      <Stack.Screen name="DetalhesProduto" component={DetalhesProdutoScreen} />
      <Stack.Screen name="Carrinho" component={CarrinhoScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="CompletarPerfil" component={CompletarPerfilUsuarioScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="MeusPedidos" component={MeusPedidosScreen} />
      <Stack.Screen name="MinhasDoacoes" component={MinhasDoacoesScreen} />
      <Stack.Screen name="Enderecos" component={EnderecosScreen} />
      <Stack.Screen name="MetodosPagamento" component={MetodosPagamentoScreen} />
      <Stack.Screen name="Termos" component={TermosScreen} />
      <Stack.Screen name="Ajuda" component={AjudaScreen} />
      <Stack.Screen name="Notificacoes" component={NotificacoesScreen} />
      <Stack.Screen name="AcompanharProducao" component={AcompanharProducaoScreen} />
      <Stack.Screen name="Idioma" component={IdiomaScreen} />
      <Stack.Screen name="MarcasQueSigo" component={MarcasQueSegueScreen} />
    </Stack.Navigator>
  );
}
