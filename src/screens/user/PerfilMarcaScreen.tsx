import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { colors, radius } from '@/constants/theme';
import { supabase, type Brand, type Product } from '@/services/supabase';
import { hasBrandLink, openBrandLink } from '@/utils/brandLinks';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';
import { useLanguage } from '@/i18n';
import { showAlert } from '@/utils/alert';

type Props = NativeStackScreenProps<UserRootStackParamList, 'PerfilMarca'>;

export function PerfilMarcaScreen({ route, navigation }: Props) {
  const { t } = useLanguage();
  const { brandId } = route.params;
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const player = useVideoPlayer(brand?.video_url ?? null, (p) => {
    p.loop = false;
  });
  const playerStatus = useEvent(player, 'statusChange', { status: player.status });
  const videoFailed = playerStatus?.status === 'error';

  useEffect(() => {
    loadData();
  }, [brandId]);

  useEffect(() => {
    if (!brand?.video_url) return;
    // replaceAsync rejeita quando o formato não é suportado ou a URL não
    // carrega. Sem o catch a rejeição vira "Uncaught (in promise)" no console
    // e, no nativo, pode derrubar a tela.
    player.replaceAsync(brand.video_url).catch((err) => {
      console.warn('Falha ao carregar o vídeo da marca:', err);
    });
  }, [brand?.video_url, player]);

  async function loadData() {
    setLoading(true);

    const [{ data: brandData }, { data: productsData }, { data: userData }] = await Promise.all([
      supabase.from('brands').select('*').eq('id', brandId).maybeSingle(),
      supabase.from('products').select('*').eq('brand_id', brandId).eq('status', 'active').order('created_at', { ascending: false }),
      supabase.auth.getUser(),
    ]);

    if (brandData) setBrand(brandData as Brand);
    if (productsData) setProducts(productsData as Product[]);

    if (userData.user) {
      const { data: followData } = await supabase
        .from('brand_followers')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('brand_id', brandId)
        .maybeSingle();
      setIsFollowing(!!followData);
    }

    setLoading(false);
  }

  async function handleFollowToggle() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Um delete barrado por RLS volta sem erro e sem linha afetada. O
        // `.select()` expõe isso — antes o coração apagava na tela e o
        // registro podia continuar no banco.
        const { data, error } = await supabase
          .from('brand_followers')
          .delete()
          .eq('user_id', userData.user.id)
          .eq('brand_id', brandId)
          .select('id');
        if (error) throw error;
        if (!data?.length) throw new Error(t('unfollowFailed'));
        setIsFollowing(false);
      } else {
        const { error } = await supabase
          .from('brand_followers')
          .insert({ user_id: userData.user.id, brand_id: brandId });
        if (error) throw error;
        setIsFollowing(true);
        promptInstagram();
      }
    } catch (err: any) {
      showAlert(t('error'), String(err?.message ?? err));
    } finally {
      setFollowLoading(false);
    }
  }

  function promptInstagram() {
    if (!hasBrandLink(brand)) return;

    showAlert(
      t('followOnInstagramTitle'),
      t('followOnInstagramMsg', { handle: brand?.instagram ?? '' }),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('openInstagram'), onPress: handleOpenInstagram },
      ]
    );
  }

  async function handleOpenInstagram() {
    const opened = await openBrandLink(brand);
    if (!opened) showAlert(t('error'), t('instagramOpenFailed'));
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.secondary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerSide}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {brand?.name ?? t('brandFallback')}
        </Text>
        <Pressable
          onPress={handleFollowToggle}
          disabled={followLoading}
          style={[styles.headerSide, styles.headerSideRight]}
        >
          <Feather name="heart" size={20} color={isFollowing ? colors.secondary : colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        {brand?.video_url ? (
          <View style={styles.videoSection}>
            <Text style={styles.sectionTitle}>{t('meetTheBrand')}</Text>
            {videoFailed ? (
              <View style={styles.videoError}>
                <Feather name="alert-circle" size={22} color={colors.textMuted} />
                <Text style={styles.videoErrorText}>{t('videoLoadError')}</Text>
              </View>
            ) : (
              <VideoView
                player={player}
                style={styles.videoPlayer}
                nativeControls
                contentFit="cover"
              />
            )}
          </View>
        ) : null}

        <View style={styles.bioCard}>
          <View style={styles.logoCircle}>
            {brand?.logo_url ? (
              <Image source={{ uri: brand.logo_url }} style={styles.logoImage} resizeMode="contain" />
            ) : (
              <Feather name="scissors" size={32} color={colors.secondary} />
            )}
          </View>
          <View style={styles.bioColumn}>
            {brand?.bio ? <Text style={styles.brandTagline}>{brand.bio}</Text> : null}
            {hasBrandLink(brand) ? (
              <Pressable style={styles.instagramRow} onPress={handleOpenInstagram}>
                <Feather name="instagram" size={13} color={colors.secondary} />
                <Text style={styles.instagramText}>{brand?.instagram}</Text>
                <Feather name="external-link" size={11} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <Pressable
          style={[styles.followButton, isFollowing && styles.followButtonActive]}
          onPress={handleFollowToggle}
          disabled={followLoading}
        >
          {followLoading ? (
            <ActivityIndicator color={isFollowing ? colors.secondary : colors.primary} size="small" />
          ) : (
            <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
              {isFollowing ? t('following') : t('followBrand')}
            </Text>
          )}
        </Pressable>

        <Text style={styles.sectionTitle}>{t('catalog')}</Text>

        {products.length === 0 ? (
          <Text style={styles.emptyText}>{t('noBrandProducts')}</Text>
        ) : (
          <View style={styles.productGrid}>
            {products.map((product) => (
              <Pressable
                key={product.id}
                style={styles.productCard}
                onPress={() => navigation.navigate('DetalhesProduto', { productId: product.id, productName: product.name })}
              >
                {product.photo_url ? (
                  <Image
                    source={{ uri: product.photo_url }}
                    style={{ width: '100%', height: 100, borderRadius: radius.md, marginBottom: 8 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.productImage}>
                    <Feather name="image" size={26} color={colors.border} />
                  </View>
                )}
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>R$ {(product.price_cents / 100).toFixed(2)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1, backgroundColor: colors.primary },
  header: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerSide: { width: 20, alignItems: 'flex-start' },
  headerSideRight: { alignItems: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center', marginHorizontal: 12, fontSize: 14, fontWeight: '600', color: colors.secondary },
  scroll: { flex: 1 },
  bioCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  bioColumn: { flex: 1 },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    // 62 é o maior quadrado que cabe inteiro no círculo de 88 (diâmetro / √2).
    // Com 80 e `cover` o recorte circular comia as bordas e decepava o nome
    // escrito na arte — "TOWA DOLLS" aparecia como "MA DOL". Mesmo ajuste
    // feito em brandLogo na HomeScreen.
    width: 62,
    height: 62,
  },
  brandTagline: { fontSize: 12, color: colors.secondary, opacity: 0.7, lineHeight: 17 },
  instagramRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  instagramText: { fontSize: 12, color: colors.secondary, fontWeight: '500' },
  followButton: {
    height: 42,
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  followButtonText: { color: colors.primary, fontSize: 13, fontWeight: '500' },
  followButtonActive: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  followButtonTextActive: {
    color: colors.secondary,
  },
  videoSection: { marginBottom: 18 },
  videoPlayer: { width: '100%', height: 200, borderRadius: radius.lg, backgroundColor: colors.secondary },
  videoError: {
    width: '100%',
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  videoErrorText: { fontSize: 12, color: colors.textMuted },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.secondary, marginBottom: 12 },
  emptyText: { fontSize: 12, color: colors.secondary, opacity: 0.6 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  productCard: { width: '47%', backgroundColor: colors.white, borderRadius: radius.lg, padding: 10 },
  productImage: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  productName: { fontSize: 12, fontWeight: '500', color: colors.secondary, marginBottom: 4 },
  productPrice: { fontSize: 13, fontWeight: '600', color: colors.secondary },
});