import { Text } from "react-native";
import { ChildSelector } from "@/features/guardian/ChildSelector";
import { useGuardian } from "@/features/guardian/GuardianContext";
import { GuardianServiceCard } from "@/features/guardian/GuardianServiceCard";
import { Screen } from "@/shared/ui/Screen";

export function GuardianServiceScreen() {
    const { selectedChild, children } = useGuardian();

    return (
        <Screen title="Servis" subtitle={selectedChild?.fullName}>
            <ChildSelector />
            {selectedChild ? <GuardianServiceCard studentId={selectedChild.id} /> : <Text>Öğrenci seçin ({children.length} kayıt).</Text>}
        </Screen>
    );
}
