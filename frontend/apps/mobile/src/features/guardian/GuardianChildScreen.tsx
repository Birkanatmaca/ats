import { Text } from "react-native";
import { ChildSelector } from "@/features/guardian/ChildSelector";
import { GuardianAcademicReportCard } from "@/features/guardian/GuardianAcademicReportCard";
import { useGuardian } from "@/features/guardian/GuardianContext";
import { ListCard } from "@/shared/ui/ListCard";
import { Screen } from "@/shared/ui/Screen";
import { StatCard } from "@/shared/ui/StatCard";

export function GuardianChildScreen() {
  const { selectedChild, children } = useGuardian();

  return (
    <Screen title="Öğrencim">
      <ChildSelector />
      {selectedChild ? (
        <>
          <StatCard label="Ad Soyad" value={selectedChild.fullName} />
          <StatCard label="Sınıf" value={selectedChild.className} />
          <ListCard title="Okul numarası" subtitle={selectedChild.schoolNumber} />
          {selectedChild.relation ? <ListCard title="Yakınlık" subtitle={selectedChild.relation} /> : null}
          <GuardianAcademicReportCard studentId={selectedChild.id} />
        </>
      ) : (
        <Text>Öğrenci seçin ({children.length} kayıt).</Text>
      )}
    </Screen>
  );
}
