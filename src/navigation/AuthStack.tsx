import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/screens/auth/OnboardingScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { CadastroScreen } from '@/screens/auth/CadastroScreen';

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Cadastro: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Cadastro" component={CadastroScreen} />
    </Stack.Navigator>
  );
}
