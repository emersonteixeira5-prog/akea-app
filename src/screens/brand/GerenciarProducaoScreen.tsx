import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
  TextInput, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase, type OrderStage, type ImageBucket } from '@/services/supabase';
import { useLanguage } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BrandRootStackParamList } from '@/navigation/BrandRootStack';
import { showAlert } from '@/utils/alert';

type Props = NativeStackScreenProps<BrandRootStackParamList, 'GerenciarProducao'>;

// Foto de etapa de produção. Tipado de propósito: aqui estava 'produtos',
// que nunca existiu no projeto, e como a chamada era
// supabase.storage.from('produtos') — string solta — nada apontava o erro.
// Com o tipo, um bucket inexistente não compila. `ImageBucket` em vez de
// `StorageBucket` porque é foto: assim nem o bucket de vídeo entra aqui.
//
// Vai para result-photos, o mesmo bucket das fotos de trabalho pronto, por
// ser o de conteúdo mais parecido entre os que existem. Se um dia houver um
// bucket só para etapas, basta criá-lo, acrescentá-lo a StorageBucket em
// services/supabase.ts e trocar esta linha.
const BUCKET_ETAPAS: ImageBucket = 'result-photos';

const QUICK_CHIPS = [
  'Pedido recebido',
  'Materiais separados',
  'Corte',
  'Costura',
  'Acabamento',
  'Controle de qualidade',
  'Pronto para entrega',
];

