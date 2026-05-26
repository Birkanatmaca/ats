import { navTabs } from "../config/navTabs";
import type { AdminTab } from "../types";

export function pageTitle(tab: AdminTab) {
  const match = navTabs.find((item) => item.id === tab);
  return match?.label ?? "Genel";
}

export function pageDescription(tab: AdminTab) {
  const descriptions: Record<AdminTab, string> = {
    overview: "Canlı platformun metrik, güvenlik ve servis durum özeti.",
    institutions: "Kurum tenantları, lisans planları ve kullanım yoğunluğu.",
    billing: "Öğrenci bazlı lisanslama, yıllık fiyatlandırma ve teklif PDF çıktısı.",
    users: "Rol bazlı erişim, kullanıcı durumu ve hesap yönetimi.",
    support: "Kurum talepleri, şikayetler, öneriler ve hata raporları.",
    logs: "Hassas işlem izleri, audit kayıtları ve sistem denetimi.",
    ai: "ogta.ai token kullanımı, maliyet analizi ve kurum kotası yönetimi.",
    modules: "Ürün modülleri, çalışma durumu ve geliştirme yüzeyleri.",
    settings: "Bakım modu, AI, SMS ve e-posta servis anahtarları."
  };
  return descriptions[tab];
}
