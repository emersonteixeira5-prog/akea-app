import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase, type Address } from '@/services/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { UserRootStackParamList } from '@/navigation/UserRootStack';
import { useLanguage } from '@/i18n';
import { showAlert } from '@/utils/alert';

type Props = NativeStackScreenProps<UserRootStackParamList, 'Enderecos'>;

type FormState = {
  label: string;
  recipient_name: string;
  postal_code: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

const EMPTY_FORM: FormState = {
  label: 'Casa',
  recipient_name: '',
  postal_code: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

const LABEL_OPTIONS = ['Casa', 'Trabalho', 'Outro'];

const LABEL_DISPLAY_KEYS: Record<string, 'addressLabelHome' | 'addressLabelWork' | 'addressLabelOther'> = {
  Casa: 'addressLabelHome',
  Trabalho: 'addressLabelWork',
  Outro: 'addressLabelOther',
};

function formatCep(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function EnderecosScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    loadAddresses();
  }, []);

  async function loadAddresses() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (data) setAddresses(data as Address[]);
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(address: Address) {
    setEditingId(address.id);
    setForm({
      label: address.label,
      recipient_name: address.recipient_name,
      postal_code: address.postal_code,
      street: address.street,
      number: address.number,
      complement: address.complement ?? '',
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function patch(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate(): string | null {
    if (!form.recipient_name.trim()) return t('errRecipientName');
    const cep = form.postal_code.replace(/\D/g, '');
    if (cep.length !== 8) return t('errPostalCode');
    if (!form.street.trim()) return t('errStreet');
    if (!form.number.trim()) return t('errNumber');
    if (!form.neighborhood.trim()) return t('errNeighborhood');
    if (!form.city.trim()) return t('errCity');
    if (form.state.trim().length !== 2) return t('errState');
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) { showAlert(t('requiredField'), err); return; }

    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setSaving(false); return; }

    const payload = {
      user_id: userData.user.id,
      label: form.label.trim() || 'Casa',
      recipient_name: form.recipient_name.trim(),
      postal_code: form.postal_code.replace(/\D/g, ''),
      street: form.street.trim(),
      number: form.number.trim(),
      complement: form.complement.trim() || null,
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('addresses').update(payload).eq('id', editingId));
    } else {
      const isFirst = addresses.length === 0;
      ({ error } = await supabase.from('addresses').insert({ ...payload, is_default: isFirst }));
    }

    setSaving(false);
    if (error) { showAlert(t('saveFailedTitle'), error.message); return; }
    cancelForm();
    loadAddresses();
  }

  async function handleSetDefault(id: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error: clearError } = await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userData.user.id)
      .neq('id', id);
    if (clearError) { showAlert(t('error'), clearError.message); return; }

    const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    if (error) { showAlert(t('error'), error.message); return; }
    loadAddresses();
  }

  function confirmDelete(id: string) {
    showAlert(t('removeAddressTitle'), t('removeAddressConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('remove'), style: 'destructive', onPress: () => deleteAddress(id) },
    ]);
  }

  async function deleteAddress(id: string) {
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if (error) { showAlert(t('error'), error.message); return; }
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={20} color={colors.secondary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('myAddresses')}</Text>
          <Pressable onPress={openAdd} disabled={showForm}>
            <Feather name="plus" size={22} color={showForm ? colors.border : colors.secondary} />
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {loading ? (
            <ActivityIndicator color={colors.secondary} style={{ marginTop: 32 }} />
          ) : (
            <>
              {addresses.length === 0 && !showForm && (
                <View style={styles.emptyState}>
                  <Feather name="map-pin" size={32} color={colors.border} />
                  <Text style={styles.emptyText}>{t('noAddressYet')}</Text>
                  <Pressable style={styles.emptyAddButton} onPress={openAdd}>
                    <Text style={styles.emptyAddButtonText}>{t('addFirstAddress')}</Text>
                  </Pressable>
                </View>
              )}

              {addresses.map((address) => (
                <View key={address.id} style={[styles.card, address.is_default && styles.cardDefault]}>
                  <View style={styles.cardTop}>
                    <View style={styles.labelRow}>
                      <Feather name="map-pin" size={13} color={address.is_default ? colors.white : colors.secondary} />
                      <Text style={[styles.cardLabel, address.is_default && styles.cardLabelDefault]}>
                        {LABEL_DISPLAY_KEYS[address.label] ? t(LABEL_DISPLAY_KEYS[address.label]) : address.label}
                      </Text>
                      {address.is_default && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>{t('defaultBadge')}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardActions}>
                      {!address.is_default && (
                        <Pressable onPress={() => handleSetDefault(address.id)} style={styles.iconBtn}>
                          <Feather name="check-circle" size={18} color={colors.secondary} />
                        </Pressable>
                      )}
                      <Pressable onPress={() => openEdit(address)} style={styles.iconBtn}>
                        <Feather name="edit-2" size={16} color={address.is_default ? colors.white : colors.secondary} />
                      </Pressable>
                      <Pressable onPress={() => confirmDelete(address.id)} style={styles.iconBtn}>
                        <Feather name="trash-2" size={16} color={address.is_default ? colors.white : colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={[styles.cardRecipient, address.is_default && styles.cardTextDefault]}>{address.recipient_name}</Text>
                  <Text style={[styles.cardLine, address.is_default && styles.cardTextDefault]}>
                    {address.street}, {address.number}{address.complement ? ` — ${address.complement}` : ''}
                  </Text>
                  <Text style={[styles.cardLine, address.is_default && styles.cardTextDefault]}>
                    {address.neighborhood} · {address.city}/{address.state}
                  </Text>
                  <Text style={[styles.cardCep, address.is_default && styles.cardTextDefault]}>
                    {t('addressPostalCode')} {address.postal_code.replace(/(\d{5})(\d{3})/, '$1-$2')}
                  </Text>
                </View>
              ))}

              {showForm && (
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>{editingId ? t('editAddress') : t('newAddress')}</Text>

                  <Text style={styles.formLabel}>{t('addressLabel')}</Text>
                  <View style={styles.chipsRow}>
                    {LABEL_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt}
                        style={[styles.chip, form.label === opt && styles.chipActive]}
                        onPress={() => patch('label', opt)}
                      >
                        <Text style={[styles.chipText, form.label === opt && styles.chipTextActive]}>{t(LABEL_DISPLAY_KEYS[opt])}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.formLabel}>{t('addressRecipientName')}</Text>
                  <TextInput style={styles.input} placeholder={t('fullNamePlaceholder')} value={form.recipient_name} onChangeText={(v) => patch('recipient_name', v)} />

                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>{t('addressPostalCode')}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="00000-000"
                        value={formatCep(form.postal_code)}
                        onChangeText={(v) => patch('postal_code', v.replace(/\D/g, ''))}
                        keyboardType="number-pad"
                        maxLength={9}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>{t('addressState')}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="SP"
                        value={form.state}
                        onChangeText={(v) => patch('state', v.toUpperCase())}
                        maxLength={2}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>

                  <Text style={styles.formLabel}>{t('addressStreet')}</Text>
                  <TextInput style={styles.input} placeholder={t('addressStreetPlaceholder')} value={form.street} onChangeText={(v) => patch('street', v)} />

                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>{t('addressNumber')}</Text>
                      <TextInput style={styles.input} placeholder="123" value={form.number} onChangeText={(v) => patch('number', v)} keyboardType="number-pad" />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.formLabel}>{t('addressComplement')}</Text>
                      <TextInput style={styles.input} placeholder={t('addressComplementPlaceholder')} value={form.complement} onChangeText={(v) => patch('complement', v)} />
                    </View>
                  </View>

                  <Text style={styles.formLabel}>{t('addressNeighborhood')}</Text>
                  <TextInput style={styles.input} placeholder={t('addressNeighborhood')} value={form.neighborhood} onChangeText={(v) => patch('neighborhood', v)} />

                  <Text style={styles.formLabel}>{t('addressCity')}</Text>
                  <TextInput style={styles.input} placeholder={t('addressCity')} value={form.city} onChangeText={(v) => patch('city', v)} />

                  <View style={styles.formActions}>
                    <Pressable style={styles.cancelButton} onPress={cancelForm} disabled={saving}>
                      <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                    </Pressable>
                    <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
                      {saving ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                      ) : (
                        <Text style={styles.saveButtonText}>{t('save')}</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 15, fontWeight: '600', color: colors.secondary },
  scroll: { flex: 1 },
  emptyState: { alignItems: 'center', gap: 10, paddingTop: 48 },
  emptyText: { fontSize: 13, color: colors.secondary, opacity: 0.5 },
  emptyAddButton: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.secondary, borderRadius: radius.lg },
  emptyAddButtonText: { color: colors.primary, fontSize: 13, fontWeight: '500' },

  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, marginBottom: 12 },
  cardDefault: { backgroundColor: colors.secondary },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardLabel: { fontSize: 12, fontWeight: '600', color: colors.secondary },
  cardLabelDefault: { color: colors.white },
  defaultBadge: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 9, fontWeight: '700', color: colors.secondary },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 4 },
  cardRecipient: { fontSize: 13, fontWeight: '500', color: colors.secondary, marginBottom: 2 },
  cardLine: { fontSize: 11, color: colors.textLabel, lineHeight: 17 },
  cardCep: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  cardTextDefault: { color: colors.white, opacity: 0.9 },

  formCard: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 18, marginTop: 4 },
  formTitle: { fontSize: 14, fontWeight: '600', color: colors.secondary, marginBottom: 14 },
  formLabel: { fontSize: 11, color: colors.textLabel, marginBottom: 4, marginTop: 6 },
  input: {
    height: 42,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.secondary,
    marginBottom: 2,
    backgroundColor: colors.primary,
  },
  row: { flexDirection: 'row', gap: 10 },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 12, color: colors.secondary },
  chipTextActive: { color: colors.primary, fontWeight: '500' },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelButton: { flex: 1, height: 44, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { fontSize: 13, color: colors.textLabel },
  saveButton: { flex: 2, height: 44, backgroundColor: colors.secondary, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { fontSize: 13, fontWeight: '500', color: colors.primary },

});
