import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import { supabase, type Profile } from '@/services/supabase';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useLanguage } from '@/i18n';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { UserTabsParamList } from '@/navigation/UserTabs';
import { showAlert } from '@/utils/alert';
import type { UserRootNavigation } from '@/navigation/UserRootStack';

type Props = BottomTabScreenProps<UserTabsParamList, 'PerfilTab'>;

type MenuRoute = 'MeusPedidos' | 'Enderecos' | 'MetodosPagamento' | 'Notificacoes' | 'Termos' | 'Ajuda' | 'Idioma' | 'MarcasQueSigo';

export function PerfilScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const { pickAndUpload, uploading: uploadingAvatar } = useImageUpload('avatars');
  const { t } = useLanguage();
  const MENU_ITEMS: { icon: keyof typeof Feather.glyphMap; label: string; route?: MenuRoute }[] = [
    { icon: 'package',     label: t('myOrders'),        route: 'MeusPedidos' },
    { icon: 'heart',       label: t('brandsIFollow'),  route: 'MarcasQueSigo' },
    { icon: 'map-pin',     label: t('addresses'),       route: 'Enderecos' },
    { icon: 'credit-card', label: t('paymentMethods'),  route: 'MetodosPagamento' },
    { icon: 'bell',        label: t('notifications'),   route: 'Notificacoes' },
    { icon: 'file-text',   label: t('termsPrivacy'),    route: 'Termos' },
    { icon: 'help-circle', label: t('helpSupport'),     route: 'Ajuda' },
    { icon: 'globe',       label: t('language'),        route: 'Idioma' },
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setEmail(userData.user.email ?? '');

    const { data } = await supabase.from('profiles').select('*').eq('id', userData.user.id).maybeSingle();
    if (data) setProfile(data as Profile);
  }

  function handleEditProfile() {
    navigation.getParent<UserRootNavigation>()?.navigate('CompletarPerfil');
  }

  async function handleChangeAvatar() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const url = await pickAndUpload(userData.user.id);
    if (!url) return;

    // Sem checar o erro, a foto subia pro Storage e a gravação no perfil
    // falhava calada — o estado local mudava e dava impressão de sucesso
    // até a próxima carga da tela.
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', userData.user.id);

    if (error) {
      showAlert(t('error'), error.message);
      return;
    }
    setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev));
  }

  function handleMenuPress(route?: MenuRoute) {
    if (route) {
      navigation.getParent<UserRootNavigation>()?.navigate(route);
    } else {
      showAlert(t('comingSoon'), t('comingSoonMsg'));
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile')}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.profileCard}>
          <Pressable style={styles.avatar} onPress={handleChangeAvatar} disabled={uploadingAvatar}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Feather name="user" size={24} color={colors.textMuted} />
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile?.full_name || t('noNameYet')}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
          </View>
          <Pressable onPress={handleEditProfile}>
            <Feather name="edit-2" size={16} color={colors.secondary} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.impact_points ?? 0}</Text>
            <Text style={styles.statLabel}>{t('points')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.city || '—'}</Text>
            <Text style={styles.statLabel}>{t('city')}</Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <Pressable
              key={item.route ?? item.icon}
              style={[styles.menuItem, i < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
              onPress={() => handleMenuPress(item.route)}
            >
              <Feather name={item.icon} size={18} color={colors.secondary} style={{ width: 18 }} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={14} color={colors.border} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>{t('signOut')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  header: { backgroundColor: colors.white, paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.secondary },
  scroll: { flex: 1, padding: 20 },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  profileName: { fontSize: 15, fontWeight: '600', color: colors.secondary },
  profileEmail: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.lg, paddingVertical: 14, marginBottom: 18 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: colors.secondary },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.borderLight },
  menuCard: { backgroundColor: colors.white, borderRadius: radius.lg, marginBottom: 18, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.surfaceMuted },
  menuLabel: { flex: 1, fontSize: 13, color: colors.secondary },
  signOutButton: {
    height: 44,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { fontSize: 13, fontWeight: '500', color: colors.textLabel },
});