import { Text } from "react-native";
import { ChildSelector } from "@/features/guardian/ChildSelector";
import { GuardianBillingCard } from "@/features/guardian/GuardianBillingCard";
import { useGuardian } from "@/features/guardian/GuardianContext";
import { Screen } from "@/shared/ui/Screen";

export function GuardianBillingScreen() {
    const { selectedChild, children } = useGuardian();

    return (
        <Screen title="Tahsilat" subtitle={selectedChild?.fullName}>
            <ChildSelector />
            {selectedChild ? <GuardianBillingCard studentId={selectedChild.id} /> : <Text>Öğrenci seçin ({children.length} kayıt).</Text>}
        </Screen>
    );
}
