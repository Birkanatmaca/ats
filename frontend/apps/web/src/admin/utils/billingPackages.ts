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
