export function sensitivityLabel(value: string): string {
  switch (value) {
    case "sensitive_student":
      return "Hassas öğrenci verisi";
    case "system_confidential":
      return "Gizli sistem";
    case "operational":
      return "Operasyonel";
    default:
      return value.replace(/_/g, " ");
  }
}

export function sensitivityBadgeClass(value: string): string {
  switch (value) {
    case "sensitive_student":
      return "sensitivity-badge is-sensitive";
    case "system_confidential":
      return "sensitivity-badge is-confidential";
    default:
      return "sensitivity-badge";
  }
}
