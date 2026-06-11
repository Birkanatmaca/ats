import { KEYWORD_CLUSTERS, SEO_CATEGORIES, keywordsToMeta, type SeoCategory } from "./seo-keywords";

export type ComparisonRow = {
  label: string;
  ogta: string;
  legacy: string;
};

export type UseCase = {
  title: string;
  description: string;
};

export type SolutionPageConfig = {
  path: string;
  slug: string;
  category: SeoCategory;
  title: string;
  metaDescription: string;
  keywords: string;
  h1: string;
  lead: string;
  sections: { title: string; paragraphs: string[] }[];
  features: { title: string; text: string }[];
  faq: { question: string; answer: string }[];
  relatedLinks: { href: string; label: string }[];
  sitemapPriority: number;
  highlights?: string[];
  useCases?: UseCase[];
  comparisonRows?: ComparisonRow[];
};

type PageDraft = Omit<SolutionPageConfig, "keywords" | "relatedLinks" | "slug"> & {
  slug: string;
  keywordSlugs?: string[];
};

function autoRelated(
  allPages: SolutionPageConfig[],
  currentPath: string,
  category: SeoCategory,
  limit = 4
): { href: string; label: string }[] {
  const peers = allPages
    .filter((p) => p.path !== currentPath && (p.category === category || p.category === "yonetim"))
    .slice(0, limit)
    .map((p) => ({ href: p.path, label: p.h1 }));
  if (peers.length >= 2) return peers;
  return allPages
    .filter((p) => p.path !== currentPath)
    .slice(0, 4)
    .map((p) => ({ href: p.path, label: p.h1 }));
}

function finalize(draft: PageDraft): SolutionPageConfig {
  const cluster = KEYWORD_CLUSTERS[draft.slug];
  const keywords = cluster ? keywordsToMeta(cluster.keywords) : keywordsToMeta([draft.h1.toLowerCase()]);
  return {
    ...draft,
    slug: draft.slug,
    keywords,
    relatedLinks: []
  };
}

