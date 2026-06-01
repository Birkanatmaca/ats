import { colors } from "@/shared/theme/colors";

type ClassTone = {
  label: string;
  color: string;
  bg: string;
  badge: string;
};

const GRADE_TONES: Record<number, ClassTone> = {
  5: { label: "5", color: "#7c3aed", bg: "#faf5ff", badge: "#ede9fe" },
  6: { label: "6", color: "#2563eb", bg: "#eff6ff", badge: "#dbeafe" },
  7: { label: "7", color: "#0d9488", bg: "#f0fdfa", badge: "#ccfbf1" },
  8: { label: "8", color: "#d97706", bg: "#fffbeb", badge: "#fef3c7" },
  9: { label: "9", color: "#7c3aed", bg: "#faf5ff", badge: "#ede9fe" },
  10: { label: "10", color: "#2563eb", bg: "#eff6ff", badge: "#dbeafe" },
  11: { label: "11", color: "#0d9488", bg: "#f0fdfa", badge: "#ccfbf1" },
  12: { label: "12", color: "#d97706", bg: "#fffbeb", badge: "#fef3c7" }
};

const DEFAULT_TONE: ClassTone = {
  label: "•",
  color: colors.primaryLight,
  bg: colors.accentLight,
  badge: colors.border
};

export function getClassTone(name: string): ClassTone {
  const match = name.match(/\d+/);
  const grade = match ? Number(match[0]) : null;
  if (grade !== null && GRADE_TONES[grade]) return GRADE_TONES[grade];
  if (/ana/i.test(name)) {
    return { label: "A", color: "#db2777", bg: "#fdf2f8", badge: "#fce7f3" };
  }
  return DEFAULT_TONE;
}

export function sortClasses<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const an = a.name.match(/\d+/);
    const bn = b.name.match(/\d+/);
    if (an && bn) return Number(an[0]) - Number(bn[0]) || a.name.localeCompare(b.name, "tr");
    return a.name.localeCompare(b.name, "tr");
  });
}

export function sortSections<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "tr", { numeric: true }));
}
