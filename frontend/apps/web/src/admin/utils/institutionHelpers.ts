export function planVariant(plan: string): string {
  const key = plan.toLowerCase();
  if (key.includes("mvp")) return "mvp";
  if (key.includes("starter")) return "starter";
  if (key.includes("growth")) return "growth";
  if (key.includes("premium")) return "premium";
  if (key.includes("trial")) return "trial";
  return "default";
}

export function roleVariant(role: string): string {
  const key = role.toLowerCase();
  if (key.includes("super")) return "super";
  if (key.includes("system")) return "system";
  if (key.includes("principal")) return "principal";
  if (key.includes("guidance")) return "guidance";
  if (key.includes("teacher")) return "teacher";
  if (key.includes("guardian")) return "guardian";
  return "default";
}

export function initials(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("");
}
