import { Text } from "react-native";
import { ChildSelector } from "@/features/guardian/ChildSelector";
import { GuardianAcademicReportCard } from "@/features/guardian/GuardianAcademicReportCard";
import { useGuardian } from "@/features/guardian/GuardianContext";
import { Screen } from "@/shared/ui/Screen";

export function GuardianAcademicScreen() {
    const { selectedChild, children } = useGuardian();

    return (
        <Screen title="Akademik" subtitle={selectedChild?.fullName}>
            <ChildSelector />
            {selectedChild ? <GuardianAcademicReportCard studentId={selectedChild.id} /> : <Text>Öğrenci seçin ({children.length} kayıt).</Text>}
        </Screen>
    );
}
