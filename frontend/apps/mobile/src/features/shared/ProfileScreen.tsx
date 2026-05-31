import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { useAuth } from "@/shared/auth/AuthContext";
import { roleLabels } from "@/shared/auth/roleRoutes";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { colors } from "@/shared/theme/colors";

const ACCENTS = ["#0891b2", "#6d28d9", "#047857", "#b45309", "#be123c", "#334155"] as const;

export function ProfileScreen() {
  const { session, signIn } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: queryKeys.profile, queryFn: () => api.profile() });

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

  if (query.isLoading) {
    return (
      <Screen title="Profil">
        <LoadingBlock />
      </Screen>
    );
  }

  const profile = query.data;
  const role = session?.principal.role;

  return (
    <Screen title="Profil" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      {profile ? (
        <>
          <View style={[styles.avatar, { backgroundColor: profile.profileAccent || colors.primary }]}>
            <Text style={styles.avatarText}>{profile.fullName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{profile.fullName}</Text>
          <Text style={styles.meta}>{profile.email}</Text>
          <Text style={styles.meta}>{role ? roleLabels[role] : ""} · {profile.status}</Text>
          {profile.phone ? <Text style={styles.meta}>{profile.phone}</Text> : null}

          <Text style={styles.section}>Tema rengi</Text>
          <View style={styles.accents}>
            {ACCENTS.map((accent) => (
              <Pressable
                key={accent}
                disabled={updateMut.isPending}
                onPress={() => updateMut.mutate(accent)}
                style={[styles.swatch, { backgroundColor: accent }, profile.profileAccent === accent && styles.swatchActive]}
              />
            ))}
          </View>
          {updateMut.isError ? <Text style={styles.error}>{updateMut.error.message}</Text> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  name: { fontSize: 22, fontWeight: "700", color: colors.text, textAlign: "center", marginTop: 12 },
  meta: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  section: { marginTop: 20, fontSize: 14, fontWeight: "600", color: colors.text },
  accents: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  swatchActive: { borderWidth: 3, borderColor: colors.text },
  error: { color: colors.danger, marginTop: 8 }
});
