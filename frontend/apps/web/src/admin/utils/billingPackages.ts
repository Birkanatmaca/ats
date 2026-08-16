export const PLAN_FEATURE_CATALOG = [
  "Öğrenci & sınıf yönetimi",
  "Akıllı yoklama modülü",
  "Ders programı görüntüleme",
  "Veli bilgilendirme (e-posta)",
  "Temel müdür paneli",
  "E-posta destek",
  "Gözlem & rehberlik modülü",
  "Gelişmiş dashboard & raporlama",
  "SMS bildirimleri",
  "ogta.ai komut asistanı (standart kota)",
  "Öncelikli destek",
  "ogta.ai gelişmiş analitik & yüksek kota",
  "Kurum bazlı özelleştirme",
  "API & entegrasyon desteği",
  "Özel hesap yöneticisi",
  "SLA garantisi"
] as const;

export const PLAN_INCLUDES_PREVIOUS: Record<string, string> = {
  core: "Starter paketindeki tüm özellikler",
  premium: "Core paketindeki tüm özellikler"
};

export function packageHasFeature(features: string[], feature: string) {
  return features.some((item) => item.trim() === feature);
}

export function extraPackageFeatures(features: string[]) {
  const known = new Set<string>([...PLAN_FEATURE_CATALOG, ...Object.values(PLAN_INCLUDES_PREVIOUS)]);
  return features.filter((item) => item.trim() && !known.has(item.trim()));
}

export function calculateLicenseSubtotal(
  students: number,
  pricePerStudent: number,
  minOrderUsd: number,
  termYears: number
) {
  const years = termYears > 0 ? termYears : 1;
  const calculatedUsd = Math.round(students * pricePerStudent * years * 100) / 100;
  const minimumUsd = minOrderUsd > 0 ? minOrderUsd * years : 0;
  const subtotalUsd = minimumUsd > 0 ? Math.max(calculatedUsd, minimumUsd) : calculatedUsd;
  return {
    calculatedUsd,
    subtotalUsd,
    minimumApplied: minimumUsd > 0 && subtotalUsd > calculatedUsd
  };
}

export function minStudentsEquivalent(pricePerStudent: number, minOrderUsd: number) {
  if (pricePerStudent <= 0 || minOrderUsd <= 0) {
    return 0;
  }
  return Math.ceil(minOrderUsd / pricePerStudent);
}
