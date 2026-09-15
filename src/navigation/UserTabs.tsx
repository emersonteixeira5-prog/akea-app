import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { HomeScreen } from '@/screens/user/HomeScreen';
import { BuscarScreen } from '@/screens/user/BuscarScreen';
import { PontosImpactoScreen } from '@/screens/user/PontosImpactoScreen';
import { PerfilScreen } from '@/screens/user/PerfilScreen';
import { useLanguage } from '@/i18n';

export type UserTabsParamList = {
  HomeTab: undefined;
  BuscarTab: undefined;
  PontosTab: undefined;
  PerfilTab: undefined;
};

const Tab = createBottomTabNavigator<UserTabsParamList>();

export function UserTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { height: 68, paddingTop: 6 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: t('home'), tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="BuscarTab"
        component={BuscarScreen}
        options={{ tabBarLabel: t('search'), tabBarIcon: ({ color, size }) => <Feather name="search" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="PontosTab"
        component={PontosImpactoScreen}
        options={{ tabBarLabel: t('points'), tabBarIcon: ({ color, size }) => <Feather name="star" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={PerfilScreen}
        options={{ tabBarLabel: t('profile'), tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}
