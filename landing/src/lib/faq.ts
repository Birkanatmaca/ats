export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqCategory = {
  id: string;
  title: string;
  description: string;
  items: FaqItem[];
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "genel",
    title: "Genel",
    description: "OGTA platformu ve kurum uygunluğu hakkında temel bilgiler.",
    items: [
      {
        question: "OGTA hangi kurumlar için uygundur?",
        answer:
          "OGTA; özel okul, kolej, kurs merkezi, etüt merkezi ve rehberlik odaklı eğitim kurumları için tasarlanmış çok kiracılı (multi-tenant) bir okul yönetim platformudur."
      },
      {
        question: "OGTA bulut tabanlı mı çalışır?",
        answer:
          "Evet. OGTA tamamen bulut tabanlıdır; kurumunuz ek sunucu veya yerel kurulum yönetmek zorunda kalmaz. Tarayıcı üzerinden müdür, öğretmen, rehberlik ve veli panellerine erişilir."
      },
      {
        question: "Hangi kullanıcı rolleri desteklenir?",
        answer:
          "Müdür, öğretmen, rehberlik uzmanı, veli ve sistem yöneticisi rolleri desteklenir. Her rol yalnızca yetkisi dahilindeki veri ve işlemlere erişir."
      },
      {
        question: "OGTA mobil cihazlarda kullanılabilir mi?",
        answer:
          "Evet. OGTA responsive web arayüzü ile tablet ve telefonlardan kullanılabilir. Günlük operasyonlar — yoklama, program görüntüleme, bildirim takibi — mobilde de rahatça yapılır."
      }
    ]
  },
  {
    id: "moduller",
    title: "Modüller & Özellikler",
    description: "Yoklama, ders programı, rehberlik ve veli süreçleri.",
    items: [
      {
        question: "Akıllı yoklama sistemi nasıl çalışır?",
        answer:
          "Öğretmen aktif dersini seçer, sistem doğru sınıf listesini otomatik getirir. Devamsızlık anında kayda geçer; müdür panelinde görünür ve veli bilgilendirme akışı tetiklenebilir."
      },
      {
        question: "Ders programı modülü ne sunar?",
        answer:
          "Öğretmen müsaitlikleri, sınıf kapasitesi ve çakışma kuralları dikkate alınarak ders programı oluşturulur ve yönetilir. AI destekli öneriler ile program üretimi hızlandırılabilir."
      },
      {
        question: "Rehberlik ve gözlem modülü ne işe yarar?",
        answer:
          "Öğrenci gözlemleri yapılandırılmış formlarla kaydedilir. Risk sinyalleri, takip planları ve rehberlik notları tek merkezde toplanır; kurum içi rehberlik sürekliliği sağlanır."
      },
      {
        question: "Veli panelinde neler görünür?",
        answer:
          "Veliler devamsızlık bildirimleri, güncel ders programı ve kurum duyurularına erişebilir. Okul–aile iletişimi şeffaf kanallar üzerinden yönetilir."
      },
      {
        question: "Müdür dashboard'unda neler izlenir?",
        answer:
          "Kurum genelinde devam oranı, sınıf yoğunluğu, yoklama tamamlama durumu ve operasyonel öncelikler gerçek zamanlı dashboard üzerinden takip edilir."
      }
    ]
  },
  {
    id: "ogta-ai",
    title: "OGTA.ai",
    description: "Doğal dil komutları ve onaylı operasyon akışları.",
    items: [
      {
        question: "OGTA.ai nedir?",
        answer:
          "OGTA.ai, okul operasyonlarına gömülü bir komut asistanıdır. Ayrı bir sohbet uygulaması değil; mevcut yoklama, gözlem ve operasyonel işlemleri doğal dille hızlandırır."
      },
      {
        question: "OGTA.ai ile ChatGPT arasındaki fark nedir?",
        answer:
          "ChatGPT genel amaçlı bir dil modelidir. OGTA.ai ise kurum verinize, rol yetkilerinize ve okul operasyon akışlarına bağlı çalışır. Kritik işlemler kapsam kontrolü ve onay adımlarından geçer."
      },
      {
        question: "OGTA.ai hangi işlemleri yapabilir?",
        answer:
          "Öğrenci arama, gözlem taslağı oluşturma, yoklama ve operasyonel komutlar gibi işlemlerde hız kazandırır. Her aksiyon yetki sınırları içinde kalır ve denetlenebilir biçimde kayda geçer."
      },
      {
        question: "OGTA.ai kullanımı ek lisans gerektirir mi?",
        answer:
          "OGTA.ai modüler lisans yapısının parçasıdır. Kurumunuzun ihtiyaç kapsamına göre standart veya gelişmiş OGTA.ai kotası teklif aşamasında birlikte planlanır."
      }
    ]
  },
  {
    id: "lisanslama",
    title: "Lisanslama & Demo",
    description: "Modüler fiyat politikası, demo ve teklif süreci.",
    items: [
      {
        question: "Fiyatlandırma nasıl belirlenir?",
        answer:
          "OGTA modüler lisans modeliyle çalışır. Öğrenci sayısı, aktif modüller ve operasyon kapsamına göre kuruma özel teklif hazırlanır. Web sitesinde sabit liste fiyatı paylaşılmaz."
      },
      {
        question: "Demo süreci nasıl işler?",
        answer:
          "Lisanslama sayfasındaki talep formu veya info@ogtasis.com üzerinden demo talebi iletebilirsiniz. Kurum profilinize göre kısa bir keşif görüşmesi sonrası canlı demo planlanır."
      },
      {
        question: "Minimum öğrenci sayısı şartı var mı?",
        answer:
          "Lisans planı kurum büyüklüğüne göre esnek biçimde yapılandırılır. Net koşullar demo ve teklif görüşmesinde kurumunuza özel paylaşılır."
      },
      {
        question: "Yıllık mı, aylık mı lisanslanır?",
        answer:
          "Kurumsal okul yazılımı pratiğine uygun olarak yıllık lisans modeli esas alınır. Sözleşme detayları teklif aşamasında yazılı olarak iletilir."
      }
    ]
  },
  {
    id: "guvenlik",
    title: "Güvenlik & KVKK",
    description: "Veri izolasyonu, erişim kontrolü ve uyumluluk.",
    items: [
      {
        question: "Verilerimiz güvende mi?",
        answer:
          "Evet. Multi-tenant mimari ile her kurumun verisi izole edilir. Rol bazlı erişim (RBAC) ve hassas işlemler için denetim izi altyapısı kullanılır."
      },
      {
        question: "KVKK uyumu nasıl sağlanır?",
        answer:
          "Veri minimizasyonu, erişim yetkilendirme ve denetlenebilir kayıt tutma prensipleri uygulanır. Kurum verileri yalnızca yetkili kullanıcıların erişimine açılır."
      },
      {
        question: "Denetim izi (audit log) tutuluyor mu?",
        answer:
          "Hassas operasyonlar ve kritik değişiklikler audit log ile kayıt altına alınır. Kurum yöneticileri denetim süreçlerinde izlenebilirlik sağlar."
      },
      {
        question: "Veriler yedekleniyor mu?",
        answer:
          "Bulut altyapısında düzenli yedekleme ve felaket kurtarma prosedürleri uygulanır. Kurumsal SLA kapsamı teklif aşamasında netleştirilir."
      }
    ]
  },
  {
    id: "destek",
    title: "Kurulum & Destek",
    description: "Devreye alma, eğitim ve teknik destek.",
    items: [
      {
        question: "Kurulum ne kadar sürer?",
        answer:
          "Kurum büyüklüğüne ve aktif modüllere bağlı olarak değişir. Temel operasyon modülleri için birkaç hafta içinde pilot kullanım başlatılabilir; kapsamlı devreye alma planı birlikte oluşturulur."
      },
      {
        question: "Mevcut öğrenci verileri aktarılabilir mi?",
        answer:
          "Excel veya mevcut sistem çıktılarından kontrollü veri aktarımı desteklenir. Aktarım kapsamı kurum envanterinize göre proje başlangıcında planlanır."
      },
      {
        question: "Kullanıcı eğitimi veriliyor mu?",
        answer:
          "Evet. Müdür, öğretmen ve rehberlik ekipleri için rol bazlı eğitim oturumları düzenlenir. Canlı demo sonrası devreye alma planına eğitim adımları eklenir."
      },
      {
        question: "Teknik destek nasıl alınır?",
        answer:
          "Kurumsal destek kanalları lisans planınıza göre tanımlanır. Acil operasyon sorunları için önceliklendirilmiş destek hattı Premium planlarda genişletilir."
      }
    ]
  }
];

export const FAQ_ITEMS: FaqItem[] = FAQ_CATEGORIES.flatMap((category) => category.items);
