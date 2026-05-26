package billing

const (
	PackageStarter = "starter"
	PackageCore    = "core"
	PackagePremium = "premium"

	// Birim fiyatla orantılı yıllık minimum sipariş tabanları (USD).
	MinOrderStarter = 1500.0
	MinOrderCore    = 2000.0
	MinOrderPremium = 2500.0
)

type LicensePackage struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	Tagline         string   `json:"tagline"`
	PricePerStudent float64  `json:"pricePerStudentUsd"`
	MinOrderUSD     float64  `json:"minOrderUsd"`
	Features        []string `json:"features"`
}

func DefaultPackages() []LicensePackage {
	return []LicensePackage{
		{
			ID:              PackageStarter,
			Name:            "Starter",
			Tagline:         "Temel okul operasyonları",
			PricePerStudent: 5,
			MinOrderUSD:     MinOrderStarter,
			Features: []string{
				"Öğrenci & sınıf yönetimi",
				"Akıllı yoklama modülü",
				"Ders programı görüntüleme",
				"Veli bilgilendirme (e-posta)",
				"Temel müdür paneli",
				"E-posta destek",
			},
		},
		{
			ID:              PackageCore,
			Name:            "Core",
			Tagline:         "Tam okul yönetim paketi",
			PricePerStudent: 10,
			MinOrderUSD:     MinOrderCore,
			Features: []string{
				"Starter paketindeki tüm özellikler",
				"Gözlem & rehberlik modülü",
				"Gelişmiş dashboard & raporlama",
				"SMS bildirimleri",
				"ogta.ai komut asistanı (standart kota)",
				"Öncelikli destek",
			},
		},
		{
			ID:              PackagePremium,
			Name:            "Premium",
			Tagline:         "Kurumsal & AI odaklı",
			PricePerStudent: 15,
			MinOrderUSD:     MinOrderPremium,
			Features: []string{
				"Core paketindeki tüm özellikler",
				"ogta.ai gelişmiş analitik & yüksek kota",
				"Kurum bazlı özelleştirme",
				"API & entegrasyon desteği",
				"Özel hesap yöneticisi",
				"SLA garantisi",
			},
		},
	}
}

func FindPackage(id string) (LicensePackage, bool) {
	for _, item := range DefaultPackages() {
		if item.ID == id {
			return item, true
		}
	}
	return LicensePackage{}, false
}

type QuotePricing struct {
	PricePerStudent       float64
	MinOrderUSD           float64
	DefaultPricePerStudent float64
	DefaultMinOrderUSD     float64
	PricingCustomized     bool
}

func ResolveQuotePricing(pkg LicensePackage, priceOverride, minOverride *float64) QuotePricing {
	out := QuotePricing{
		PricePerStudent:        pkg.PricePerStudent,
		MinOrderUSD:            pkg.MinOrderUSD,
		DefaultPricePerStudent: pkg.PricePerStudent,
		DefaultMinOrderUSD:     pkg.MinOrderUSD,
	}
	if priceOverride != nil && *priceOverride > 0 {
		out.PricePerStudent = *priceOverride
		out.PricingCustomized = true
	}
	if minOverride != nil {
		if *minOverride >= 0 {
			out.MinOrderUSD = *minOverride
			out.PricingCustomized = true
		}
	}
	return out
}

func CalculateLicenseSubtotal(students int, pricePerStudent float64, minOrderUSD float64, termYears int) (calculatedUSD, subtotalUSD float64, minimumApplied bool) {
	if termYears <= 0 {
		termYears = 1
	}
	calculatedUSD = roundUSD(float64(students) * pricePerStudent * float64(termYears))
	minimumUSD := minOrderUSD * float64(termYears)
	subtotalUSD = calculatedUSD
	if minOrderUSD > 0 && subtotalUSD < minimumUSD {
		subtotalUSD = minimumUSD
		minimumApplied = true
	}
	return calculatedUSD, subtotalUSD, minimumApplied
}

func roundUSD(value float64) float64 {
	return float64(int(value*100+0.5)) / 100
}
