import { observationCategories } from "./data";

export function heroTitle(role: string) {
  if (role === "teacher") return "Günlük ders, yoklama ve gözlem akışı";
  if (role === "guardian") return "Çocuğuna ait okul bilgileri";
  if (role === "guidance") return "Öğrenci destek ve erken uyarı merkezi";
  return "Okul operasyon yönetimi";
}

export function heroDescription(role: string) {
  if (role === "teacher") return "Aktif dersi otomatik yakala, yoklamayı hızlı al ve öğrenci gözlemlerini rehberliğe aktar.";
  if (role === "guardian") return "Ders programı, duyurular ve devamsızlık bilgilerini sade bir veli ekranında takip et.";
  if (role === "guidance") return "Öğretmen gözlemlerini değerlendir, risk sinyallerini insan kontrolüyle takip et.";
  return "Müdür ve yönetici için ders programı, yoklama, sınıf durumu ve operasyon özetleri.";
}

export function categoryLabel(value: string) {
  return observationCategories.find((category) => category.value === value)?.label ?? value;
}

export function attendanceLabel(value: string) {
  const labels: Record<string, string> = {
    present: "Geldi",
    absent: "Gelmedi",
    late: "Geç",
    excused: "İzinli"
  };
  return labels[value] ?? value;
}
