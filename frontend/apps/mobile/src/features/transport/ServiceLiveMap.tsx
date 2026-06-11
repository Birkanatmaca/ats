import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "react-native";
import { colors } from "@/shared/theme/colors";

function staticMapUrl(latitude: number, longitude: number) {
  const zoom = 15;
  const size = "640x280";
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=${zoom}&size=${size}&markers=${latitude},${longitude},red-pushpin`;
}

function mapsLink(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function ServiceLiveMap({
  latitude,
  longitude,
  label
}: {
  latitude?: number;
  longitude?: number;
  label?: string;
}) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Canlı konum henüz paylaşılmadı.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Image accessibilityLabel="Servis canlı harita" source={{ uri: staticMapUrl(latitude, longitude) }} style={styles.map} />
      <Pressable
        onPress={() => {
          void Linking.openURL(mapsLink(latitude, longitude));
        }}
        style={styles.link}
      >
        <Text style={styles.linkText}>{label ?? "Haritada aç"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  map: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    backgroundColor: colors.border
  },
  link: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.accentLight
  },
  linkText: { color: colors.accent, fontSize: 12, fontWeight: "800" },
  placeholder: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: colors.surface
  },
  placeholderText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textAlign: "center" }
});
