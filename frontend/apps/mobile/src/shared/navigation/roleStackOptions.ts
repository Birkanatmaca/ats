import { colors } from "@/shared/theme/colors";

export const roleStackScreenOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "700" as const },
  contentStyle: { backgroundColor: colors.background }
};

/** Tab dışı detay ekranları: header yok, kenardan kaydırarak geri */
export const swipeDetailScreenOptions = {
  headerShown: false,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animation: "slide_from_right" as const,
  contentStyle: { backgroundColor: colors.background }
};
