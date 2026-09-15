import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase, type Brand } from '@/services/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';
import { useLanguage } from '@/i18n';

type Props = NativeStackScreenProps<UserRootStackParamList, 'MarcasQueSigo'>;

export function MarcasQueSegueScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowing();
  }, []);

  async function loadFollowing() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from('brand_followers')
      .select('brand_id, brands(*)')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setBrands(data.map((row: any) => row.brands).filter(Boolean));
    }
    setLoading(false);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('brandsIFollow')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {loading ? (
          <ActivityIndicator color={colors.secondary} style={{ marginTop: 20 }} />
        ) : brands.length === 0 ? (
          <Text style={styles.emptyText}>
            {t('noBrandsFollowed')}
          </Text>
        ) : (
          brands.map((brand) => (
            <Pressable
              key={brand.id}
              style={styles.brandCard}
              onPress={() => navigation.navigate('PerfilMarca', {
                brandId: brand.id,
                brandName: brand.name,
              })}
            >
              <View style={styles.logoCircle}>
                {brand.logo_url ? (
                  <Image
                    source={{ uri: brand.logo_url }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                  />
                ) : (
                  <Feather name="scissors" size={18} color={colors.secondary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.brandName}>{brand.name}</Text>
                {brand.bio && (
                  <Text style={styles.brandBio} numberOfLines={1}>
                    {brand.bio}
                  </Text>
                )}
              </View>
              <Feather name="chevron-right" size={16} color={colors.border} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  header: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  emptyText: {
    fontSize: 13,
    color: colors.secondary,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 22,
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.secondary,
    overflow: 'hidden',
  },
  brandName: { fontSize: 13, fontWeight: '600', color: colors.secondary },
  brandBio: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
