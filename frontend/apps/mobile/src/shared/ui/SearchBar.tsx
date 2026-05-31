import { StyleSheet, TextInput, View } from "react-native";
import { colors } from "@/shared/theme/colors";

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Ara..."
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.wrap}>
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text
  }
});
