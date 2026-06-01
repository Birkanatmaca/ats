import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { useAuth } from "@/shared/auth/AuthContext";
import { platformShadow } from "@/shared/ui/platformShadow";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "R";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function todayLabel(): string {
  return new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

function WelcomeBackdrop() {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <LinearGradient
        colors={["rgba(196,181,253,0.28)", "rgba(196,181,253,0)", "rgba(124,58,237,0.22)"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glowViolet, styles.decor]} />
      <View style={[styles.glowPurple, styles.decor]} />
      <View style={[styles.glowDeep, styles.decor]} />
      <View style={[styles.glowLight, styles.decor]} />
    </View>
  );
}

export function GuidanceWelcomeCard() {
  const router = useRouter();
  const { session } = useAuth();
  const profileQ = useQuery({ queryKey: queryKeys.profile, queryFn: () => api.profile() });
  const tenantQ = useQuery({ queryKey: queryKeys.tenant, queryFn: () => api.tenant() });

  const profile = profileQ.data;
  const name = profile?.fullName ?? session?.principal.name ?? "Rehber Öğretmeni";
  const schoolName = tenantQ.data?.name ?? "Okulunuz";
  const accent = profile?.profileAccent ?? "#7c3aed";
  const avatarUrl = profile?.avatarUrl?.trim();
  const greeting = greetingForHour(new Date().getHours());

  return (
    <View style={styles.shell}>
      <Pressable
        accessibilityHint="Profil sayfasını açar"
        accessibilityLabel={`${greeting}, ${name}. Profil`}
        accessibilityRole="button"
        onPress={() => router.push("/(app)/guidance/profile")}
        style={({ pressed }) => [pressed && styles.cardPressed]}
      >
        <LinearGradient
          colors={["#c084fc", "#a855f7", "#7c3aed", "#6d28d9"]}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.34, 0.68, 1]}
          start={{ x: 0, y: 0 }}
          style={[
            styles.card,
            platformShadow("0 20px 44px rgba(124,58,237,0.28)", {
              shadowColor: "#7c3aed",
              shadowOffset: { width: 0, height: 14 },
              shadowOpacity: 0.24,
              shadowRadius: 26,
              elevation: 8
            })
          ]}
        >
          <WelcomeBackdrop />

          <View style={styles.content}>
            <View style={styles.avatarRing}>
              {avatarUrl ? (
                <Image accessibilityLabel={name} source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: accent }]}>
                  <Text style={styles.avatarText}>{initials(name)}</Text>
                </View>
              )}
            </View>

            <View style={styles.copy}>
              <View style={styles.greetingPill}>
                <Text style={styles.greeting}>{greeting}</Text>
              </View>
              <Text numberOfLines={2} style={styles.name}>
                {name}
              </Text>
              <Text numberOfLines={1} style={styles.meta}>
                Rehber Öğretmeni · {schoolName}
              </Text>
              <Text style={styles.date}>{todayLabel()}</Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: -10,
    marginBottom: 4
  },
  card: {
    borderRadius: 24,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingVertical: 26,
    minHeight: 132,
    borderWidth: 1,
    borderColor: "rgba(221,214,254,0.28)"
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }]
  },
  decor: {
    pointerEvents: "none"
  },
  glowViolet: {
    position: "absolute",
    top: -44,
    right: -22,
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: "#c4b5fd",
    opacity: 0.45
  },
  glowPurple: {
    position: "absolute",
    bottom: -54,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "#8b5cf6",
    opacity: 0.32
  },
  glowDeep: {
    position: "absolute",
    top: 30,
    right: 68,
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: "#6d28d9",
    opacity: 0.28
  },
  glowLight: {
    position: "absolute",
    bottom: 16,
    right: 22,
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#ddd6fe",
    opacity: 0.38
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minHeight: 80
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#ede9fe",
    padding: 2,
    backgroundColor: "rgba(255,255,255,0.16)"
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 36
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  copy: {
    flex: 1,
    gap: 4
  },
  greetingPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 2
  },
  greeting: {
    color: "#6d28d9",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2
  },
  name: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 28
  },
  meta: {
    color: "rgba(245,243,255,0.92)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2
  },
  date: {
    color: "rgba(233,213,255,0.82)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    textTransform: "capitalize"
  }
});
