import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase, type Product } from '@/services/supabase';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useLanguage } from '@/i18n';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { BrandTabsParamList } from '@/navigation/BrandTabs';
import { showAlert } from '@/utils/alert';

type Props = BottomTabScreenProps<BrandTabsParamList, 'CatalogoTab'>;
type FilterTab = 'active' | 'sold';

function formatReais(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

export function CatalogoScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [brandId, setBrandId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<FilterTab>('active');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { pickAndUpload, uploading: uploadingPhoto } = useImageUpload('product-photos');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  async function loadData() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: brandData } = await supabase.from('brands').select('id').eq('owner_id', userData.user.id).maybeSingle();
    if (!brandData) {
      setLoading(false);
      return;
    }
    setBrandId(brandData.id);

    const { data } = await supabase.from('products').select('*').eq('brand_id', brandData.id).order('created_at', { ascending: false });
    if (data) setProducts(data as Product[]);
    setLoading(false);
  }

  async function handleAddProduct() {
    if (!brandId) return;
    const priceNumber = Number(newPrice.replace(',', '.'));
    if (!newName.trim() || !priceNumber || priceNumber <= 0) {
      showAlert(t('fillNameAndPrice'), t('priceMustBePositive'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('products').insert({
        brand_id: brandId,
        name: newName.trim(),
        description: newDescription.trim() || null,
        price_cents: Math.round(priceNumber * 100),
        status: 'active',
        is_unique_piece: true,
        photo_url: newPhotoUrl,
      });
      if (error) throw new Error(error.message);

      setNewName('');
      setNewDescription('');
      setNewPrice('');
      setNewPhotoUrl(null);
      setShowAddForm(false);
      loadData();
    } catch (err: any) {
      showAlert(t('saveFailedTitle'), String(err?.message ?? err));
    } finally {
      setSaving(false);
    }
  }

  const filtered = products.filter((p) => p.status === filter);
  const activeCount = products.filter((p) => p.status === 'active').length;
  const soldCount = products.filter((p) => p.status === 'sold').length;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('catalog')}</Text>
        <Pressable style={styles.addButton} onPress={() => setShowAddForm((v) => !v)}>
          <Feather name={showAddForm ? 'x' : 'plus'} size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }}>
        {showAddForm && (
          <View style={styles.addForm}>
            <Text style={styles.addFormTitle}>{t('newProduct')}</Text>
            <Pressable
              style={styles.photoPickerBox}
              onPress={async () => {
                const url = await pickAndUpload(brandId ?? 'products');
                if (url) setNewPhotoUrl(url);
              }}
              disabled={uploadingPhoto}
            >
              {newPhotoUrl ? (
                <Image source={{ uri: newPhotoUrl }} style={styles.photoPickerPreview} />
              ) : uploadingPhoto ? (
                <ActivityIndicator color={colors.secondary} />
              ) : (
                <>
                  <Feather name="camera" size={22} color={colors.secondary} style={{ opacity: 0.6 }} />
                  <Text style={styles.photoPickerText}>{t('addProductPhoto')}</Text>
                </>
              )}
            </Pressable>
            <Text style={styles.label}>{t('name')}</Text>
            <TextInput style={styles.input} placeholder={t('productNamePlaceholder')} value={newName} onChangeText={setNewName} />
            <Text style={styles.label}>{t('description')}</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder={t('describeThisPiecePlaceholder')}
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
            />
            <Text style={styles.label}>{t('priceInReais')}</Text>
            <TextInput style={styles.input} placeholder={t('priceExamplePlaceholder')} value={newPrice} onChangeText={setNewPrice} keyboardType="decimal-pad" />
            <Pressable style={styles.saveButton} onPress={handleAddProduct} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.saveButtonText}>{t('saveProduct')}</Text>}
            </Pressable>
          </View>
        )}

        <View style={styles.filterRow}>
          <Pressable style={[styles.filterChip, filter === 'active' && styles.filterChipActive]} onPress={() => setFilter('active')}>
            <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>{t('activeFilterLabel')} ({activeCount})</Text>
          </Pressable>
          <Pressable style={[styles.filterChip, filter === 'sold' && styles.filterChipActive]} onPress={() => setFilter('sold')}>
            <Text style={[styles.filterText, filter === 'sold' && styles.filterTextActive]}>{t('soldFilterLabel')} ({soldCount})</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.secondary} style={{ marginTop: 16 }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>{filter === 'active' ? t('noActiveProductsYet') : t('noSoldProductsYet')}</Text>
        ) : (
          filtered.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productImage}>
                {product.photo_url ? (
                  <Image source={{ uri: product.photo_url }} style={{ width: 54, height: 54, borderRadius: radius.md }} />
                ) : (
                  <Feather name="image" size={22} color={colors.border} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>{formatReais(product.price_cents)}</Text>
              </View>
              <View style={[styles.statusBadge, product.status === 'sold' && styles.statusBadgeSold]}>
                <Text style={[styles.statusText, product.status === 'sold' && styles.statusTextSold]}>
                  {product.status === 'active' ? t('activeStatusLabel') : t('soldStatusLabel')}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  header: { backgroundColor: colors.white, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.secondary },
  addButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  addForm: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginBottom: 16 },
  addFormTitle: { fontSize: 13, fontWeight: '600', color: colors.secondary, marginBottom: 12 },
  label: { fontSize: 11, color: colors.textLabel, marginBottom: 4 },
  input: { height: 40, borderRadius: radius.md, borderWidth: 0.5, borderColor: colors.border, paddingHorizontal: 12, fontSize: 13, color: colors.secondary, marginBottom: 10 },
  textarea: { height: 56, paddingTop: 8, textAlignVertical: 'top' },
  saveButton: { height: 42, backgroundColor: colors.secondary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveButtonText: { color: colors.primary, fontSize: 13, fontWeight: '500' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.white },
  filterChipActive: { backgroundColor: colors.secondary },
  filterText: { fontSize: 12, color: colors.secondary },
  filterTextActive: { color: colors.primary, fontWeight: '500' },
  emptyText: { fontSize: 12, color: colors.secondary, opacity: 0.6 },
  productCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, marginBottom: 10 },
  productImage: { width: 54, height: 54, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoPickerBox: { height: 80, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.secondary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12, flexDirection: 'row' },
  photoPickerPreview: { width: '100%', height: '100%', borderRadius: radius.md },
  photoPickerText: { fontSize: 12, color: colors.secondary, opacity: 0.7 },
  productName: { fontSize: 13, fontWeight: '500', color: colors.secondary },
  productPrice: { fontSize: 13, fontWeight: '600', color: colors.secondary, marginTop: 2 },
  statusBadge: { backgroundColor: colors.successBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeSold: { backgroundColor: colors.surfaceMuted },
  statusText: { fontSize: 10, fontWeight: '600', color: colors.success },
  statusTextSold: { color: colors.textMuted },
});