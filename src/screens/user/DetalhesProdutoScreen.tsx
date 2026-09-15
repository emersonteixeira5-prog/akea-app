import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase, type Product, type Brand } from '@/services/supabase';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';

type Props = NativeStackScreenProps<UserRootStackParamList, 'DetalhesProduto'>;

export function DetalhesProdutoScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const { t } = useLanguage();

  useEffect(() => {
    loadData();
  }, [productId]);

  async function loadData() {
    setLoading(true);
    const { data: productData } = await supabase.from('products').select('*').eq('id', productId).maybeSingle();
    if (productData) {
      setProduct(productData as Product);
      const { data: brandData } = await supabase.from('brands').select('*').eq('id', productData.brand_id).maybeSingle();
      if (brandData) setBrand(brandData as Brand);
    }
    setLoading(false);
  }

  function handleAddToCart() {
    if (!brand || !product) return;
    addItem({
      productId: product.id,
      name: product.name,
      priceCents: product.price_cents,
      brandId: brand.id,
      brandName: brand.name,
    });
    navigation.navigate('Carrinho');
  }

  if (loading || !product) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.secondary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('productDetails')}</Text>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Feather name="heart" size={20} color={colors.secondary} />
          <Feather name="share" size={20} color={colors.secondary} />
        </View>
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.imageArea}>
          {product.photo_url ? (
            <Image
              source={{ uri: product.photo_url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <Feather name="image" size={60} color={colors.border} />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Pressable
              style={styles.brandLink}
              onPress={() => brand && navigation.navigate('PerfilMarca', { brandId: brand.id, brandName: brand.name })}
            >
              <Text style={styles.brandLinkText}>{brand?.name}</Text>
              <Feather name="chevron-right" size={12} color={colors.secondary} />
            </Pressable>
            {product.is_unique_piece && (
              <View style={styles.uniqueBadge}>
                <Text style={styles.uniqueBadgeText}>{t('uniquePiece')}</Text>
              </View>
            )}
          </View>

          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>R$ {(product.price_cents / 100).toFixed(2)}</Text>

          {product.description ? (
            <>
              <Text style={styles.label}>{t('description')}</Text>
              <Text style={styles.description}>{product.description}</Text>
            </>
          ) : null}

          <View style={styles.donatedBanner}>
            <Image
              source={require('../../../assets/logo-icon.png')}
              style={styles.brandMark}
              resizeMode="contain"
            />
            <Text style={styles.donatedText}>{t('donatedFabricBanner')}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>{t('total')}</Text>
          <Text style={styles.totalValue}>R$ {(product.price_cents / 100).toFixed(2)}</Text>
        </View>
        <Pressable style={styles.addButton} onPress={handleAddToCart}>
          <Text style={styles.addButtonText}>{t('addToCart')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.surfaceMuted,
  },
  headerTitle: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  scroll: { flex: 1 },
  imageArea: { height: 260, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  brandLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  brandLinkText: { fontSize: 12, color: colors.secondary, fontWeight: '500' },
  uniqueBadge: { borderWidth: 1, borderColor: colors.secondary, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  uniqueBadgeText: { fontSize: 10, fontWeight: '700', color: colors.secondary },
  productName: { fontSize: 20, fontWeight: '600', color: colors.secondary, marginBottom: 6 },
  productPrice: { fontSize: 22, fontWeight: '700', color: colors.secondary, marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textLabel, marginBottom: 8 },
  description: { fontSize: 13, color: colors.secondary, lineHeight: 21, marginBottom: 18 },
  donatedBanner: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 22, height: 22 },
  donatedText: { flex: 1, fontSize: 11, color: colors.secondary, lineHeight: 16 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 0.5,
    borderTopColor: colors.surfaceMuted,
  },
  totalLabel: { fontSize: 10, color: colors.textMuted },
  totalValue: { fontSize: 17, fontWeight: '700', color: colors.secondary },
  addButton: { height: 46, backgroundColor: colors.secondary, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 },
  addButtonText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
});