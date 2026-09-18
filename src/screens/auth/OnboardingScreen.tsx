import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList, Image, Dimensions,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/constants/theme';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage, type TranslationKey } from '@/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const ONBOARDING_SEEN_KEY = '@akea:onboarding_seen';

const SLIDES: { id: string; image: string; titleKey: TranslationKey; subtitleKey: TranslationKey }[] = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&h=900&fit=crop',
    titleKey: 'onboardingTitle1',
    subtitleKey: 'onboardingSubtitle1',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=900&fit=crop',
    titleKey: 'onboardingTitle2',
    subtitleKey: 'onboardingSubtitle2',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=900&fit=crop',
    titleKey: 'onboardingTitle3',
    subtitleKey: 'onboardingSubtitle3',
  },
];

export function OnboardingScreen({ navigation }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const { t } = useLanguage();
  const isLast = currentIndex === SLIDES.length - 1;

  useEffect(() => {
    checkOnboarding();
  }, []);

  async function checkOnboarding() {
    const seen = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
    if (seen === 'true') {
      navigation.replace('Login');
    }
  }

  async function markSeenAndNavigate(route: 'Cadastro' | 'Login') {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    navigation.replace(route);
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  }

  function handleNext() {
    if (isLast) {
      markSeenAndNavigate('Cadastro');
      return;
    }
    const nextIndex = currentIndex + 1;
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
            <View style={styles.gradientOverlay} />
            <View style={styles.textBlock}>
              <Text style={styles.title}>{t(item.titleKey)}</Text>
              <Text style={styles.subtitle}>{t(item.subtitleKey)}</Text>
            </View>
          </View>
        )}
      />

      <LanguageToggle style={styles.langToggle} />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        {isLast ? (
          <>
            <Pressable style={styles.primaryButton} onPress={handleNext}>
              <Text style={styles.primaryButtonText}>{t('onboardingStart')}</Text>
            </Pressable>
            <Pressable onPress={() => markSeenAndNavigate('Login')}>
              <Text style={styles.haveAccountText}>{t('onboardingHaveAccount')}</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.nextRow}>
            <Pressable onPress={() => markSeenAndNavigate('Login')} style={styles.skipButton}>
              <Text style={styles.skipText}>{t('onboardingSkip')}</Text>
            </Pressable>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>{t('onboardingNext')}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.55;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  list: { height: IMAGE_HEIGHT, flexGrow: 0 },
  slide: { width: SCREEN_WIDTH, height: IMAGE_HEIGHT },
  image: { ...StyleSheet.absoluteFill },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  textBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: { color: colors.white, fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  subtitle: { color: colors.white, opacity: 0.85, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  // Sobre a foto do slide, no canto oposto ao 'Pular' — é a primeira tela
  // que um visitante vê, então a troca de idioma precisa estar visível aqui.
  langToggle: { position: 'absolute', top: 16, right: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20 },
  dot: { width: 8, height: 4, borderRadius: 4, backgroundColor: colors.secondary, opacity: 0.3 },
  dotActive: { width: 20, opacity: 1 },
  footer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 14,
  },
  nextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skipButton: { height: 48, justifyContent: 'center' },
  skipText: { color: colors.secondary, opacity: 0.6, fontSize: 14, fontWeight: '500' },
  nextButton: {
    minHeight: 48,
    paddingHorizontal: 32,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
  primaryButton: {
    width: '100%',
    minHeight: 48,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
  haveAccountText: { color: colors.secondary, opacity: 0.7, fontSize: 13, fontWeight: '500', textAlign: 'center' },
});
