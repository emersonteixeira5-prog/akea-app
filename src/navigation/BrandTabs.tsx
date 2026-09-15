import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { useLanguage } from '@/i18n';
import { DashboardScreen } from '@/screens/brand/DashboardScreen';
import { CatalogoScreen } from '@/screens/brand/CatalogoScreen';
import { EstatisticasScreen } from '@/screens/brand/EstatisticasScreen';
import { PerfilMarcaConfigScreen } from '@/screens/brand/PerfilMarcaConfigScreen';
import { PedidosScreen } from '@/screens/brand/PedidosScreen';

export type BrandTabsParamList = {
  DashboardTab: undefined;
  CatalogoTab: undefined;
  EstatisticasTab: undefined;
  PedidosTab: undefined;
  PerfilTab: undefined;
};

const Tab = createBottomTabNavigator<BrandTabsParamList>();

export function BrandTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { height: 68 },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{ tabBarLabel: t('dashboardTab'), tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="CatalogoTab"
        component={CatalogoScreen}
        options={{ tabBarLabel: t('catalog'), tabBarIcon: ({ color, size }) => <Feather name="shopping-bag" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="EstatisticasTab"
        component={EstatisticasScreen}
        options={{
          tabBarLabel: t('statistics'),
          tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="PedidosTab"
        component={PedidosScreen}
        options={{ tabBarLabel: t('orders'), tabBarIcon: ({ color, size }) => <Feather name="file-text" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={PerfilMarcaConfigScreen}
        options={{ tabBarLabel: t('profile'), tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}
