import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/i18n';
import { showAlert } from '@/utils/alert';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type HomeStackParamList = {
  Carrinho: undefined;
  Checkout: undefined;
};

type Props = NativeStackScreenProps<HomeStackParamList, 'Carrinho'>;

function formatReais(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

export function CarrinhoScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const { items, removeItem, usePoints, setUsePoints } = useCart();
  const [impactPoints, setImpactPoints] = useState(0);
  const [photos, setPhotos] = useState<Record<string, string | null>>({});

  useEffect(() => {
    loadPoints();
    sincronizarComCatalogo();
  }, []);

  async function loadPoints() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase.from('profiles').select('impact_points').eq('id', userData.user.id).maybeSingle();
    if (data) setImpactPoints(data.impact_points);
  }

  /**
   * Busca as fotos e, na mesma ida ao servidor, confere se cada peça ainda
   * está à venda.
   *
   * Isto passou a ser necessário quando o carrinho virou persistente: ele
   * pode ter sido montado dias atrás, e cada peça é única — o gatilho
   * on_order_item_inserted marca o produto como `sold` assim que alguém
   * fecha o pedido. Sem esta conferência, a pessoa só descobriria no
   * checkout, ou pior, compraria algo que não existe mais.
   */
  async function sincronizarComCatalogo() {
    if (items.length === 0) return;

    const { data, error } = await supabase
      .from('products')
      .select('id, photo_url, status')
      .in('id', items.map((i) => i.productId));

    // Consulta falhou (rede fora, por exemplo): mantém o carrinho como está.
    // Esvaziar por falta de resposta seria pior que mostrar dado velho.
    if (error || !data) return;

    const photoMap: Record<string, string | null> = {};
    data.forEach((p) => {
      photoMap[p.id] = p.photo_url;
    });
    setPhotos(photoMap);

    // Sai do carrinho o que foi vendido e também o que sumiu do catálogo —
    // produto apagado não volta na consulta, e comprar não seria possível.
    const disponiveis = new Set(data.filter((p) => p.status === 'active').map((p) => p.id));
    const indisponiveis = items.filter((i) => !disponiveis.has(i.productId));
    if (indisponiveis.length === 0) return;

    indisponiveis.forEach((i) => removeItem(i.productId));

    const nomes = indisponiveis.map((i) => i.name).join(', ');
    showAlert(
      t(indisponiveis.length === 1 ? 'soldItemRemovedTitle' : 'soldItemsRemovedTitle'),
      t(indisponiveis.length === 1 ? 'soldItemRemovedMsg' : 'soldItemsRemovedMsg', { items: nomes }),
    );
  }

  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents, 0);
  // 10 pontos = R$ 1 → 1 ponto = 10 centavos. Desconto nunca passa do subtotal.
  const maxDiscountCents = Math.min(impactPoints * 10, subtotalCents);
  const discountCents = usePoints ? maxDiscountCents : 0;
  const totalCents = subtotalCents - discountCents;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('cart')} ({items.length})</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }}>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>{t('emptyCart')}</Text>
        ) : (
          items.map((item) => (
            <View key={item.productId} style={styles.itemCard}>
              <View style={styles.itemImage}>
                {photos[item.productId] ? (
                  <Image
                    source={{ uri: photos[item.productId]! }}
                    style={{ width: '100%', height: '100%', borderRadius: radius.md }}
                    resizeMode="cover"
                  />
                ) : (
                  <Feather name="image" size={22} color={colors.border} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemBrand}>{item.brandName}</Text>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemUnique}>{t('uniquePiece')}</Text>
                <Text style={styles.itemPrice}>{formatReais(item.priceCents)}</Text>
              </View>
              <Pressable onPress={() => removeItem(item.productId)}>
                <Feather name="trash-2" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}

        {items.length > 0 && (
          <>
            <Pressable style={styles.pointsCard} onPress={() => setUsePoints(!usePoints)}>
              <View style={styles.pointsLeft}>
                <Feather name="star" size={18} color={colors.secondary} />
                <View>
                  <Text style={styles.pointsTitle}>{t('usePoints')}</Text>
                  <Text style={styles.pointsSubtitle}>
                    {impactPoints} {t('available')} · {t('upTo')} {formatReais(maxDiscountCents)} {t('ofDiscount')}
                  </Text>
                </View>
              </View>
              <View style={[styles.toggleTrack, usePoints && styles.toggleTrackOn]}>
                <View style={[styles.toggleKnob, usePoints && styles.toggleKnobOn]} />
              </View>
            </Pressable>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('subtotal')}</Text>
                <Text style={styles.summaryValue}>{formatReais(subtotalCents)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('discount')}</Text>
                <Text style={styles.summaryValue}>- {formatReais(discountCents)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                <Text style={styles.summaryTotalLabel}>{t('total')}</Text>
                <Text style={styles.summaryTotalValue}>{formatReais(totalCents)}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={styles.bottomBar}>
          <Pressable style={styles.checkoutButton} onPress={() => navigation.navigate('Checkout')}>
            <Text style={styles.checkoutButtonText}>{t('goToPayment')}</Text>
          </Pressable>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  scroll: { flex: 1 },
  emptyText: { fontSize: 13, color: colors.secondary, opacity: 0.6, textAlign: 'center', marginTop: 40 },
  itemCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, marginBottom: 12 },
  itemImage: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  itemBrand: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  itemName: { fontSize: 13, fontWeight: '500', color: colors.secondary, marginBottom: 2 },
  itemUnique: { fontSize: 10, color: colors.textMuted, marginBottom: 6 },
  itemPrice: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  pointsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  pointsTitle: { fontSize: 12, fontWeight: '500', color: colors.secondary },
  pointsSubtitle: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  toggleTrack: { width: 40, height: 22, borderRadius: 11, backgroundColor: colors.border },
  toggleTrackOn: { backgroundColor: colors.secondary },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.white, marginTop: 2, marginLeft: 2 },
  toggleKnobOn: { marginLeft: 20, backgroundColor: colors.primary },
  summaryCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: colors.textLabel },
  summaryValue: { fontSize: 12, color: colors.secondary },
  summaryTotalRow: { marginTop: 4, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: colors.borderLight, marginBottom: 0 },
  summaryTotalLabel: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  summaryTotalValue: { fontSize: 16, fontWeight: '700', color: colors.secondary },
  bottomBar: { backgroundColor: colors.white, padding: 20, borderTopWidth: 0.5, borderTopColor: colors.surfaceMuted },
  checkoutButton: { height: 48, backgroundColor: colors.secondary, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  checkoutButtonText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
});