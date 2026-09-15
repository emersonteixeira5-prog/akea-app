import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase, type Brand } from '@/services/supabase';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';
import { showAlert } from '@/utils/alert';

type Props = NativeStackScreenProps<UserRootStackParamList, 'Checkout'>;
type DeliveryMethod = 'pickup' | 'shipping';

function formatReais(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

const SHIPPING_CENTS = 1500;

export function CheckoutScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const { items, usePoints, clear } = useCart();
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [pickupBrands, setPickupBrands] = useState<Brand[]>([]);
  const [impactPoints, setImpactPoints] = useState(0);
  const [defaultAddress, setDefaultAddress] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const brandIds = [...new Set(items.map((i) => i.brandId))];
  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents, 0);
  const maxDiscountCents = Math.min(impactPoints * 10, subtotalCents);
  const discountCents = usePoints ? maxDiscountCents : 0;
  const shippingCents = deliveryMethod === 'shipping' ? SHIPPING_CENTS : 0;
  const totalCents = subtotalCents - discountCents + shippingCents;

  useEffect(() => {
    loadPickupAddresses();
    loadPoints();
    loadDefaultAddress();
  }, []);

  async function loadPickupAddresses() {
    if (brandIds.length === 0) return;
    const { data } = await supabase.from('brands').select('*').in('id', brandIds);
    if (data) setPickupBrands(data as Brand[]);
  }

  async function loadPoints() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase.from('profiles').select('impact_points').eq('id', userData.user.id).maybeSingle();
    if (data) setImpactPoints(data.impact_points);
  }

  async function loadDefaultAddress() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: addrData } = await supabase
      .from('addresses')
      .select('label, street, number, complement, neighborhood, city, state, postal_code')
      .eq('user_id', userData.user.id)
      .eq('is_default', true)
      .maybeSingle();
    if (addrData) {
      const complement = addrData.complement ? ` — ${addrData.complement}` : '';
      const cep = addrData.postal_code.replace(/(\d{5})(\d{3})/, '$1-$2');
      setDefaultAddress(
        `${addrData.label}: ${addrData.street}, ${addrData.number}${complement} — ${addrData.neighborhood}, ${addrData.city}/${addrData.state} — CEP ${cep}`
      );
    }
  }

  async function handleConfirm() {
    // Carrinho vazio saía daqui em silêncio: o botão não fazia nada e não
    // dizia nada. Custou duas rodadas de investigação achando que o
    // checkout estava falhando, quando ele nunca chegava a ser chamado.
    // Acontece mais do que parece — sair da conta esvazia o carrinho.
    if (items.length === 0) {
      showAlert(t('emptyCartTitle'), t('emptyCartCheckoutMsg'));
      return;
    }

    if (deliveryMethod === 'shipping' && !defaultAddress) {
      showAlert(
        t('addressNotRegisteredTitle'),
        t('addAddressBeforeContinue'),
        [
          { text: t('cancel'), style: 'cancel' },
          // Checkout e Enderecos são irmãos na UserRootStack: aqui não há
          // navegador pai. O getParent() antigo devolvia undefined e o `?.`
          // engolia a chamada — o botão não fazia nada.
          { text: t('addAddress'), onPress: () => navigation.navigate('Enderecos') },
        ]
      );
      return;
    }

    setSubmitting(true);

    try {
      // Uma chamada só, numa transação só. Antes eram três idas ao servidor
      // — pedido, itens, pontos — cada uma confirmando sozinha: se a
      // segunda falhasse, sobrava um pedido `paid` sem item nenhum, e num
      // carrinho com várias marcas os pedidos anteriores já estavam
      // gravados. Agora qualquer erro desfaz tudo.
      //
      // Nenhum valor em dinheiro é enviado: o cliente diz quais peças, e o
      // banco lê o preço de `products`. Os totais abaixo continuam sendo
      // calculados aqui só para exibir antes de confirmar.
      const { error: checkoutError } = await supabase.rpc('finalizar_compra', {
        p_product_ids: items.map((i) => i.productId),
        p_delivery_method: deliveryMethod,
        p_use_points: usePoints,
      });

      if (checkoutError) throw new Error(checkoutError.message);

      clear();
      showAlert(t('orderConfirmed'), t('orderConfirmedMsg'), [
        { text: t('ok'), onPress: () => navigation.navigate('UserTabs') },
      ]);
    } catch (err: any) {
      showAlert(t('orderFailedTitle'), String(err?.message ?? err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('payment')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleButton, deliveryMethod === 'pickup' && styles.toggleButtonActive]}
            onPress={() => setDeliveryMethod('pickup')}
          >
            <Text style={[styles.toggleText, deliveryMethod === 'pickup' && styles.toggleTextActive]}>{t('pickupStore')}</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, deliveryMethod === 'shipping' && styles.toggleButtonActive]}
            onPress={() => setDeliveryMethod('shipping')}
          >
            <Text style={[styles.toggleText, deliveryMethod === 'shipping' && styles.toggleTextActive]}>{t('receiveHome')}</Text>
          </Pressable>
        </View>

        {deliveryMethod === 'pickup' ? (
          <>
            <Text style={styles.note}>{t('orderSeparated')}</Text>
            {pickupBrands.map((brand) => (
              <View key={brand.id} style={styles.addressCard}>
                <Feather name="map-pin" size={16} color={colors.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressBrand}>{brand.name}</Text>
                  <Text style={styles.addressText}>{brand.pickup_address ?? t('addressNotProvided')}</Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.addressCard}>
            <Feather name="map-pin" size={16} color={colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressBrand}>{t('deliverTo')}</Text>
              {defaultAddress ? (
                <Text style={styles.addressText}>{defaultAddress}</Text>
              ) : (
                <Pressable onPress={() => navigation.navigate('Enderecos')}>
                  <Text style={[styles.addressText, { color: colors.secondary, textDecorationLine: 'underline' }]}>
                    {t('noAddressTapToAdd')}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        <View style={[styles.toggleRow, { marginTop: 18, marginBottom: 16 }]}>
          <View style={[styles.toggleButton, styles.toggleButtonActive]}>
            <Text style={[styles.toggleText, styles.toggleTextActive]}>{t('pixPayment')}</Text>
          </View>
          <View style={styles.toggleButton}>
            <Text style={styles.toggleText}>{t('card')}</Text>
          </View>
        </View>

        <View style={styles.pixCard}>
          <View style={styles.qrPlaceholder}>
            <Feather name="grid" size={50} color={colors.textMuted} />
          </View>
          <Text style={styles.pixHint}>
            {t('paymentSimulatedDetail')}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('subtotal')}</Text>
            <Text style={styles.summaryValue}>{formatReais(subtotalCents)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('discount')}</Text>
            <Text style={styles.summaryValue}>- {formatReais(discountCents)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('shipping')}</Text>
            <Text style={styles.summaryValue}>{deliveryMethod === 'pickup' ? t('free') : formatReais(shippingCents)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotalRow]}>
            <Text style={styles.summaryTotalLabel}>{t('total')}</Text>
            <Text style={styles.summaryTotalValue}>{formatReais(totalCents)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.confirmButton, items.length === 0 && styles.confirmButtonOff]}
          onPress={handleConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.confirmButtonText}>{t('alreadyPaid')}</Text>
          )}
        </Pressable>
      </View>
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
  toggleRow: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md, padding: 4, marginBottom: 14 },
  toggleButton: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: colors.secondary },
  toggleText: { fontSize: 12, fontWeight: '500', color: colors.secondary },
  toggleTextActive: { color: colors.primary },
  note: { fontSize: 11, color: colors.secondary, opacity: 0.7, marginBottom: 10 },
  addressCard: { flexDirection: 'row', gap: 10, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, marginBottom: 8 },
  addressBrand: { fontSize: 12, fontWeight: '500', color: colors.secondary },
  addressText: { fontSize: 10, color: colors.textLabel, marginTop: 2 },
  pixCard: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 20, alignItems: 'center', marginBottom: 16 },
  qrPlaceholder: {
    width: 140,
    height: 140,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pixHint: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  summaryCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: colors.textLabel },
  summaryValue: { fontSize: 12, color: colors.secondary },
  summaryTotalRow: { paddingTop: 10, borderTopWidth: 0.5, borderTopColor: colors.borderLight },
  summaryTotalLabel: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  summaryTotalValue: { fontSize: 16, fontWeight: '700', color: colors.secondary },
  bottomBar: { backgroundColor: colors.white, padding: 20, borderTopWidth: 0.5, borderTopColor: colors.surfaceMuted },
  confirmButton: { height: 48, backgroundColor: colors.secondary, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  // Carrinho vazio: o botão fica apagado para a situação ficar visível
  // antes do toque. Continua tocável de propósito — quem tocar recebe a
  // explicação em vez de um botão morto sem resposta.
  confirmButtonOff: { opacity: 0.45 },
  confirmButtonText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
});