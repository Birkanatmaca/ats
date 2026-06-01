export const LANDING_URL = import.meta.env.VITE_LANDING_URL || "https://ogtasis.com";
export const APP_URL = import.meta.env.VITE_APP_URL || "https://panel.ogtasis.com/";
export const CONTACT_EMAIL = "info@ogtasis.com";

export const navLinks = [
  { href: "/", label: "Anasayfa" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/lisanslama", label: "Lisanslama" },
  { href: "/sss", label: "SSS" },
  { href: "/iletisim", label: "İletişim" }
] as const;

export const trustTags = ["Özel okul", "Kolej", "Kurs merkezi", "Etüt merkezi", "Rehberlik odaklı kurumlar"];

export const features = [
  {
    icon: "attendance" as const,
    title: "Akıllı yoklama sistemi",
    description:
      "Öğretmen aktif dersi seçmeden doğru sınıf listesine ulaşır; devamsızlık anında kayda geçer, müdür ve veli süreçleri otomatik tetiklenir."
  },
  {
    icon: "schedule" as const,
    title: "AI destekli ders programı",
    description:
      "Öğretmen müsaitlikleri, sınıf kapasitesi ve çakışma kurallarıyla ders programını üretin, düzenleyin ve tek tıkla yayınlayın."
  },
  {
    icon: "guidance" as const,
    title: "Rehberlik & gözlem modülü",
    description:
      "Öğrenci gözlemleri yapılandırılmış biçimde toplanır; risk sinyalleri, takip planları ve rehberlik notları için güvenilir veri oluşur."
  },
  {
    icon: "guardian" as const,
    title: "Veli bilgilendirme paneli",
    description:
      "Devamsızlık, ders programı ve kurum duyuruları veliye şeffaf kanallardan iletilir; okul–aile iletişimi tek merkezden yönetilir."
  },
  {
    icon: "dashboard" as const,
    title: "Müdür operasyon dashboard'u",
    description:
      "Kurum genelinde devam oranı, sınıf yoğunluğu, yoklama tamamlama ve operasyon önceliklerini gerçek zamanlı izleyin."
  },
  {
    icon: "security" as const,
    title: "Kurumsal güvenlik & audit",
    description:
      "Tenant izolasyonu, rol bazlı erişim (RBAC) ve hassas işlemler için denetim izi — KVKK odaklı veri ayrıştırma mimarisi."
  }
];

export const ogtaChecks = [
  "Öğrenci arama ve kapsam kontrolü",
  "Gözlem taslağı oluşturma ve onay akışı",
  "Yoklama ve operasyonel komutlar",
  "Token kullanımı ve maliyet takibi"
];

export const pricingPlans = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Temel okul operasyonları",
    price: 5,
    minOrder: 1500,
    features: [
      "Öğrenci & sınıf yönetimi",
      "Akıllı yoklama",
      "Ders programı görüntüleme",
      "Veli e-posta bildirimleri"
    ]
  },
  {
    id: "core",
    name: "Core",
    tagline: "Tam okul yönetim paketi",
    price: 10,
    minOrder: 2000,
    featured: true,
    features: [
      "Starter'daki tüm özellikler",
      "Gözlem & rehberlik modülü",
      "SMS bildirimleri",
      "ogta.ai standart kota"
    ]
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Kurumsal & AI odaklı",
    price: 15,
    minOrder: 2500,
    features: [
      "Core'daki tüm özellikler",
      "ogta.ai gelişmiş analitik",
      "API & entegrasyon desteği",
      "Özel hesap yöneticisi & SLA"
    ]
  }
];
