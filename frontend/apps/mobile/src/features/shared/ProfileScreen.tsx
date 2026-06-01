import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Building2,
  Check,
  LogOut,
  Mail,
  Palette,
  Phone,
  Shield,
  UserRound
} from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { useAuth } from "@/shared/auth/AuthContext";
import { roleLabels } from "@/shared/auth/roleRoutes";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";

const ACCENT_OPTIONS = [
  { value: "#0891b2", label: "Turkuaz" },
  { value: "#2563eb", label: "Mavi" },
  { value: "#6d28d9", label: "Mor" },
  { value: "#047857", label: "Yeşil" },
  { value: "#b45309", label: "Kehribar" },
  { value: "#be123c", label: "Gül" },
  { value: "#334155", label: "Grafit" }
] as const;

function profileInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
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

  const updateMut = useMutation({
    mutationFn: (accent: string) => api.updateProfile({ profileAccent: accent }),
    onSuccess: async (profile) => {
      if (!session) return;
      const next = {
        ...session,
        principal: { ...session.principal, name: profile.fullName, email: profile.email }
      };
      await signIn(next);
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    }
  });

  const refreshing = profileQ.isRefetching || tenantQ.isRefetching;
  const onRefresh = () => {
    void profileQ.refetch();
    void tenantQ.refetch();
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
  const accent = profile?.profileAccent ?? colors.primary;
  const pill = statusTone(profile?.status ?? "active");

  return (
    <Screen layout="stack" refreshing={refreshing} topInsetExtra={6} onRefresh={onRefresh}>
      <DetailBackBar label="Daha Fazla" />

      {profile ? (
        <>
          <View style={styles.heroShell}>
            <View
              style={[
                styles.hero,
                { backgroundColor: accent },
                platformShadow("0 14px 32px rgba(28,53,87,0.18)", {
                  shadowColor: accent,
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.2,
                  shadowRadius: 18,
                  elevation: 8
                })
              ]}
            >
              <View style={[styles.heroBlob, styles.heroBlobLight, { pointerEvents: "none" }]} />
              <View style={[styles.heroBlob, styles.heroBlobSoft, { pointerEvents: "none" }]} />

              <View style={styles.heroTop}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatarRing}>
                    <Text style={styles.avatarText}>{profileInitials(profile.fullName)}</Text>
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

            <View style={styles.infoGrid}>
              <InfoTile icon={Mail} label="E-posta" value={profile.email} />
              <InfoTile icon={Phone} label="Telefon" value={profile.phone?.trim() || "Belirtilmedi"} />
              <InfoTile icon={Shield} label="Rol" value={role ? roleLabels[role] : "—"} />
              {tenantQ.data ? <InfoTile icon={Building2} label="Kurum" value={tenantQ.data.name} /> : null}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <Palette color={colors.accent} size={16} strokeWidth={2.2} />
              <Text style={styles.sectionTitle}>Tema rengi</Text>
            </View>
            <Text style={styles.sectionHint}>Profil kartınızda ve karşılama alanında kullanılacak vurgu rengi.</Text>

            <View style={styles.accentGrid}>
              {ACCENT_OPTIONS.map((option) => {
                const active = (profile.profileAccent ?? colors.primary) === option.value;
                return (
                  <Pressable
                    key={option.value}
                    disabled={updateMut.isPending}
                    onPress={() => updateMut.mutate(option.value)}
                    style={({ pressed }) => [styles.accentOption, pressed && styles.accentOptionPressed]}
                  >
                    <View style={[styles.swatch, { backgroundColor: option.value }, active && styles.swatchActive]}>
                      {active ? <Check color="#fff" size={16} strokeWidth={2.8} /> : null}
                      {updateMut.isPending && updateMut.variables === option.value ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : null}
                    </View>
                    <Text style={[styles.accentLabel, active && styles.accentLabelActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {updateMut.isError ? <Text style={styles.errorText}>{updateMut.error.message}</Text> : null}
          </View>

          <View style={styles.logoutCard}>
            <Pressable
              onPress={() => {
                void signOut().then(() => router.replace("/(auth)/login"));
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
    justifyContent: "center"
  },
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
  sectionHint: { fontSize: 13, lineHeight: 18, color: colors.textMuted, fontWeight: "500" },
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
  accentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  accentOption: {
    width: "30%",
    flexGrow: 1,
    minWidth: "28%",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4
  },
  accentOptionPressed: { opacity: 0.88 },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent"
  },
  swatchActive: {
    borderColor: colors.text,
    transform: [{ scale: 1.04 }]
  },
  accentLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted, textAlign: "center" },
  accentLabelActive: { color: colors.text, fontWeight: "800" },
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