const CHIP_LABEL_KEYS: Record<string, TranslationKey> = {
  'Pedido recebido': 'stageChipReceived',
  'Materiais separados': 'stageChipMaterials',
  'Corte': 'stageChipCutting',
  'Costura': 'stageChipSewing',
  'Acabamento': 'stageChipFinishing',
  'Controle de qualidade': 'stageChipQuality',
  'Pronto para entrega': 'stageChipReadyForDelivery',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function GerenciarProducaoScreen({ route, navigation }: Props) {
  const { t } = useLanguage();
  const { orderId } = route.params;
  const [stages, setStages] = useState<OrderStage[]>([]);
  const [orderStatus, setOrderStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [stageName, setStageName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadData();
  }, [orderId]);

  async function loadData() {
    setLoading(true);
    const [{ data: orderData }, { data: stagesData }] = await Promise.all([
      supabase.from('orders').select('status').eq('id', orderId).maybeSingle(),
      supabase
        .from('order_stages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),
    ]);
    if (orderData) setOrderStatus(orderData.status as string);
    if (stagesData) setStages(stagesData as OrderStage[]);
    setLoading(false);
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert(t('permissionRequired'), t('galleryPermissionMsg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    setPhotoUri(result.assets[0].uri);
  }

  async function handlePostStage() {
    if (!stageName.trim()) {
      showAlert(t('requiredField'), t('stageNameRequiredMsg'));
      return;
    }
    setPosting(true);

    // Falha de upload aborta a publicação, em vez de publicar sem a foto.
    // A etapa é só inserção: não há tela de editar nem de apagar, então uma
    // etapa publicada sem a foto que a marca anexou fica errada para sempre.
    // Antes daqui o erro era descartado em silêncio e a marca não sabia.
    let photoUrl: string | null = null;
    if (photoUri) {
      try {
        const resp = await fetch(photoUri);
        const blob = await resp.blob();
        const path = `stages/${orderId}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_ETAPAS)
          .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

        if (uploadError) {
          setPosting(false);
          showAlert(t('errorPostingStage'), `${t('stagePhotoFailedMsg')}\n\n${uploadError.message}`);
          return;
        }

        const { data } = supabase.storage.from(BUCKET_ETAPAS).getPublicUrl(path);
        photoUrl = data.publicUrl;
      } catch (err: unknown) {
        setPosting(false);
        const detalhe = err instanceof Error ? err.message : String(err);
        showAlert(t('errorPostingStage'), `${t('stagePhotoFailedMsg')}\n\n${detalhe}`);
        return;
      }
    }

    const { error } = await supabase.from('order_stages').insert({
      order_id: orderId,
      stage_name: stageName.trim(),
      description: description.trim() || null,
      photo_url: photoUrl,
    });

    setPosting(false);

    if (error) {
      showAlert(t('errorPostingStage'), error.message);
      return;
    }
    setStageName('');
    setDescription('');
    setPhotoUri(null);
    await loadData();
  }

  async function handleMarkReady() {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'ready' })
      .eq('id', orderId);
    if (error) {
      showAlert(t('error'), error.message);
      return;
    }
    setOrderStatus('ready');
    showAlert(t('orderUpdated'), t('statusChangedReadyMsg'));
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('manageProduction')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator color={colors.secondary} style={{ marginTop: 24 }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>{t('publishedStages')}</Text>
            {stages.length === 0 ? (
              <Text style={styles.emptyText}>{t('noStagesPosted')}</Text>
            ) : (
              <View style={styles.stageList}>
                {stages.map((stage) => (
                  <View key={stage.id} style={styles.stageCard}>
                    <Text style={styles.stageName}>{stage.stage_name}</Text>
                    {stage.description ? (
                      <Text style={styles.stageDesc}>{stage.description}</Text>
                    ) : null}
                    {stage.photo_url ? (
                      <Image
                        source={{ uri: stage.photo_url }}
                        style={styles.stagePhoto}
                        resizeMode="cover"
                      />
                    ) : null}
                    <Text style={styles.stageDate}>{formatDateTime(stage.created_at)}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>{t('postNewStage')}</Text>

            <Text style={styles.fieldLabel}>{t('stageName')} *</Text>
            <TextInput
              style={styles.input}
              value={stageName}
              onChangeText={setStageName}
              placeholder={t('stageNamePlaceholder')}
              placeholderTextColor={colors.textMuted}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            >
              {QUICK_CHIPS.map((chip) => (
                <Pressable
                  key={chip}
                  style={[styles.chip, stageName === chip && styles.chipActive]}
                  onPress={() => setStageName(chip)}
                >
                  <Text style={[styles.chipText, stageName === chip && styles.chipTextActive]}>
                    {t(CHIP_LABEL_KEYS[chip])}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>{t('stageDescription')}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('stageDescriptionPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Pressable style={styles.photoButton} onPress={handlePickPhoto}>
              <Feather name="camera" size={15} color={colors.secondary} />
              <Text style={styles.photoButtonText}>
                {photoUri ? t('changePhoto') : t('addStagePhoto')}
              </Text>
            </Pressable>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            ) : null}

            <Pressable
              style={[styles.postButton, posting && styles.postButtonDisabled]}
              onPress={handlePostStage}
              disabled={posting}
            >
              {posting ? (
                <ActivityIndicator color={colors.secondary} />
              ) : (
                <Text style={styles.postButtonText}>{t('postStage')}</Text>
              )}
            </Pressable>

            {stageName === 'Pronto para entrega' &&
              orderStatus !== 'ready' &&
              orderStatus !== 'completed' && (
                <Pressable style={styles.readyButton} onPress={handleMarkReady}>
                  <Feather name="check-circle" size={15} color={colors.primary} />
                  <Text style={styles.readyButtonText}>{t('markOrderAsReady')}</Text>
                </Pressable>
              )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    opacity: 0.7,
  },
  emptyText: { fontSize: 12, color: colors.secondary, opacity: 0.6, marginBottom: 8 },
  stageList: { gap: 10, marginBottom: 4 },
  stageCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14 },
  stageName: { fontSize: 13, fontWeight: '600', color: colors.secondary },
  stageDesc: { fontSize: 11, color: colors.textLabel, marginTop: 4, lineHeight: 16 },
  stagePhoto: { width: '100%', height: 140, borderRadius: radius.md, marginTop: 10 },
  stageDate: { fontSize: 10, color: colors.textMuted, marginTop: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '500', color: colors.secondary, marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.secondary,
    marginBottom: 10,
  },
  inputMultiline: { height: 80, paddingTop: 12 },
  chipsScroll: { marginBottom: 14 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 11, color: colors.secondary },
  chipTextActive: { color: colors.primary, fontWeight: '500' },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  photoButtonText: { fontSize: 12, color: colors.secondary },
  photoPreview: { width: '100%', height: 160, borderRadius: radius.md, marginBottom: 12 },
  postButton: {
    height: 46,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.secondary,
  },
  postButtonDisabled: { opacity: 0.5 },
  postButtonText: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
  },
  readyButtonText: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
