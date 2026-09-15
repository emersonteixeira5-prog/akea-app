import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/constants/theme';
import { supabase, type Brand, type Product, type Banner } from '@/services/supabase';
import { hasBrandLink, openBrandLink } from '@/utils/brandLinks';

// LOGO DO HEADER: para atualizar a logo, substitua o arquivo
// assets/logo-header.png pela arte final (lockup horizontal ~2.8:1, PNG
// com fundo transparente, traço na cor da marca — o header é branco).
// Não precisa alterar nenhum código — só o arquivo de imagem.
import { useLanguage } from '@/i18n';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { UserTabsParamList } from '@/navigation/UserTabs';
import type { UserRootNavigation } from '@/navigation/UserRootStack';

type Props = BottomTabScreenProps<UserTabsParamList, 'HomeTab'>;
type ProductWithBrand = Product & { brands: { name: string } | null };

// BANNER EMBUTIDO NO PACOTE DO APP
//
// Está aqui, e não na tabela `banners` como os outros três, porque o
// envio para o bucket Logos falhou quatro vezes seguidas: o SQL gravava
// a URL e o arquivo nunca chegava, deixando um slide em branco
// (GET .../Logos/sena-terremoto.jpg -> 404 NoSuchKey). Embutido, não
// depende de Storage nenhum.
//
// O CUSTO: trocar esta imagem passa a exigir editar código e publicar o
// app de novo, em vez de uma linha de SQL. Quando o envio para o Storage
// voltar a funcionar, o caminho de volta é rodar supabase/seeds/
// 0012_banner_sena.sql e apagar estas linhas.
//
// Vem PRIMEIRO no carrossel. Para pôr por último, mova o item para o fim
// do array `slides` lá embaixo.
const BANNER_EMBUTIDO = require('../../../assets/banner/sena-terremoto.jpg');

// Marcas por página do carrossel: 3 colunas × 2 linhas. O valor precisa
// bater com a largura de `brandCell` (33.333%) — mudar um sem o outro
// deixa a última coluna sobrando ou faltando.
const BRANDS_PER_PAGE = 6;

function paginar<T>(itens: T[], porPagina: number): T[][] {
  const paginas: T[][] = [];
  for (let i = 0; i < itens.length; i += porPagina) {
    paginas.push(itens.slice(i, i + porPagina));
  }
  return paginas;
}

