import { CONTACT_EMAIL } from "./constants";

export type ContactRequestType = "demo" | "quote" | "general";

export const contactRequestTypes = [
  { id: "demo" as const, label: "Demo talebi", subject: "OGTA Demo Talebi" },
  { id: "quote" as const, label: "Fiyat teklifi", subject: "OGTA Fiyat Teklifi Talebi" },
  { id: "general" as const, label: "İletişim", subject: "OGTA İletişim Talebi" }
];

export type ContactFormValues = {
  requestType: ContactRequestType;
  fullName: string;
  institution: string;
  email: string;
  phone: string;
  studentCount: string;
  message: string;
};

export function buildContactMailto(values: ContactFormValues): string {
  const request = contactRequestTypes.find((item) => item.id === values.requestType);
  const subject = request?.subject ?? "OGTA İletişim Talebi";

  const body = [
    `Talep türü: ${request?.label ?? values.requestType}`,
    "",
    `Ad Soyad: ${values.fullName}`,
    `Kurum: ${values.institution}`,
    `E-posta: ${values.email}`,
    values.phone ? `Telefon: ${values.phone}` : null,
    values.studentCount ? `Öğrenci sayısı: ${values.studentCount}` : null,
    "",
    "Mesaj:",
    values.message,
    "",
    "---",
    "Gönderim: OGTA lisanslama sayfası"
  ]
    .filter(Boolean)
    .join("\n");

  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function openContactMailto(values: ContactFormValues): void {
  window.location.href = buildContactMailto(values);
}
