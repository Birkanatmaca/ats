import { LinearGradient } from "expo-linear-gradient";
import { Star } from "lucide-react-native";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { OGTA_COSMIC_STARS, OGTA_GRADIENT, OGTA_GRADIENT_LOCATIONS } from "@/features/ai/ogtaAiTheme";

export function OgtaAiCosmicBackground({ style }: { style?: ViewStyle }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <LinearGradient
        colors={[...OGTA_GRADIENT]}
        end={{ x: 1, y: 1 }}
        locations={[...OGTA_GRADIENT_LOCATIONS]}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(109,40,217,0.32)", "rgba(109,40,217,0)", "rgba(37,99,235,0.28)"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.nebula, styles.nebulaPurple]} />
      <View style={[styles.nebula, styles.nebulaBlue]} />
      <View style={[styles.nebula, styles.nebulaGold]} />
      {OGTA_COSMIC_STARS.map((star, index) => (
        <View
          key={index}
          style={[
            styles.starSlot,
            {
              top: star.top,
              left: "left" in star ? star.left : undefined,
              right: "right" in star ? star.right : undefined,
              opacity: star.opacity
            }
          ]}
        >
          <Star color={star.color} fill={star.color} size={star.size} strokeWidth={1.5} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nebula: {
    position: "absolute",
    borderRadius: 999
  },
  nebulaPurple: {
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    backgroundColor: "#7c3aed",
    opacity: 0.22
  },
  nebulaBlue: {
    bottom: -100,
    left: -50,
    width: 200,
    height: 200,
    backgroundColor: "#2563eb",
    opacity: 0.2
  },
  nebulaGold: {
    top: "30%",
    left: "30%",
    width: 120,
    height: 120,
    backgroundColor: "#fbbf24",
    opacity: 0.1
  },
  starSlot: {
    position: "absolute"
  }
});