export function HomeScreen({ navigation }: Props) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<ProductWithBrand[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeBrandPage, setActiveBrandPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  // Hook em vez de Dimensions.get no topo do módulo: o valor lido uma vez
  // na carga não acompanha o redimensionamento da janela na web, e a
  // largura da página é justamente o que faz o pagingEnabled parar no
  // lugar certo.
  const { width } = useWindowDimensions();

  const brandPages = paginar(brands, BRANDS_PER_PAGE);

  // O banner embutido e os da tabela num só array, para o carrossel, os
  // pontinhos e o avanço automático contarem a mesma coisa. `source` é o
  // que o <Image> aceita nas duas formas: módulo local ou { uri }.
  const slides: { key: string; source: ImageSourcePropType }[] = [
    { key: 'embutido-sena', source: BANNER_EMBUTIDO },
    ...banners.map((b) => ({ key: b.id, source: { uri: b.image_url } })),
  ];

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (slides.length < 2) return;
    const interval = setInterval(() => {
      const nextIndex = (activeBanner + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setActiveBanner(nextIndex);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length, activeBanner, width]);

  async function loadData() {
    setLoading(true);
    const [brandsRes, productsRes, bannersRes] = await Promise.all([
      // limit(10) escondia marcas parceiras da vitrine — com 13 cadastradas,
      // três ficavam de fora sem nenhum aviso. O teto alto é só uma guarda
      // contra a lista crescer demais; a grade quebra linha sozinha.
      supabase.from('brands').select('*').order('name').limit(50),
      supabase
        .from('products')
        .select('*, brands(name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8),
      supabase.from('banners').select('*').order('sort_order'),
    ]);
    if (brandsRes.data) setBrands(brandsRes.data as Brand[]);
    if (productsRes.data) setProducts(productsRes.data as unknown as ProductWithBrand[]);
    if (bannersRes.data) setBanners(bannersRes.data as Banner[]);
    setLoading(false);
  }

  function handleBannerScrollEnd(event: any) {
    if (width <= 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveBanner(index);
  }

  // onScroll, e não onMomentumScrollEnd: o evento de inércia só existe em
  // gesto de toque, então na web (roda do mouse, trackpad) os pontinhos
  // ficavam parados na primeira página. O setState só acontece quando a
  // página muda de verdade — onScroll dispara a cada quadro.
  function handleBrandScroll(event: any) {
    if (width <= 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveBrandPage((prev) => (prev === index ? prev : index));
  }

  function openBrand(brandId: string, brandName: string) {
    navigation.getParent<UserRootNavigation>()?.navigate('PerfilMarca', { brandId, brandName });
  }

  function openProduct(productId: string, productName: string) {
    navigation.getParent<UserRootNavigation>()?.navigate('DetalhesProduto', { productId, productName });
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image
          source={require('../../../assets/logo-header.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Pressable style={styles.searchBar} onPress={() => navigation.navigate('BuscarTab')}>
          <Feather name="search" size={14} color={colors.textMuted} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.secondary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 24 }}>
          {slides.length > 0 ? (
            <>
              <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleBannerScrollEnd}
              >
                {slides.map((slide) => (
                  <Image
                    key={slide.key}
                    source={slide.source}
                    style={{ width, height: 160 }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {slides.length > 1 && (
                <View style={styles.dotsRow}>
                  {slides.map((_, i) => (
                    <View key={i} style={[styles.dot, i === activeBanner && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.heroBanner}>
                <Feather name="image" size={36} color={colors.border} />
              </View>
              <View style={styles.dotsRow}>
                <View style={[styles.dot, styles.dotActive]} />
                <View style={styles.dot} />
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>{t('partnerBrands')}</Text>
          {brands.length === 0 ? (
            <Text style={styles.emptyText}>{t('noBrands')}</Text>
          ) : (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleBrandScroll}
                scrollEventThrottle={16}
              >
                {brandPages.map((page, pageIndex) => (
                  <View key={pageIndex} style={[styles.brandPage, { width }]}>
                    {page.map((brand) => (
                      <View key={brand.id} style={styles.brandCell}>
                        {/* Wrapper de 78 (o diâmetro do círculo) para o selo
                            do Instagram, que é absoluto: ancorado na célula,
                            que é bem mais larga, ele flutuaria longe da borda. */}
                        <View style={styles.brandAnchor}>
                          <Pressable style={styles.brandItem} onPress={() => openBrand(brand.id, brand.name)}>
                            {brand.logo_url ? (
                              <Image source={{ uri: brand.logo_url }} style={styles.brandLogo} resizeMode="contain" />
                            ) : (
                              <Feather name="scissors" size={20} color={colors.secondary} />
                            )}
                          </Pressable>
                          {hasBrandLink(brand, 'instagram') ? (
                            <Pressable
                              style={styles.brandSocialBadge}
                              hitSlop={8}
                              onPress={() => openBrandLink(brand, 'instagram')}
                            >
                              <Feather name="instagram" size={13} color={colors.primary} />
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
              {brandPages.length > 1 && (
                <View style={styles.brandDotsRow}>
                  {brandPages.map((_, i) => (
                    <View key={i} style={[styles.dot, i === activeBrandPage && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          )}

          <Text style={styles.sectionTitle}>{t('newProducts')}</Text>
          {products.length === 0 ? (
            <Text style={styles.emptyText}>{t('noProducts')}</Text>
          ) : (
            <View style={styles.productGrid}>
              {products.map((product) => (
                <Pressable key={product.id} style={styles.productCard} onPress={() => openProduct(product.id, product.name)}>
                  {product.photo_url ? (
                    <Image
                      source={{ uri: product.photo_url }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Feather name="image" size={26} color={colors.border} />
                    </View>
                  )}
                  <Text style={styles.productBrand}>{product.brands?.name}</Text>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>R$ {(product.price_cents / 100).toFixed(2)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerLogo: {
    height: 36,
    width: 120,
  },
  searchBar: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    height: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  scroll: { flex: 1 },
  heroBanner: { height: 160, backgroundColor: '#E8E4D5', alignItems: 'center', justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.secondary, opacity: 0.3 },
  dotActive: { width: 16, height: 5, borderRadius: 3, opacity: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.secondary, paddingHorizontal: 16, marginBottom: 10, marginTop: 4 },
  emptyText: { fontSize: 12, color: colors.secondary, opacity: 0.6, paddingHorizontal: 16, marginBottom: 16 },
  // Uma página do carrossel. A largura vem por prop (a da janela), para o
  // pagingEnabled parar exatamente na virada. flexWrap + célula de 33.333%
  // é o que quebra em 3 + 3.
  brandPage: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  brandCell: { width: '33.333%', alignItems: 'center' },
  brandAnchor: { width: 78 },
  brandDotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 2, paddingBottom: 14 },
  brandSocialBadge: {
    position: 'absolute',
    right: 0,
    bottom: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  brandItem: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  // 54 é o maior quadrado que cabe INTEIRO no círculo de 78 (diâmetro / √2
  // ≈ 55). Acima disso o recorte circular come os cantos, e as artes dessas
  // marcas levam o nome escrito até a borda — a 66 saía "AK Fashio~",
  // "Arte y Cost~". Sem borderRadius de propósito: o quadrado já está
  // contido, arredondar só cortaria de novo.
  brandLogo: { width: 54, height: 54 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, justifyContent: 'space-between' },
  productCard: { width: '47%', backgroundColor: colors.white, borderRadius: radius.lg, padding: 10 },
  productImagePlaceholder: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: radius.md,
    marginBottom: 8,
  },
  productBrand: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  productName: { fontSize: 12, fontWeight: '500', color: colors.secondary, marginBottom: 4 },
  productPrice: { fontSize: 13, fontWeight: '600', color: colors.secondary },
});