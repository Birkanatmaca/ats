import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Bell,
  Building2,
  Camera,
  ImageIcon,
  LogOut,
  Mail,
  Phone,
  Shield,
  Trash2,
  UserRound
} from "lucide-react-native";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { NotificationPreferences } from "@/shared/api/types";
import { useAuth } from "@/shared/auth/AuthContext";
import { roleLabels } from "@/shared/auth/roleRoutes";
import { countPendingOfflineDrafts, clearOfflineQueueForSession } from "@/features/teacher/offline/storage";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";
import { pickProfileAvatarFromCamera, pickProfileAvatarFromLibrary } from "@/shared/utils/pickProfileAvatar";

function profileInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function heroColorForRole(role?: string) {
  switch (role) {
    case "teacher":
      return "#059669";
    case "principal":
      return "#2563eb";
    case "guidance":
      return "#7c3aed";
    case "guardian":
      return "#0891b2";
    default:
      return colors.primary;
  }
}

function statusLabel(status: string) {
  if (status === "active") return "Aktif hesap";
  if (status === "passive") return "Pasif hesap";
  return status;
}

function statusTone(status: string) {
  if (status === "active") return { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857" };
  return { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" };
}

export function ProfileScreen() {
  const router = useRouter();
  const { session, signIn, signOut } = useAuth();
  const queryClient = useQueryClient();

  const profileQ = useQuery({ queryKey: queryKeys.profile, queryFn: () => api.profile() });
  const tenantQ = useQuery({ queryKey: queryKeys.tenant, queryFn: () => api.tenant() });
  const prefsQ = useQuery({ queryKey: queryKeys.notificationPreferences, queryFn: () => api.notificationPreferences() });

  const prefsMut = useMutation({
    mutationFn: (payload: Partial<NotificationPreferences>) => api.updateNotificationPreferences(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationPreferences });
    }
  });

  const avatarMut = useMutation({
    mutationFn: (avatarUrl: string | null) => api.updateProfile({ avatarUrl }),
    onSuccess: async (profile) => {
      if (session) {
        await signIn({
          ...session,
          principal: { ...session.principal, name: profile.fullName, email: profile.email }
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    }
  });

  const refreshing = profileQ.isRefetching || tenantQ.isRefetching;
  const onRefresh = () => {
    void profileQ.refetch();
    void tenantQ.refetch();
  };

  const uploadAvatar = async (pick: () => Promise<string | null>, fallbackMessage: string) => {
    try {
      const dataUrl = await pick();
      if (!dataUrl) return;
      avatarMut.mutate(dataUrl);
    } catch (error) {
      Alert.alert("Hata", error instanceof Error ? error.message : fallbackMessage);
    }
  };

  const handleRemoveAvatar = () => {
    Alert.alert("Fotoğrafı kaldır", "Profil fotoğrafınız silinecek.", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Kaldır", style: "destructive", onPress: () => avatarMut.mutate(null) }
    ]);
  };

  if (profileQ.isLoading) {
    return (
      <Screen layout="stack">
        <DetailBackBar label="Daha Fazla" />
        <LoadingBlock />
      </Screen>
    );
  }

  if (profileQ.isError) {
    return (
      <Screen layout="stack">
        <DetailBackBar label="Daha Fazla" />
        <ErrorState message={profileQ.error.message} onRetry={() => void profileQ.refetch()} />
      </Screen>
    );
  }

  const profile = profileQ.data;
  const role = session?.principal.role ?? profile?.role;
  const heroColor = heroColorForRole(role);
  const pill = statusTone(profile?.status ?? "active");
  const avatarUrl = profile?.avatarUrl?.trim();

  return (
    <Screen layout="stack" refreshing={refreshing} topInsetExtra={6} onRefresh={onRefresh}>
      <DetailBackBar label="Daha Fazla" />

      {profile ? (
        <>
          <View style={styles.heroShell}>
            <View
              style={[
                styles.hero,
                { backgroundColor: heroColor },
                platformShadow("0 14px 32px rgba(28,53,87,0.18)", {
                  shadowColor: heroColor,
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.2,
                  shadowRadius: 18,
                  elevation: 8
                })
              ]}
            >
              <View pointerEvents="none" style={[styles.heroBlob, styles.heroBlobLight]} />
              <View pointerEvents="none" style={[styles.heroBlob, styles.heroBlobSoft]} />

              <View style={styles.heroTop}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatarRing}>
                    {avatarUrl ? (
                      <Image accessibilityLabel={profile.fullName} source={{ uri: avatarUrl }} style={styles.heroAvatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>{profileInitials(profile.fullName)}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroName}>{profile.fullName}</Text>
                  <Text style={styles.heroRole}>{role ? roleLabels[role] : "Kullanıcı"}</Text>
                  <View style={[styles.statusPill, { backgroundColor: pill.bg, borderColor: pill.border }]}>
                    <Shield color={pill.text} size={12} strokeWidth={2.4} />
                    <Text style={[styles.statusPillText, { color: pill.text }]}>{statusLabel(profile.status)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <UserRound color={colors.accent} size={16} strokeWidth={2.2} />
              <Text style={styles.sectionTitle}>Hesap bilgileri</Text>
            </View>

            <View style={styles.photoBlock}>
              <View style={styles.photoPreviewWrap}>
                {avatarUrl ? (
                  <Image accessibilityLabel={profile.fullName} source={{ uri: avatarUrl }} style={styles.photoPreview} />
                ) : (
                  <View style={[styles.photoFallback, { backgroundColor: heroColor }]}>
                    <Text style={styles.photoFallbackText}>{profileInitials(profile.fullName)}</Text>
                  </View>
                )}
                {avatarMut.isPending ? (
                  <View style={styles.photoLoading}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                ) : null}
              </View>

              <View style={styles.photoCopy}>
                <Text style={styles.photoTitle}>Profil fotoğrafı</Text>
                <Text style={styles.photoHint}>PNG, JPEG veya WebP. En fazla ~900 KB.</Text>
                <View style={styles.photoActions}>
                  <Pressable
                    disabled={avatarMut.isPending}
                    onPress={() => void uploadAvatar(pickProfileAvatarFromLibrary, "Fotoğraf seçilemedi.")}
                    style={({ pressed }) => [styles.photoBtn, styles.photoBtnPrimary, pressed && styles.photoBtnPressed]}
                  >
                    <ImageIcon color="#fff" size={15} strokeWidth={2.2} />
                    <Text style={styles.photoBtnPrimaryText}>Fotoğraf seç</Text>
                  </Pressable>
                  <Pressable
                    disabled={avatarMut.isPending}
                    onPress={() => void uploadAvatar(pickProfileAvatarFromCamera, "Fotoğraf çekilemedi.")}
                    style={({ pressed }) => [styles.photoBtn, styles.photoBtnSecondary, pressed && styles.photoBtnPressed]}
                  >
                    <Camera color={colors.accent} size={15} strokeWidth={2.2} />
                    <Text style={styles.photoBtnSecondaryText}>Fotoğraf çek</Text>
                  </Pressable>
                  {avatarUrl ? (
                    <Pressable
                      disabled={avatarMut.isPending}
                      onPress={handleRemoveAvatar}
                      style={({ pressed }) => [styles.photoBtn, styles.photoBtnGhost, pressed && styles.photoBtnPressed]}
                    >
                      <Trash2 color={colors.danger} size={15} strokeWidth={2.2} />
                      <Text style={styles.photoBtnGhostText}>Kaldır</Text>
                    </Pressable>
                  ) : null}
                </View>
                {avatarMut.isError ? <Text style={styles.errorText}>{avatarMut.error.message}</Text> : null}
              </View>
            </View>

            <View style={styles.infoGrid}>
              <InfoTile icon={Mail} label="E-posta" value={profile.email} />
              <InfoTile icon={Phone} label="Telefon" value={profile.phone?.trim() || "Belirtilmedi"} />
              <InfoTile icon={Shield} label="Rol" value={role ? roleLabels[role] : "—"} />
              {tenantQ.data ? <InfoTile icon={Building2} label="Kurum" value={tenantQ.data.name} /> : null}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <Bell color={colors.accent} size={16} strokeWidth={2.2} />
              <Text style={styles.sectionTitle}>Push bildirimleri</Text>
            </View>
            {prefsQ.isLoading ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <View style={styles.prefList}>
                <PreferenceRow
                  disabled={prefsMut.isPending}
                  label="Devamsızlık"
                  onChange={(value) => prefsMut.mutate({ attendance: value })}
                  value={prefsQ.data?.attendance ?? true}
                />
                <PreferenceRow
                  disabled={prefsMut.isPending}
                  label="Duyurular"
                  onChange={(value) => prefsMut.mutate({ announcements: value })}
                  value={prefsQ.data?.announcements ?? true}
                />
                <PreferenceRow
                  disabled={prefsMut.isPending}
                  label="Destek talepleri"
                  onChange={(value) => prefsMut.mutate({ support: value })}
                  value={prefsQ.data?.support ?? true}
                />
                <PreferenceRow
                  disabled={prefsMut.isPending}
                  label="Rehberlik hatırlatmaları"
                  onChange={(value) => prefsMut.mutate({ guidance: value })}
                  value={prefsQ.data?.guidance ?? true}
                />
                <PreferenceRow
                  disabled={prefsMut.isPending}
                  label="Program güncellemeleri"
                  onChange={(value) => prefsMut.mutate({ schedule: value })}
                  value={prefsQ.data?.schedule ?? true}
                />
              </View>
            )}
          </View>

          <View style={styles.logoutCard}>
            <Pressable
              onPress={() => {
                void (async () => {
                  const pending = await countPendingOfflineDrafts(session);
                  if (pending > 0) {
                    Alert.alert(
                      "Bekleyen yoklama",
                      `${pending} yoklama henüz senkronize edilmedi. Çıkış yaparsanız bu cihazdaki bekleyen kayıtlar silinir.`,
                      [
                        { text: "İptal", style: "cancel" },
                        {
                          text: "Çıkış yap",
                          style: "destructive",
                          onPress: () => {
                            void clearOfflineQueueForSession(session).then(() =>
                              signOut().then(() => router.replace("/(auth)/login"))
                            );
                          }
                        }
                      ]
                    );
                    return;
                  }
                  await signOut();
                  router.replace("/(auth)/login");
                })();
              }}
              style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
            >
              <View style={styles.logoutIconWrap}>
                <LogOut color={colors.danger} size={18} strokeWidth={2.2} />
              </View>
              <View style={styles.logoutCopy}>
                <Text style={styles.logoutTitle}>Çıkış yap</Text>
                <Text style={styles.logoutHint}>Hesabınızdan güvenli çıkış</Text>
              </View>
            </Pressable>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function PreferenceRow({
  label,
  value,
  disabled,
  onChange
}: {
  label: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.prefRow}>
      <Text style={styles.prefLabel}>{label}</Text>
      <Switch disabled={disabled} onValueChange={onChange} trackColor={{ true: colors.accent }} value={value} />
    </View>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <View style={styles.infoTile}>
      <View style={styles.infoTileIcon}>
        <Icon color={colors.accent} size={15} strokeWidth={2.2} />
      </View>
      <Text style={styles.infoTileLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.infoTileValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroShell: { marginBottom: 12 },
  hero: {
    borderRadius: 22,
    padding: 18,
    overflow: "hidden",
    gap: 12
  },
  heroBlob: { position: "absolute", borderRadius: 999 },
  heroBlobLight: { width: 130, height: 130, backgroundColor: "rgba(255,255,255,0.16)", top: -34, right: -20 },
  heroBlobSoft: { width: 90, height: 90, backgroundColor: "rgba(255,255,255,0.1)", bottom: -24, left: -12 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarWrap: { alignItems: "center" },
  avatarRing: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  heroAvatarImage: { width: "100%", height: "100%" },
  avatarText: { color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  heroCopy: { flex: 1, gap: 6 },
  heroName: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  heroRole: { fontSize: 14, color: "rgba(255,255,255,0.88)", fontWeight: "600" },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  statusPillText: { fontSize: 11, fontWeight: "800" },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
    marginBottom: 12
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  prefList: { gap: 4 },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  prefLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  photoBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12
  },
  photoPreviewWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative"
  },
  photoPreview: { width: "100%", height: "100%" },
  photoFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  photoFallbackText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  photoLoading: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center"
  },
  photoCopy: { flex: 1, gap: 6 },
  photoTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  photoHint: { fontSize: 12, lineHeight: 17, color: colors.textMuted, fontWeight: "500" },
  photoActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  photoBtnPrimary: { backgroundColor: colors.accent },
  photoBtnSecondary: {
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.border
  },
  photoBtnGhost: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca"
  },
  photoBtnPressed: { opacity: 0.88 },
  photoBtnPrimaryText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  photoBtnSecondaryText: { color: colors.accent, fontSize: 12, fontWeight: "800" },
  photoBtnGhostText: { color: colors.danger, fontSize: 12, fontWeight: "800" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  infoTile: {
    width: "48%",
    flexGrow: 1,
    minWidth: "46%",
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 6
  },
  infoTileIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center"
  },
  infoTileLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.3 },
  infoTileValue: { fontSize: 14, fontWeight: "700", color: colors.text, lineHeight: 18 },
  errorText: { fontSize: 13, color: colors.danger, fontWeight: "700" },
  logoutCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 8
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14
  },
  logoutBtnPressed: { backgroundColor: "#fff5f5" },
  logoutIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center"
  },
  logoutCopy: { flex: 1, gap: 2 },
  logoutTitle: { fontSize: 15, fontWeight: "800", color: colors.danger },
  logoutHint: { fontSize: 12, color: colors.textMuted, fontWeight: "500" }
});
