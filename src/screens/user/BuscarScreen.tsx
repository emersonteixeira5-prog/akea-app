import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase, type Brand, type Product } from '@/services/supabase';
import { useLanguage } from '@/i18n';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { UserTabsParamList } from '@/navigation/UserTabs';
import type { UserRootNavigation } from '@/navigation/UserRootStack';

type Props = BottomTabScreenProps<UserTabsParamList, 'BuscarTab'>;

function formatReais(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

export function BuscarScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { t } = useLanguage();

  async function handleSearch(text: string) {
    setQuery(text);
    if (text.trim().length < 2) {
      setBrands([]);
      setProducts([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    const [brandsRes, productsRes] = await Promise.all([
      supabase.from('brands').select('*').ilike('name', `%${text.trim()}%`).limit(10),
      supabase.from('products').select('*').ilike('name', `%${text.trim()}%`).eq('status', 'active').limit(10),
    ]);
    setBrands((brandsRes.data ?? []) as Brand[]);
    setProducts((productsRes.data ?? []) as Product[]);
    setLoading(false);
  }

  function openBrand(brand: Brand) {
    navigation.getParent<UserRootNavigation>()?.navigate('PerfilMarca', { brandId: brand.id, brandName: brand.name });
  }

  function openProduct(product: Product) {
    navigation.getParent<UserRootNavigation>()?.navigate('DetalhesProduto', { productId: product.id, productName: product.name });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchPlaceholder')}
            value={query}
            onChangeText={handleSearch}
            autoFocus
          />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }}>
        {loading && <ActivityIndicator color={colors.secondary} style={{ marginTop: 20 }} />}

        {!loading && searched && brands.length === 0 && products.length === 0 && (
          <Text style={styles.emptyText}>{t('noResults')} "{query}".</Text>
        )}

        {!loading && brands.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('brands')}</Text>
            {brands.map((brand) => (
              <Pressable key={brand.id} style={styles.brandRow} onPress={() => openBrand(brand)}>
                <View style={styles.brandIcon}>
                  {brand.logo_url ? (
                    <Image source={{ uri: brand.logo_url }} style={styles.brandLogo} />
                  ) : (
                    <Feather name="scissors" size={16} color={colors.secondary} />
                  )}
                </View>
                <Text style={styles.brandName}>{brand.name}</Text>
                <Feather name="chevron-right" size={14} color={colors.border} />
              </Pressable>
            ))}
          </>
        )}

        {!loading && products.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t('products')}</Text>
            {products.map((product) => (
              <Pressable key={product.id} style={styles.productRow} onPress={() => openProduct(product)}>
                <View style={styles.productImage}>
                  {product.photo_url ? (
                    <Image source={{ uri: product.photo_url }} style={styles.productImagePhoto} />
                  ) : (
                    <Feather name="image" size={20} color={colors.border} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>{formatReais(product.price_cents)}</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {!searched && (
          <Text style={styles.hintText}>{t('searchHint')}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  header: { backgroundColor: colors.white, paddingHorizontal: 20, paddingVertical: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 40,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.secondary },
  scroll: { flex: 1 },
  emptyText: { fontSize: 12, color: colors.secondary, opacity: 0.6, textAlign: 'center', marginTop: 20 },
  hintText: { fontSize: 12, color: colors.secondary, opacity: 0.5, textAlign: 'center', marginTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.secondary, marginBottom: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.md, padding: 12, marginBottom: 8 },
  brandIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandIconImage: { width: 32, height: 32 },
  brandName: { flex: 1, fontSize: 13, color: colors.secondary },
  brandLogo: { width: 32, height: 32, borderRadius: 16 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.md, padding: 10, marginBottom: 8 },
  productImage: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImagePhoto: { width: 44, height: 44, borderRadius: radius.md },
  productName: { fontSize: 13, color: colors.secondary },
  productPrice: { fontSize: 12, fontWeight: '600', color: colors.secondary, marginTop: 2 },
});