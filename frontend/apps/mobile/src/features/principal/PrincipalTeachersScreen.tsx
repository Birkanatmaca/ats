import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { SearchBar } from "@/shared/ui/SearchBar";
import { colors } from "@/shared/theme/colors";

export function PrincipalTeachersScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("Öğretmen");

  const query = useQuery({ queryKey: queryKeys.principalTeachers, queryFn: () => api.principalTeachers() });

  const createMut = useMutation({
    mutationFn: () => api.provisionTeacher({ email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim(), title: title.trim() }),
    onSuccess: (result) => {
      setModalOpen(false);
      Alert.alert("Öğretmen oluşturuldu", `E-posta: ${result.email}\nGeçici şifre: ${result.temporaryPassword}`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.principalTeachers });
    }
  });

  const resetMut = useMutation({
    mutationFn: (teacherId: string) => api.resetTeacherPassword(teacherId),
    onSuccess: (result) => Alert.alert("Şifre sıfırlandı", `Geçici şifre: ${result.temporaryPassword}`)
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = query.data ?? [];
    if (!q) return list;
    return list.filter((t) => `${t.fullName} ${t.email}`.toLowerCase().includes(q));
  }, [query.data, search]);

  return (
    <Screen title="Öğretmenler" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <SearchBar onChangeText={setSearch} value={search} />
      <Pressable onPress={() => setModalOpen(true)} style={styles.toggle}>
        <Text style={styles.toggleText}>+ Öğretmen ekle</Text>
      </Pressable>
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      {filtered.map((t) => (
        <ListCard
          key={t.id}
          meta={t.status}
          onPress={() => resetMut.mutate(t.id)}
          subtitle={t.email}
          title={t.fullName}
        />
      ))}
      <Text style={styles.hint}>Karta dokunarak geçici şifre sıfırlayın.</Text>

      <Modal animationType="slide" transparent visible={modalOpen}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Yeni öğretmen</Text>
            <TextInput onChangeText={setFirstName} placeholder="Ad" style={styles.input} value={firstName} />
            <TextInput onChangeText={setLastName} placeholder="Soyad" style={styles.input} value={lastName} />
            <TextInput autoCapitalize="none" onChangeText={setEmail} placeholder="E-posta" style={styles.input} value={email} />
            <TextInput onChangeText={setTitle} placeholder="Ünvan" style={styles.input} value={title} />
            <Pressable disabled={createMut.isPending} onPress={() => createMut.mutate()} style={styles.submit}>
              {createMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Oluştur</Text>}
            </Pressable>
            <Pressable onPress={() => setModalOpen(false)}>
              <Text style={styles.cancel}>İptal</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggle: { backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: "center" },
  toggleText: { color: "#fff", fontWeight: "700" },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 10 },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text },
  submit: { backgroundColor: colors.accent, borderRadius: 10, padding: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "700" },
  cancel: { textAlign: "center", color: colors.textMuted, marginTop: 8 }
});