const solutionPageDrafts: PageDraft[] = [
  {
    slug: "okul-yazilimi",
    path: "/okul-yazilimi",
    category: "yonetim",
    sitemapPriority: 0.98,
    title: "Okul Yazılımı | OGTA — Bulut Tabanlı Okul Yönetim ve Takip Platformu",
    metaDescription:
      "OGTA okul yazılımı: yoklama, ders programı, öğrenci takip, rehberlik, veli paneli ve AI destekli okul yönetimi. Özel okul, kolej ve eğitim kurumları için modern okul yazılımı çözümü.",
    h1: "Okul Yazılımı",
    lead:
      "OGTA okul yazılımı, eğitim kurumlarının günlük operasyonlarını dijitalleştiren uçtan uca bir platformdur. Yoklama, ders programı, öğrenci takip, rehberlik, veli iletişimi ve müdür dashboard'u — tek okul yazılımında birleşir.",
    sections: [
      {
        title: "Neden OGTA okul yazılımı?",
        paragraphs: [
          "Kurumlar yoklama, program, veli mesajları ve rehberlik süreçlerini farklı araçlarla yönettiğinde veri parçalanır, raporlama gecikir. OGTA okul yazılımı tüm paydaşları ortak veri modeli üzerinde buluşturur.",
          "Bulut tabanlı okul yazılımı olarak kurulum gerektirmez; öğretmen, müdür, rehber ve veli tarayıcı veya mobil cihazdan güvenli erişim sağlar."
        ]
      },
      {
        title: "Okul yazılımında modüler yapı",
        paragraphs: [
          "Starter, Core ve Premium paketlerle kurum büyüklüğünüze uygun okul yazılımı lisansı seçebilirsiniz. Temel yoklama ve programdan AI destekli analitik ve ogta.ai komut asistanına kadar ölçeklenebilir.",
          "Okul yazılımı tercihinde KVKK uyumu, tenant izolasyonu ve rol bazlı erişim kritik konulardır; OGTA bu gereksinimleri mimari düzeyde karşılar."
        ]
      }
    ],
    features: [
      { title: "Tek platform", text: "Yoklama, program, takip, rehberlik ve veli — ayrı yazılım gerekmez." },
      { title: "Mobil uyum", text: "Okul yazılımına telefon, tablet ve masaüstünden erişim." },
      { title: "ogta.ai", text: "Doğal dil komutlarıyla okul operasyonlarını hızlandırın." },
      { title: "Kurumsal güvenlik", text: "RBAC, denetim izi ve çok kiracılı veri ayrıştırma." }
    ],
    faq: [
      {
        question: "Okul yazılımı ile okul yönetim sistemi aynı mı?",
        answer:
          "Okul yazılımı genel kavramdır; okul yönetim sistemi idari ve operasyonel modülleri kapsar. OGTA her iki ihtiyacı tek okul yazılımı platformunda karşılar."
      },
      {
        question: "OGTA okul yazılımı hangi kurumlara uygundur?",
        answer: "Özel okul, kolej, kurs merkezi, etüt merkezi ve rehberlik odaklı eğitim kurumları için tasarlanmıştır."
      },
      {
        question: "Okul yazılımı demo ile denenebilir mi?",
        answer: "Evet. İletişim formu üzerinden demo talebi iletebilir, kurumunuza özel canlı sunum planlayabilirsiniz."
      }
    ]
  },
  {
    slug: "okul-yonetim-sistemi",
    path: "/okul-yonetim-sistemi",
    category: "yonetim",
    sitemapPriority: 0.97,
    title: "Okul Yönetim Sistemi | OGTA — Yoklama, Program, Rehberlik ve AI",
    metaDescription:
      "OGTA okul yönetim sistemi: yoklama, ders programı, öğrenci takip, rehberlik, veli paneli ve müdür dashboard'u. Özel okul ve kolejler için kapsamlı okul yönetim yazılımı.",
    h1: "Okul Yönetim Sistemi",
    lead:
      "OGTA okul yönetim sistemi, kurumunuzun tüm operasyonel süreçlerini tek merkezden yönetmenizi sağlar. Okul sistemi olarak yoklama, program, takip, rehberlik ve veli modülleri entegre çalışır.",
    sections: [
      {
        title: "Uçtan uca okul yönetimi",
        paragraphs: [
          "Müdür, öğretmen, rehber ve veli aynı okul yönetim sisteminde farklı rollere göre çalışır. Veri tekrarı ve manuel aktarım ortadan kalkar.",
          "Okul bilgi yönetim sistemi mantığıyla öğrenci, sınıf, ders ve personel kayıtları tutarlı biçimde güncellenir."
        ]
      },
      {
        title: "Karar destek ve raporlama",
        paragraphs: [
          "Müdür dashboard'unda devam oranı, yoklama tamamlama ve operasyon metrikleri anlık görünür.",
          "Okul yönetim yazılımı olarak OGTA, idari ekibin ölçülebilir veriyle hareket etmesini sağlar."
        ]
      }
    ],
    features: [
      { title: "Müdür paneli", text: "Kurum geneli operasyon ve devam özeti." },
      { title: "AI ders programı", text: "Çakışma kuralları ile otomatik program üretimi." },
      { title: "Rehberlik modülü", text: "Gözlem, risk ve takip planları." },
      { title: "Veli paneli", text: "Devamsızlık, program ve duyurular." }
    ],
    faq: [
      {
        question: "Okul yönetim sistemi bulut tabanlı mı?",
        answer: "Evet. panel.ogtasis.com üzerinden tarayıcı ve mobil cihazlardan erişilir."
      },
      { question: "Modüler lisans var mı?", answer: "Starter, Core ve Premium paketlerle ihtiyaca göre modül seçimi yapılır." }
    ]
  },
  {
    slug: "okul-otomasyon-sistemi",
    path: "/okul-otomasyon-sistemi",
    category: "yonetim",
    sitemapPriority: 0.94,
    title: "Okul Otomasyon Sistemi | OGTA — Dijital Okul Operasyonları",
    metaDescription:
      "OGTA okul otomasyon sistemi ile yoklama, ders programı, duyuru, veli bildirimi ve rehberlik süreçlerini otomatikleştirin. Eğitim kurumları için okul otomasyon yazılımı.",
    h1: "Okul Otomasyon Sistemi",
    lead:
      "OGTA okul otomasyon sistemi, tekrarlayan idari işleri dijitalleştirir. Yoklama sonrası veli bildirimi, program yayınlama, devamsızlık uyarıları ve operasyon raporları otomatik akışlarla yönetilir.",
    sections: [
      {
        title: "Operasyon otomasyonu",
        paragraphs: [
          "Kağıt yoklama, Excel program tabloları ve dağınık mesaj grupları yerine okul otomasyon yazılımı süreçleri standartlaştırır.",
          "Okul dijitalleşme hedeflerinize uygun olarak tüm paydaşlar aynı güncel veriyle çalışır."
        ]
      },
      {
        title: "AI destekli otomasyon",
        paragraphs: [
          "ogta.ai ile doğal dil komutları operasyonel işlemleri hızlandırır; kritik aksiyonlar onay ve yetki kontrolünden geçer.",
          "Ders programı üretimi, öğrenci arama ve gözlem taslakları otomasyon kapsamındadır."
        ]
      }
    ],
    features: [
      { title: "Otomatik bildirim", text: "Devamsızlık ve duyuru akışları." },
      { title: "Workflow", text: "Onaylı gözlem ve operasyon süreçleri." },
      { title: "Denetim izi", text: "Hassas işlemler kayıt altında." },
      { title: "Entegrasyon hazır", text: "Premium pakette API desteği." }
    ],
    faq: [
      {
        question: "Okul otomasyon sistemi kurulum gerektirir mi?",
        answer: "Hayır. Bulut tabanlıdır; hesap açıldıktan sonra tarayıcıdan kullanıma başlanır."
      }
    ]
  },
  {
    slug: "egitim-kurumu-yazilimi",
    path: "/egitim-kurumu-yazilimi",
    category: "kurum",
    sitemapPriority: 0.93,
    title: "Eğitim Kurumu Yazılımı | OGTA — Okul, Kurs ve Kolej Yönetimi",
    metaDescription:
      "Eğitim kurumu yazılımı OGTA: okul, kolej, kurs ve etüt merkezleri için yönetim, takip, yoklama ve veli iletişimi. Eğitim kurumu yönetim sistemi tek platformda.",
    h1: "Eğitim Kurumu Yazılımı",
    lead:
      "OGTA eğitim kurumu yazılımı, farklı ölçek ve tipteki eğitim kurumlarının operasyonel ihtiyaçlarını karşılar. Eğitim yönetim sistemi olarak öğrenci kayıtlarından veli iletişimine kadar uçtan uca dijital süreç sunar.",
    sections: [
      {
        title: "Her ölçekte eğitim kurumu",
        paragraphs: [
          "200 öğrencili özel okuldan binlerce öğrencili koleje kadar ölçeklenebilir eğitim kurumu yazılımı altyapısı.",
          "Multi-tenant mimari ile her kurumun verisi izole; merkezi yönetim ihtiyacı olan yapılar için uygun."
        ]
      }
    ],
    features: [
      { title: "Çok kiracılı", text: "Kurum verisi tam izolasyon." },
      { title: "Modüler paket", text: "İhtiyaca göre lisans." },
      { title: "Veli & öğretmen", text: "Tüm paydaş rolleri." },
      { title: "Türkçe arayüz", text: "Yerel eğitim terminolojisi." }
    ],
    faq: [
      {
        question: "Kurs merkezi eğitim kurumu yazılımı olarak kullanılabilir mi?",
        answer: "Evet. Kurs ve etüt merkezleri yoklama, program ve veli modüllerini kullanabilir."
      }
    ]
  },
  {
    slug: "ogrenci-takip-sistemi",
    path: "/ogrenci-takip-sistemi",
    category: "takip",
    sitemapPriority: 0.96,
    title: "Öğrenci Takip Sistemi | OGTA — Devamsızlık, Gözlem ve Rehberlik",
    metaDescription:
      "OGTA öğrenci takip sistemi: devamsızlık, gözlem, risk sinyalleri, rehberlik notları ve veli bilgilendirme. Öğrenci takip yazılımı ile 360° öğrenci profili.",
    h1: "Öğrenci Takip Sistemi",
    lead:
      "OGTA öğrenci takip sistemi, her öğrencinin devam, gözlem, rehberlik ve akademik bağlamını tek profilde toplar. Öğrenci takip programı olarak kurum genelinde tutarlı izleme sağlar.",
    sections: [
      {
        title: "360° öğrenci profili",
        paragraphs: [
          "Yoklama, ders programı, öğretmen gözlemleri ve rehberlik notları aynı öğrenci kartında birleşir.",
          "Öğrenci izleme sistemi olarak risk sinyalleri erken aşamada görünür hale gelir."
        ]
      }
    ],
    features: [
      { title: "Devamsızlık", text: "Anlık kayıt ve veli bildirimi." },
      { title: "Gözlem", text: "Yapılandırılmış öğretmen gözlemleri." },
      { title: "Rehberlik", text: "Takip planları ve notlar." },
      { title: "Veli erişimi", text: "Şeffaf bilgilendirme paneli." }
    ],
    faq: [
      {
        question: "Öğrenci takip sistemi mobilde çalışır mı?",
        answer: "Evet. OGTA mobil uyumlu web ve native mobil uygulama ile veli ve öğretmen erişimi sunar."
      }
    ]
  },
  {
    slug: "okul-takip",
    path: "/okul-takip",
    category: "takip",
    sitemapPriority: 0.97,
    title: "Okul Takip | OGTA — Kurum Operasyonları ve Devamsızlık İzleme",
    metaDescription:
      "Okul takip yazılımı OGTA: yoklama tamamlama, devam oranı, sınıf metrikleri ve veli bilgilendirme tek okul takip panelinde. Özel okul ve kolejler için.",
    h1: "Okul Takip",
    lead:
      "OGTA okul takip çözümü, müdür ve idari ekibin kurum genelindeki operasyonu tek ekrandan izlemesini sağlar. Okul takip sistemi olarak devamsızlık, yoklama ve sınıf performansını gerçek zamanlı birleştirir.",
    sections: [
      {
        title: "Okul takip nedir?",
        paragraphs: [
          "Okul takip; yoklama, devamsızlık, ders programı uyumu ve veli bilgilendirme süreçlerinin kurum düzeyinde izlenmesidir. Excel ve mesajlaşma uygulamalarıyla yapılan manuel okul takip, veri gecikmesi ve tutarsız raporlama üretir.",
          "OGTA okul takip yazılımı tüm paydaşları aynı veri modelinde buluşturur: öğretmen yoklama alır, müdür anlık görür, veli bildirim alır."
        ]
      },
      {
        title: "Kimler kullanır?",
        paragraphs: [
          "Müdür ve idari ekip okul takip panelinde günlük operasyon özetini görür. Öğretmen sınıf bazlı yoklama girer. Rehberlik öğrenci risk sinyallerini takip eder. Veli yalnızca kendi çocuğunun devamsızlık ve program bilgisine erişir."
        ]
      }
    ],
    highlights: [
      "Günlük yoklama tamamlama oranı",
      "Sınıf ve şube bazlı devam metrikleri",
      "Devamsızlık trend uyarıları",
      "Veli SMS ve uygulama bildirimleri",
      "Müdür dashboard KPI'ları"
    ],
    features: [
      { title: "Anlık görünürlük", text: "Hangi sınıfın yoklaması eksik, tek bakışta." },
      { title: "Entegre veri", text: "Yoklama, program ve veli bildirimi aynı akışta." },
      { title: "Mobil erişim", text: "Okul takip paneline telefon ve tabletten erişim." },
      { title: "ogta.ai", text: "Doğal dil ile operasyon sorguları." }
    ],
    faq: [
      {
        question: "Okul takip ile okul takip sistemi aynı mı?",
        answer:
          "Okul takip genel ihtiyaçtır; okul takip sistemi bu ihtiyacı yazılımla karşılar. OGTA her ikisini tek platformda sunar. Detaylı modül anlatımı için okul takip sistemi sayfamıza bakın."
      },
      {
        question: "Okul takip yazılımı kurulum gerektirir mi?",
        answer: "Hayır. OGTA bulut tabanlıdır; tarayıcı veya mobil uygulama ile hemen kullanıma başlanır."
      }
    ]
  },
  {
    slug: "okul-yonetim",
    path: "/okul-yonetim",
    category: "yonetim",
    sitemapPriority: 0.97,
    title: "Okul Yönetim | OGTA — Dijital Okul Operasyonları ve Yönetim Platformu",
    metaDescription:
      "Okul yönetim yazılımı OGTA: yoklama, ders programı, öğrenci takip, rehberlik ve veli paneli. Özel okul ve kolejler için modern okul yönetim çözümü.",
    h1: "Okul Yönetim",
    lead:
      "OGTA okul yönetim platformu, kurumunuzun günlük operasyonlarını dijitalleştirir. Okul yönetim sistemi olarak personel, sınıf, program, yoklama ve veli süreçlerini tek merkezden yönetmenizi sağlar.",
    sections: [
      {
        title: "Okul yönetim neden dijitalleşmeli?",
        paragraphs: [
          "Dağınık araçlarla yürütülen okul yönetim; yoklama gecikmesi, program çakışması ve veli iletişim kopukluğu üretir. Merkezi okul yönetim yazılımı bu riskleri azaltır.",
          "OGTA okul yönetim programı müdür, öğretmen, rehber ve veli rollerini aynı tenant üzerinde güvenli biçimde ayırır."
        ]
      },
      {
        title: "Okul yönetim modülleri",
        paragraphs: [
          "Öğrenci ve sınıf yönetimi, akıllı yoklama, AI destekli ders programı, rehberlik vaka dosyası, duyuru ve veli paneli — okul yönetim ihtiyaçlarının tamamı modüler paketlerle sunulur."
        ]
      }
    ],
    highlights: [
      "Çok kiracılı (multi-tenant) kurum izolasyonu",
      "Rol bazlı erişim ve denetim izi",
      "Müdür operasyon dashboard'u",
      "Modüler Starter / Core / Premium paketler",
      "KVKK odaklı veri ayrıştırma"
    ],
    features: [
      { title: "Tek platform", text: "Ayrı yazılım ve Excel dosyalarına gerek kalmaz." },
      { title: "Ölçeklenebilir", text: "150'den 5.000+ öğrenciye kadar." },
      { title: "AI destekli", text: "ogta.ai ile operasyon hızlandırma." },
      { title: "Kurumsal güvenlik", text: "RBAC, audit log, tenant izolasyonu." }
    ],
    faq: [
      {
        question: "Okul yönetim ile okul yönetim sistemi farkı nedir?",
        answer:
          "Okul yönetim operasyonel süreçlerin bütünüdür; okul yönetim sistemi bunu yazılımla destekler. OGTA okul yönetim sistemi sayfasında modül detaylarını inceleyebilirsiniz."
      },
      {
        question: "Hangi kurumlar OGTA okul yönetim kullanabilir?",
        answer: "Özel okul, kolej, kurs merkezi, etüt merkezi ve rehberlik odaklı eğitim kurumları."
      }
    ]
  },
  {
    slug: "okul-takip-sistemi",
    path: "/okul-takip-sistemi",
    category: "takip",
    sitemapPriority: 0.95,
    title: "Okul Takip Sistemi | OGTA — Operasyon, Devamsızlık ve Yoklama İzleme",
    metaDescription:
      "OGTA okul takip sistemi: kurum operasyonları, devamsızlık trendleri, sınıf metrikleri, yoklama durumu ve veli bildirimi. Okul takip yazılımı ve okul izleme sistemi tek platformda.",
    h1: "Okul Takip Sistemi",
    lead:
      "OGTA okul takip sistemi, eğitim kurumlarının operasyonel görünürlüğünü artıran kapsamlı bir okul takip yazılımıdır. Sınıf, öğretmen ve devamsızlık kırılımında anlık rapor sunar; müdür, öğretmen ve veli aynı veriye farklı rollerle erişir.",
    sections: [
      {
        title: "Kurum operasyon takibi",
        paragraphs: [
          "Hangi sınıfların yoklaması tamamlandı, devam oranı nerede düşüyor — okul takip panelinde anında görünür. Okul izleme sistemi olarak idari ekip proaktif müdahale edebilir.",
          "Günlük yoklama raporu, sınıf bazlı devamsızlık özeti ve öğretmen tamamlama oranı tek ekranda birleşir. Manuel Excel takibine kıyasla veri gecikmesi ortadan kalkar."
        ]
      },
      {
        title: "Devamsızlık ve veli bilgilendirme",
        paragraphs: [
          "Okul takip sistemi, yoklama anında devamsızlık kaydı oluşturur ve veli bilgilendirme süreçlerini otomatikleştirir. Devamsızlık takip sistemi ile sınıf ve kurum kırılımında trend analizi yapılır.",
          "Veli takip sistemi entegrasyonu sayesinde veliler çocuklarının devamsızlık ve program bilgisine mobil panelden ulaşır; okul–aile iletişimi güçlenir."
        ]
      },
      {
        title: "Müdür ve rehberlik için okul takip",
        paragraphs: [
          "Müdür dashboard'unda kritik KPI'lar: yoklama tamamlama yüzdesi, devamsızlık artışı olan sınıflar, bekleyen operasyon uyarıları. Rehberlik ekibi öğrenci risk sinyallerini aynı okul takip verisi üzerinden izler.",
          "Okul takip programı olarak raporlar rol bazlı filtrelenir; hassas rehberlik verisi yalnızca yetkili rollere açılır."
        ]
      },
      {
        title: "Neden OGTA okul takip sistemi?",
        paragraphs: [
          "Piyasadaki birçok okul takip yazılımı yalnızca devamsızlık veya yalnızca duyuru odaklıdır. OGTA; yoklama, program, rehberlik, veli paneli ve ogta.ai komut asistanını tek okul takip sisteminde birleştirir.",
          "Bulut tabanlı mimari kurulum gerektirmez. Tenant izolasyonu ve KVKK odaklı veri ayrıştırma ile kurumsal güvenlik sağlanır."
        ]
      }
    ],
    useCases: [
      {
        title: "Sabah 08:30 — Müdür kontrolü",
        description:
          "Müdür okul takip panelinde hangi sınıfların ilk ders yoklamasını tamamladığını görür; eksik sınıflar için öğretmene otomatik hatırlatma gider."
      },
      {
        title: "Öğle — Devamsızlık trendi",
        description:
          "Son iki haftada devamsızlığı artan öğrenciler listelenir; rehberlik ekibi erken müdahale planı oluşturur."
      },
      {
        title: "Akşam — Veli bilgilendirme",
        description:
          "Gün içinde alınan yoklamalar veli paneline ve bildirim kanallarına yansır; veli aynı gün bilgilendirilir."
      }
    ],
    comparisonRows: [
      { label: "Yoklama takibi", ogta: "Ders bazlı, anlık, otomatik veli bildirimi", legacy: "Excel / kağıt, gecikmeli" },
      { label: "Kurum metrikleri", ogta: "Canlı dashboard, sınıf kırılımı", legacy: "Manuel rapor, haftalık" },
      { label: "Veli erişimi", ogta: "Mobil veli paneli + bildirim", legacy: "SMS / WhatsApp dağınık" },
      { label: "Rehberlik entegrasyonu", ogta: "Risk sinyali + vaka dosyası", legacy: "Ayrı dosya / not defteri" },
      { label: "AI destek", ogta: "ogta.ai operasyon sorguları", legacy: "Yok" }
    ],
    features: [
      { title: "Canlı metrikler", text: "Devam oranı, yoklama durumu ve sınıf kırılımı anlık." },
      { title: "Otomatik bildirim", text: "Devamsızlıkta veli SMS/e-posta/push." },
      { title: "Trend uyarıları", text: "Artan devamsızlık ve risk sinyalleri." },
      { title: "Rol bazlı paneller", text: "Müdür, öğretmen, rehber, veli ekranları." }
    ],
    faq: [
      {
        question: "Okul takip ile öğrenci takip farkı nedir?",
        answer:
          "Okul takip kurum operasyonuna odaklanır; öğrenci takip bireysel öğrenci dosyasına odaklanır. OGTA ikisini entegre sunar."
      },
      {
        question: "Okul takip sistemi mobilde çalışır mı?",
        answer: "Evet. Mobil uyumlu web paneli ve native mobil uygulama ile erişim sağlanır."
      },
      {
        question: "Excel yerine okul takip yazılımı kullanmak ne kazandırır?",
        answer:
          "Veri tekrarı ortadan kalkar, raporlar anlık güncellenir, veli bilgilendirme otomatikleşir ve denetim izi tutulur."
      },
      {
        question: "Demo alabilir miyim?",
        answer: "Evet. İletişim formu üzerinden kurumunuza özel canlı demo planlayabilirsiniz."
      }
    ]
  },
  {
    slug: "devamsizlik-takip-sistemi",
    path: "/devamsizlik-takip-sistemi",
    category: "takip",
    sitemapPriority: 0.92,
    title: "Devamsızlık Takip Sistemi | OGTA — Akıllı Yoklama ve Veli Bildirimi",
    metaDescription:
      "Devamsızlık takip sistemi OGTA: ders bazlı yoklama, otomatik veli bildirimi, devam oranı raporları ve müdür uyarıları. Devamsızlık yazılımı tek platformda.",
    h1: "Devamsızlık Takip Sistemi",
    lead:
      "OGTA devamsızlık takip sistemi, yoklama anında devamsızlık kaydı oluşturur ve veli bilgilendirme süreçlerini otomatikleştirir. Devam takip sistemi olarak sınıf ve kurum raporları üretir.",
    sections: [
      {
        title: "Anlık devamsızlık kaydı",
        paragraphs: [
          "Öğretmen aktif ders bağlamında yoklama alır; devamsızlık takibi öğrenci profiline işlenir.",
          "Devamsızlık yazılımı olarak yoklama penceresi kuralları ve denetim izi tutarlı veri sağlar."
        ]
      }
    ],
    features: [
      { title: "Ders bazlı yoklama", text: "Doğru sınıf listesi otomatik." },
      { title: "Veli SMS/e-posta", text: "Anında bilgilendirme." },
      { title: "Devam raporu", text: "Sınıf ve kurum kırılımı." },
      { title: "Trend analizi", text: "Artış uyarıları." }
    ],
    faq: [
      {
        question: "Devamsızlık takip sistemi MEB formatına uygun mu?",
        answer: "Kurum içi devamsızlık takibi ve raporlama için tasarlanmıştır; resmi MEB entegrasyonu kurum ihtiyacına göre değerlendirilir."
      }
    ]
  },
  {
    slug: "veli-takip-sistemi",
    path: "/veli-takip-sistemi",
    category: "takip",
    sitemapPriority: 0.91,
    title: "Veli Takip Sistemi | OGTA — Veli Paneli ve Bilgilendirme",
    metaDescription:
      "Veli takip sistemi OGTA: devamsızlık, ders programı, duyurular ve öğrenci bilgileri veli panelinde. Veli takip yazılımı ve okul–aile iletişim platformu.",
    h1: "Veli Takip Sistemi",
    lead:
      "OGTA veli takip sistemi, velilerin çocuklarının devamsızlık, program ve kurum duyurularını mobil uyumlu veli panelinden izlemesini sağlar. Veli bilgilendirme sistemi olarak okul–aile köprüsünü güçlendirir.",
    sections: [
      {
        title: "Şeffaf okul–aile iletişimi",
        paragraphs: [
          "Devamsızlık anında veli paneline yansır; duyurular hedef kitleye göre iletilir.",
          "Veli takip yazılımı ile birden fazla çocuğu olan veliler tek hesaptan yönetim yapar."
        ]
      }
    ],
    features: [
      { title: "Veli paneli", text: "Web ve mobil erişim." },
      { title: "Devamsızlık bildirimi", text: "Anlık push/e-posta." },
      { title: "Ders programı", text: "Haftalık görünüm." },
      { title: "Duyurular", text: "Kurum ve sınıf duyuruları." }
    ],
    faq: [
      {
        question: "Veli takip sistemi ücretsiz mi?",
        answer: "Veli erişimi okul lisansına dahildir; veliden ayrı ücret alınmaz."
      }
    ]
  },
  {
    slug: "yoklama-sistemi",
    path: "/yoklama-sistemi",
    category: "modul",
    sitemapPriority: 0.93,
    title: "Yoklama Sistemi | OGTA — Akıllı Dijital Yoklama Yazılımı",
    metaDescription:
      "OGTA yoklama sistemi: ders bazlı akıllı yoklama, yoklama penceresi, otomatik veli bildirimi ve denetim izi. Online yoklama yazılımı okul ve kolejler için.",
    h1: "Yoklama Sistemi",
    lead:
      "OGTA yoklama sistemi, öğretmenin aktif dersi seçmeden doğru sınıf listesine ulaşmasını sağlar. Akıllı yoklama sistemi olarak devamsızlık anında kayda geçer ve veli süreçleri tetiklenir.",
    sections: [
      {
        title: "Dijital yoklama akışı",
        paragraphs: [
          "Kağıt yoklama yerine online yoklama ile veri anında sisteme işlenir.",
          "Okul yoklama programı olarak ders programı entegrasyonu sayesinde hata oranı düşer."
        ]
      }
    ],
    features: [
      { title: "Akıllı liste", text: "Aktif derse göre otomatik sınıf." },
      { title: "Yoklama penceresi", text: "Ders saati kuralı." },
      { title: "Veli tetikleme", text: "Devamsızlık bildirimi." },
      { title: "Denetim izi", text: "Kim, ne zaman kaydetti." }
    ],
    faq: [
      {
        question: "Yoklama sistemi internetsiz çalışır mı?",
        answer: "İnternet bağlantısı gerektirir; mobil veri ile de yoklama alınabilir."
      }
    ]
  },
  {
    slug: "ders-programi-yazilimi",
    path: "/ders-programi-yazilimi",
    category: "modul",
    sitemapPriority: 0.9,
    title: "Ders Programı Yazılımı | OGTA — AI Destekli Program Oluşturma",
    metaDescription:
      "Ders programı yazılımı OGTA: öğretmen müsaitliği, sınıf kapasitesi ve çakışma kuralları ile AI destekli ders programı oluşturma. Okul ders programı tek tıkla yayın.",
    h1: "Ders Programı Yazılımı",
    lead:
      "OGTA ders programı yazılımı, manuel tablo düzenleme yerine kural tabanlı otomatik program üretimi sunar. Ders programı oluşturma sürecini AI ile hızlandırır, tek tıkla yayınlar.",
    sections: [
      {
        title: "AI destekli program üretimi",
        paragraphs: [
          "Öğretmen müsaitlikleri, sınıf kapasitesi ve ders çakışma kuralları dikkate alınarak program oluşturulur.",
          "Okul ders programı değişiklikleri tüm rollere anında yansır."
        ]
      }
    ],
    features: [
      { title: "Çakışma kontrolü", text: "Otomatik kural denetimi." },
      { title: "Müsaitlik", text: "Öğretmen tercihleri." },
      { title: "Yayın", text: "Tek tıkla tüm kuruma." },
      { title: "Veli/öğretmen görünümü", text: "Kişisel program ekranı." }
    ],
    faq: [
      {
        question: "Mevcut Excel programı içe aktarılabilir mi?",
        answer: "Demo sürecinde mevcut yapınız değerlendirilir; geçiş planı kurum ihtiyacına göre oluşturulur."
      }
    ]
  },
  {
    slug: "rehberlik-yazilimi",
    path: "/rehberlik-yazilimi",
    category: "modul",
    sitemapPriority: 0.9,
    title: "Rehberlik Yazılımı | OGTA — Gözlem, Risk ve Takip Planları",
    metaDescription:
      "Rehberlik yazılımı OGTA: öğretmen gözlemleri, risk sinyalleri, rehberlik notları ve takip planları. Rehberlik sistemi ve öğrenci gözlem modülü tek platformda.",
    h1: "Rehberlik Yazılımı",
    lead:
      "OGTA rehberlik yazılımı, öğretmen gözlemlerini yapılandırılmış biçimde toplar; rehberlik ekibi risk sinyalleri ve takip planlarını güvenli ortamda yönetir.",
    sections: [
      {
        title: "Rehberlik süreçlerinin dijitalleşmesi",
        paragraphs: [
          "Rehberlik sistemi olarak gözlem formları, PDR notları ve müdahale planları tek öğrenci dosyasında.",
          "Öğrenci rehberlik takibi erken uyarı mekanizmalarıyla desteklenir."
        ]
      }
    ],
    features: [
      { title: "Gözlem modülü", text: "Yapılandırılmış formlar." },
      { title: "Risk takibi", text: "Sinyal ve plan yönetimi." },
      { title: "Gizlilik", text: "Rol bazlı erişim." },
      { title: "Denetim izi", text: "Hassas kayıt koruması." }
    ],
    faq: [
      {
        question: "Rehberlik yazılımı KVKK uyumlu mu?",
        answer: "Tenant izolasyonu, RBAC ve denetim izi ile hassas rehberlik verisi korunur."
      }
    ]
  },
  {
    slug: "ozel-okul-yazilimi",
    path: "/ozel-okul-yazilimi",
    category: "kurum",
    sitemapPriority: 0.94,
    title: "Özel Okul Yazılımı | OGTA — Yönetim, Takip ve Veli Paneli",
    metaDescription:
      "Özel okul yazılımı OGTA: yoklama, ders programı, öğrenci takip, rehberlik ve veli iletişimi. Özel okul yönetim sistemi ve özel okul takip programı.",
    h1: "Özel Okul Yazılımı",
    lead:
      "OGTA özel okul yazılımı, özel okulların operasyonel ihtiyaçlarına göre tasarlanmış modüler bir platformdur. Özel okul yönetim sistemi olarak veli beklentilerini karşılayan şeffaf iletişim sunar.",
    sections: [
      {
        title: "Özel okul operasyonları",
        paragraphs: [
          "Özel okul otomasyon ihtiyacı: hızlı veli bilgilendirme, rehberlik süreçleri ve müdür raporlaması.",
          "Özel okul programı tercihinde OGTA, ölçeklenebilir lisans modeli ile büyüyen okullara uyum sağlar."
        ]
      }
    ],
    features: [
      { title: "Veli odaklı", text: "Premium veli deneyimi." },
      { title: "Rehberlik", text: "Gözlem ve risk modülü." },
      { title: "Marka", text: "Kurumsal görünüm." },
      { title: "Destek", text: "Türkçe teknik destek." }
    ],
    faq: [
      {
        question: "Özel okul yazılımı kaç öğrenciden itibaren uygun?",
        answer: "Starter paket minimum sipariş tutarı ile küçük okullardan büyük kolejlere kadar ölçeklenir."
      }
    ]
  },
  {
    slug: "kolej-yonetim-sistemi",
    path: "/kolej-yonetim-sistemi",
    category: "kurum",
    sitemapPriority: 0.93,
    title: "Kolej Yönetim Sistemi | OGTA — Çok Kampüslü Okul Yazılımı",
    metaDescription:
      "Kolej yönetim sistemi OGTA: çok sınıflı yapılar için yoklama, program, takip, rehberlik ve müdür dashboard'u. Kolej yazılımı ve kolej takip sistemi.",
    h1: "Kolej Yönetim Sistemi",
    lead:
      "OGTA kolej yönetim sistemi, yüksek öğrenci sayısı ve çok sınıflı yapılarda operasyonel kontrol sağlar. Kolej yazılımı olarak kurum geneli metrikler ve departman koordinasyonu sunar.",
    sections: [
      {
        title: "Kolej ölçeğinde yönetim",
        paragraphs: [
          "Kolej otomasyon ihtiyacı: merkezi yoklama takibi, program yönetimi ve rehberlik koordinasyonu.",
          "Kolej okul yazılımı olarak Premium paket API ve SLA seçenekleri sunar."
        ]
      }
    ],
    features: [
      { title: "Ölçeklenebilir", text: "Binlerce öğrenci." },
      { title: "Dashboard", text: "Kurum geneli KPI." },
      { title: "AI analitik", text: "Premium pakette gelişmiş." },
      { title: "SLA", text: "Kurumsal destek." }
    ],
    faq: [
      {
        question: "Kolej yönetim sistemi çok kampüs destekler mi?",
        answer: "Multi-tenant mimari farklı kurum birimlerini ayrı tenant olarak yönetebilir; detay için demo talep edin."
      }
    ]
  }
];

const pagesWithoutLinks = solutionPageDrafts.map(finalize);

export const solutionPages: SolutionPageConfig[] = pagesWithoutLinks.map((page) => ({
  ...page,
  relatedLinks: autoRelated(pagesWithoutLinks, page.path, page.category)
}));

export const solutionPagesByCategory = (Object.keys(SEO_CATEGORIES) as SeoCategory[]).map((key) => ({
  category: key,
  label: SEO_CATEGORIES[key],
  pages: solutionPages.filter((p) => p.category === key)
}));

export function solutionPageByPath(path: string) {
  return solutionPages.find((page) => page.path === path);
}

export function solutionPageBySlug(slug: string) {
  return solutionPages.find((page) => page.slug === slug);
}
