package billing

import "testing"

func TestParseTCMBUsdRate(t *testing.T) {
	raw := []byte(`<?xml version="1.0" encoding="UTF-8"?>
<Tarih_Date Tarih="14.08.2026" Date="08/14/2026">
  <Currency CurrencyCode="EUR"><ForexBuying>55.1391</ForexBuying><ForexSelling>55.2385</ForexSelling></Currency>
  <Currency CurrencyCode="USD"><ForexBuying>47.7206</ForexBuying><ForexSelling>47.8066</ForexSelling></Currency>
</Tarih_Date>`)
	rate, err := parseTCMBUsdRate(raw)
	if err != nil {
		t.Fatalf("parseTCMBUsdRate: %v", err)
	}
	if rate.UsdTryRate != 47.8066 {
		t.Fatalf("usdTryRate = %v, want 47.8066", rate.UsdTryRate)
	}
	if rate.BulletinDate != "14.08.2026" {
		t.Fatalf("bulletinDate = %q", rate.BulletinDate)
	}
}
