import { Platform, type ViewStyle } from "react-native";

type NativeShadow = Pick<ViewStyle, "shadowColor" | "shadowOffset" | "shadowOpacity" | "shadowRadius" | "elevation">;

/** Web'de boxShadow, native'de shadow* kullanir. */
export function platformShadow(webBoxShadow: string, native: NativeShadow): ViewStyle {
  return Platform.OS === "web" ? { boxShadow: webBoxShadow } : native;
}
