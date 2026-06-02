/** Anahtar kelime kümeleri — meta, içerik ve iç link stratejisi için merkezi kaynak */

export const SEO_CATEGORIES = {
  yonetim: "Okul yönetimi",
  takip: "Takip sistemleri",
  modul: "Modüller",
  kurum: "Kurum tipleri"
} as const;

export type SeoCategory = keyof typeof SEO_CATEGORIES;

/** Tüm hedef anahtar kelimeler (global meta keywords) */
export const ALL_TARGET_KEYWORDS = [
  // Çekirdek — okul yazılımı ailesi
  "okul yazılımı",
  "okul yazilimi",
  "okul yönetim yazılımı",
  "okul yönetim sistemi",
  "okul yönetim programı",
  "okul yönetim platformu",
  "okul yönetim",
  "okul sistemi",
  "okul bilgi sistemi",
  "okul bilgi yönetim sistemi",
  "okul otomasyon sistemi",
  "okul otomasyon yazılımı",
  "eğitim kurumu yazılımı",
  "eğitim kurumu yönetim sistemi",
  "eğitim yönetim sistemi",
  "eğitim yazılımı",
  // Takip
  "okul takip",
  "okul takip sistemi",
  "okul takip yazılımı",
  "okul takip programı",
  "öğrenci takip",
  "öğrenci takip sistemi",
  "öğrenci takip yazılımı",
  "öğrenci takip programı",
  "devamsızlık takip sistemi",
  "devamsızlık takibi",
  "veli takip sistemi",
  "veli takip yazılımı",
  "veli paneli",
  "veli bilgilendirme sistemi",
  // Modüller
  "yoklama sistemi",
  "yoklama yazılımı",
  "akıllı yoklama sistemi",
  "ders programı yazılımı",
  "ders programı oluşturma programı",
  "rehberlik yazılımı",
  "rehberlik sistemi",
  "rehberlik modülü",
  "öğrenci gözlem sistemi",
  "okul duyuru sistemi",
  // Kurum tipleri
  "özel okul yazılımı",
  "özel okul yönetim sistemi",
  "kolej yönetim sistemi",
  "kolej yazılımı",
  "kurs merkezi yazılımı",
  "etüt merkezi yazılımı",
  // Marka & AI
  "ogta",
  "ogta.ai",
  "ogtasis",
  "okul ai yazılımı",
  "yapay zeka okul yazılımı"
] as const;

export const KEYWORD_CLUSTERS: Record<
  string,
  { category: SeoCategory; keywords: string[]; primary: string }
> = {
  "okul-yazilimi": {
    category: "yonetim",
    primary: "okul yazılımı",
    keywords: [
      "okul yazılımı",
      "okul yazilimi",
      "okul yönetim yazılımı",
      "bulut okul yazılımı",
      "online okul yazılımı",
      "okul programı",
      "okul yönetim programı"
    ]
  },
  "okul-yonetim-sistemi": {
    category: "yonetim",
    primary: "okul yönetim sistemi",
    keywords: [
      "okul yönetim sistemi",
      "okul yönetim",
      "okul sistemi",
      "okul bilgi yönetim sistemi",
      "okul yönetim platformu"
    ]
  },
  "okul-otomasyon-sistemi": {
    category: "yonetim",
    primary: "okul otomasyon sistemi",
    keywords: [
      "okul otomasyon sistemi",
      "okul otomasyon yazılımı",
      "okul dijitalleşme",
      "okul operasyon otomasyonu",
      "eğitim otomasyonu"
    ]
  },
  "egitim-kurumu-yazilimi": {
    category: "kurum",
    primary: "eğitim kurumu yazılımı",
    keywords: [
      "eğitim kurumu yazılımı",
      "eğitim kurumu yönetim sistemi",
      "eğitim yönetim sistemi",
      "eğitim yazılımı",
      "kurum yönetim yazılımı"
    ]
  },
  "ogrenci-takip-sistemi": {
    category: "takip",
    primary: "öğrenci takip sistemi",
    keywords: [
      "öğrenci takip",
      "öğrenci takip sistemi",
      "öğrenci takip yazılımı",
      "öğrenci takip programı",
      "öğrenci izleme sistemi"
    ]
  },
  "okul-takip-sistemi": {
    category: "takip",
    primary: "okul takip sistemi",
    keywords: [
      "okul takip",
      "okul takip sistemi",
      "okul takip yazılımı",
      "okul izleme sistemi",
      "kurum takip sistemi"
    ]
  },
  "devamsizlik-takip-sistemi": {
    category: "takip",
    primary: "devamsızlık takip sistemi",
    keywords: [
      "devamsızlık takibi",
      "devamsızlık takip sistemi",
      "devamsızlık yazılımı",
      "devam takip sistemi",
      "yoklama devamsızlık"
    ]
  },
  "veli-takip-sistemi": {
    category: "takip",
    primary: "veli takip sistemi",
    keywords: [
      "veli takip sistemi",
      "veli takip yazılımı",
      "veli paneli",
      "veli bilgilendirme sistemi",
      "veli iletişim yazılımı",
      "okul veli uygulaması"
    ]
  },
  "yoklama-sistemi": {
    category: "modul",
    primary: "yoklama sistemi",
    keywords: [
      "yoklama sistemi",
      "yoklama yazılımı",
      "akıllı yoklama sistemi",
      "online yoklama",
      "dijital yoklama sistemi",
      "okul yoklama programı"
    ]
  },
  "ders-programi-yazilimi": {
    category: "modul",
    primary: "ders programı yazılımı",
    keywords: [
      "ders programı yazılımı",
      "ders programı oluşturma",
      "okul ders programı",
      "ai ders programı",
      "otomatik ders programı"
    ]
  },
  "rehberlik-yazilimi": {
    category: "modul",
    primary: "rehberlik yazılımı",
    keywords: [
      "rehberlik yazılımı",
      "rehberlik sistemi",
      "rehberlik modülü",
      "psikolojik danışmanlık yazılımı",
      "öğrenci rehberlik takibi"
    ]
  },
  "ozel-okul-yazilimi": {
    category: "kurum",
    primary: "özel okul yazılımı",
    keywords: [
      "özel okul yazılımı",
      "özel okul yönetim sistemi",
      "özel okul otomasyon",
      "özel okul programı",
      "özel okul takip sistemi"
    ]
  },
  "kolej-yonetim-sistemi": {
    category: "kurum",
    primary: "kolej yönetim sistemi",
    keywords: [
      "kolej yönetim sistemi",
      "kolej yazılımı",
      "kolej otomasyon",
      "kolej okul yazılımı",
      "kolej takip sistemi"
    ]
  }
};

export function keywordsToMeta(keywords: string[]) {
  return keywords.join(", ");
}

export function globalKeywordsMeta() {
  return keywordsToMeta([...ALL_TARGET_KEYWORDS]);
}
