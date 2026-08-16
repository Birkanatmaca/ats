package billing

import (
	"context"
	"encoding/xml"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	billingdomain "ots/backend/internal/domain/billing"
)

const tcmbTodayURL = "https://www.tcmb.gov.tr/kurlar/today.xml"

var ErrTCMBUnavailable = errors.New("tcmb rate unavailable")

type tcmbDocument struct {
	XMLName    xml.Name       `xml:"Tarih_Date"`
	Date       string         `xml:"Tarih,attr"`
	Currencies []tcmbCurrency `xml:"Currency"`
}

type tcmbCurrency struct {
	Code         string `xml:"CurrencyCode,attr"`
	ForexBuying  string `xml:"ForexBuying"`
	ForexSelling string `xml:"ForexSelling"`
}

func (s *Service) TCMBUsdRate(ctx context.Context) (billingdomain.TCMBRate, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, tcmbTodayURL, nil)
	if err != nil {
		return billingdomain.TCMBRate{}, err
	}
	req.Header.Set("Accept", "application/xml, text/xml, */*")
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; OGTA-Billing/1.0)")

	client := &http.Client{Timeout: 12 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return billingdomain.TCMBRate{}, ErrTCMBUnavailable
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return billingdomain.TCMBRate{}, ErrTCMBUnavailable
	}
	body, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return billingdomain.TCMBRate{}, ErrTCMBUnavailable
	}
	rate, err := parseTCMBUsdRate(body)
	if err != nil {
		return billingdomain.TCMBRate{}, err
	}
	return rate, nil
}

func parseTCMBUsdRate(raw []byte) (billingdomain.TCMBRate, error) {
	var doc tcmbDocument
	if err := xml.Unmarshal(raw, &doc); err != nil {
		return billingdomain.TCMBRate{}, ErrTCMBUnavailable
	}
	for _, currency := range doc.Currencies {
		if !strings.EqualFold(currency.Code, "USD") {
			continue
		}
		buying := parseTCMBFloat(currency.ForexBuying)
		selling := parseTCMBFloat(currency.ForexSelling)
		if selling <= 0 {
			return billingdomain.TCMBRate{}, ErrTCMBUnavailable
		}
		return billingdomain.TCMBRate{
			Currency:     "USD",
			UsdTryRate:   selling,
			ForexBuying:  buying,
			ForexSelling: selling,
			BulletinDate: strings.TrimSpace(doc.Date),
			Source:       "TCMB",
		}, nil
	}
	return billingdomain.TCMBRate{}, ErrTCMBUnavailable
}

func parseTCMBFloat(raw string) float64 {
	value, err := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(raw), ",", "."), 64)
	if err != nil || value <= 0 {
		return 0
	}
	return value
}
