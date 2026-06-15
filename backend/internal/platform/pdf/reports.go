package pdf

import (
	"bytes"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
)

type AttendanceReportInput struct {
	SchoolName   string
	StudentName  string
	StudentID    string
	SchoolNumber string
	ClassName    string
	GeneratedAt  time.Time
	Present      int
	Absent       int
	Late         int
	Excused      int
	Records      []AttendanceRecordRow
}

type AttendanceRecordRow struct {
	Date        string
	SubjectName string
	ClassName   string
	Status      string
}

type BillingReceiptInput struct {
	SchoolName      string
	StudentName     string
	SchoolNumber    string
	ClassName       string
	ReceiptNo       string
	GeneratedAt     time.Time
	PlanName        string
	InstallmentID   string
	InstallmentDue  string
	InstallmentCost float64
	PaymentID       string
	PaymentAmount   float64
	PaymentMethod   string
	PaidAt          time.Time
	Note            string
	Currency        string
	RecordedBy      string
}

type GuidanceCaseSummaryInput struct {
	SchoolName  string
	GeneratedAt time.Time
	CaseID      string
	StudentName string
	ClassName   string
	OwnerName   string
	Title       string
	Status      string
	Priority    string
	Sensitivity string
	OpenedAt    time.Time
	ClosedAt    *time.Time
	Summary     string
	Timeline    []GuidanceTimelineRow
}

type GuidanceTimelineRow struct {
	Date      time.Time
	Type      string
	Title     string
	Body      string
	ActorName string
}

type StudentDevelopmentReportInput struct {
	SchoolName      string
	GeneratedAt     time.Time
	StudentName     string
	StudentID       string
	SchoolNumber    string
	ClassName       string
	AveragePercent  float64
	AssessmentCount int
	Subjects        []AcademicSubjectRow
	RecentResults   []AcademicResultRow
	Outcomes        []AcademicOutcomeRow
	SupportSignals  []string
	AIWeeklySummary string
	Attendance      AttendanceReportInput
	CounselorNote   string
	TeacherNote     string
}

type AcademicSubjectRow struct {
	SubjectName     string
	AveragePercent  float64
	AssessmentCount int
	Trend           string
	NeedsSupport    bool
}

type AcademicResultRow struct {
	Date           string
	AssessmentName string
	SubjectName    string
	Score          float64
	MaxScore       float64
	Percent        float64
	Note           string
}

type AcademicOutcomeRow struct {
	SubjectName  string
	OutcomeCode  string
	OutcomeTitle string
	Status       string
	Evidence     string
}

type ServiceTripReportInput struct {
	SchoolName    string
	GeneratedAt   time.Time
	TripID        string
	RouteName     string
	DriverName    string
	Direction     string
	Status        string
	StartedAt     time.Time
	EndedAt       *time.Time
	LastSeenAt    *time.Time
	LocationCount int
	EventCount    int
	Timeline      []ServiceTimelineRow
}

type ServiceTimelineRow struct {
	Date        time.Time
	Type        string
	Description string
}

func (g *ReportGenerator) GenerateAttendanceReportPDF(input AttendanceReportInput) ([]byte, error) {
	doc := newReportDoc(input.SchoolName, "Devamsizlik Raporu", input.GeneratedAt)
	doc.keyValueGrid([][2]string{
		{"Ogrenci", input.StudentName},
		{"Okul No", input.SchoolNumber},
		{"Sinif", input.ClassName},
		{"Ogrenci ID", input.StudentID},
	})
	doc.section("Ozet")
	doc.table([]string{"Geldi", "Devamsiz", "Gec", "Mazeretli"}, [][]string{{
		fmt.Sprint(input.Present),
		fmt.Sprint(input.Absent),
		fmt.Sprint(input.Late),
		fmt.Sprint(input.Excused),
	}}, []float64{42, 42, 42, 42})
	doc.section("Kayitlar")
	rows := make([][]string, 0, len(input.Records))
	for _, item := range input.Records {
		rows = append(rows, []string{item.Date, item.SubjectName, item.ClassName, statusLabel(item.Status)})
	}
	if len(rows) == 0 {
		doc.paragraph("Kayit bulunmuyor.")
	} else {
		doc.table([]string{"Tarih", "Ders", "Sinif", "Durum"}, rows, []float64{32, 58, 50, 40})
	}
	return doc.bytes()
}

func (g *ReportGenerator) GenerateBillingReceiptPDF(input BillingReceiptInput) ([]byte, error) {
	doc := newReportDoc(input.SchoolName, "Tahsilat Makbuzu", input.GeneratedAt)
	doc.keyValueGrid([][2]string{
		{"Makbuz No", input.ReceiptNo},
		{"Ogrenci", input.StudentName},
		{"Okul No", input.SchoolNumber},
		{"Sinif", input.ClassName},
		{"Odeme Tarihi", formatDateTime(input.PaidAt)},
		{"Yontem", paymentMethodLabel(input.PaymentMethod)},
	})
	doc.section("Odeme Detayi")
	doc.table([]string{"Plan", "Taksit Vade", "Taksit Tutar", "Odenen", "Para Birimi"}, [][]string{{
		input.PlanName,
		input.InstallmentDue,
		money(input.InstallmentCost),
		money(input.PaymentAmount),
		emptyDefault(input.Currency, "TRY"),
	}}, []float64{48, 36, 34, 34, 28})
	doc.keyValueGrid([][2]string{
		{"Odeme ID", input.PaymentID},
		{"Taksit ID", input.InstallmentID},
		{"Kaydeden", input.RecordedBy},
	})
	if strings.TrimSpace(input.Note) != "" {
		doc.section("Not")
		doc.paragraph(input.Note)
	}
	return doc.bytes()
}

func (g *ReportGenerator) GenerateGuidanceCaseSummaryPDF(input GuidanceCaseSummaryInput) ([]byte, error) {
	doc := newReportDoc(input.SchoolName, "Rehberlik Vaka Ozeti", input.GeneratedAt)
	closedAt := ""
	if input.ClosedAt != nil {
		closedAt = formatDateTime(*input.ClosedAt)
	}
	doc.keyValueGrid([][2]string{
		{"Vaka", input.Title},
		{"Ogrenci", input.StudentName},
		{"Sinif", input.ClassName},
		{"Sorumlu", input.OwnerName},
		{"Durum", guidanceStatusLabel(input.Status)},
		{"Oncelik", priorityLabel(input.Priority)},
		{"Acilis", formatDateTime(input.OpenedAt)},
		{"Kapanis", closedAt},
	})
	doc.section("Ozet")
	doc.paragraph(input.Summary)
	doc.section("Zaman Cizelgesi")
	rows := make([][]string, 0, len(input.Timeline))
	for _, item := range input.Timeline {
		body := strings.TrimSpace(item.Body)
		if len([]rune(body)) > 120 {
			body = string([]rune(body)[:120]) + "..."
		}
		rows = append(rows, []string{formatDateTime(item.Date), item.Type, item.Title, body})
	}
	if len(rows) == 0 {
		doc.paragraph("Zaman cizelgesi kaydi yok.")
	} else {
		doc.table([]string{"Tarih", "Tur", "Baslik", "Icerik"}, rows, []float64{34, 30, 48, 68})
	}
	return doc.bytes()
}

func (g *ReportGenerator) GenerateStudentDevelopmentReportPDF(input StudentDevelopmentReportInput) ([]byte, error) {
	doc := newReportDoc(input.SchoolName, "Ogrenci Gelisim Raporu", input.GeneratedAt)
	doc.keyValueGrid([][2]string{
		{"Ogrenci", input.StudentName},
		{"Okul No", input.SchoolNumber},
		{"Sinif", input.ClassName},
		{"Degerlendirme Sayisi", fmt.Sprint(input.AssessmentCount)},
		{"Akademik Ortalama", fmt.Sprintf("%.1f%%", input.AveragePercent)},
		{"Devamsizlik", fmt.Sprintf("%d devamsiz, %d gec", input.Attendance.Absent, input.Attendance.Late)},
	})
	doc.section("Ders Bazli Ozet")
	subjectRows := make([][]string, 0, len(input.Subjects))
	for _, item := range input.Subjects {
		support := "Hayir"
		if item.NeedsSupport {
			support = "Evet"
		}
		subjectRows = append(subjectRows, []string{item.SubjectName, fmt.Sprintf("%.1f%%", item.AveragePercent), fmt.Sprint(item.AssessmentCount), trendLabel(item.Trend), support})
	}
	if len(subjectRows) == 0 {
		doc.paragraph("Akademik ders ozeti bulunmuyor.")
	} else {
		doc.table([]string{"Ders", "Ortalama", "Olcum", "Trend", "Destek"}, subjectRows, []float64{56, 32, 26, 34, 30})
	}
	doc.section("Son Sonuclar")
	resultRows := make([][]string, 0, len(input.RecentResults))
	for _, item := range input.RecentResults {
		resultRows = append(resultRows, []string{item.Date, item.SubjectName, item.AssessmentName, fmt.Sprintf("%.1f/%.1f", item.Score, item.MaxScore), fmt.Sprintf("%.1f%%", item.Percent)})
	}
	if len(resultRows) == 0 {
		doc.paragraph("Sonuc kaydi bulunmuyor.")
	} else {
		doc.table([]string{"Tarih", "Ders", "Olcum", "Puan", "%"}, resultRows, []float64{28, 42, 54, 28, 24})
	}
	if len(input.SupportSignals) > 0 {
		doc.section("Destek Sinyalleri")
		doc.bullets(input.SupportSignals)
	}
	if strings.TrimSpace(input.AIWeeklySummary) != "" {
		doc.section("Haftalik Ozet")
		doc.paragraph(input.AIWeeklySummary)
	}
	if strings.TrimSpace(input.TeacherNote) != "" || strings.TrimSpace(input.CounselorNote) != "" {
		doc.section("Notlar")
		if strings.TrimSpace(input.TeacherNote) != "" {
			doc.paragraph("Ogretmen Notu: " + input.TeacherNote)
		}
		if strings.TrimSpace(input.CounselorNote) != "" {
			doc.paragraph("Rehberlik Notu: " + input.CounselorNote)
		}
	}
	return doc.bytes()
}

func (g *ReportGenerator) GenerateServiceTripReportPDF(input ServiceTripReportInput) ([]byte, error) {
	doc := newReportDoc(input.SchoolName, "Servis Raporu", input.GeneratedAt)
	endedAt := ""
	if input.EndedAt != nil {
		endedAt = formatDateTime(*input.EndedAt)
	}
	lastSeen := ""
	if input.LastSeenAt != nil {
		lastSeen = formatDateTime(*input.LastSeenAt)
	}
	doc.keyValueGrid([][2]string{
		{"Sefer", input.TripID},
		{"Rota", input.RouteName},
		{"Sofor", input.DriverName},
		{"Yon", directionLabel(input.Direction)},
		{"Durum", tripStatusLabel(input.Status)},
		{"Baslangic", formatDateTime(input.StartedAt)},
		{"Bitis", endedAt},
		{"Son Konum", lastSeen},
		{"Konum Sayisi", fmt.Sprint(input.LocationCount)},
		{"Olay Sayisi", fmt.Sprint(input.EventCount)},
	})
	doc.section("Zaman Cizelgesi")
	rows := make([][]string, 0, len(input.Timeline))
	sort.Slice(input.Timeline, func(i, j int) bool {
		return input.Timeline[i].Date.After(input.Timeline[j].Date)
	})
	for _, item := range input.Timeline {
		rows = append(rows, []string{formatDateTime(item.Date), item.Type, item.Description})
	}
	if len(rows) == 0 {
		doc.paragraph("Sefer zaman cizelgesi kaydi yok.")
	} else {
		doc.table([]string{"Tarih", "Tur", "Aciklama"}, rows, []float64{38, 36, 106})
	}
	return doc.bytes()
}

type reportDoc struct {
	pdf *gofpdf.Fpdf
	tr  func(string) string
}

func newReportDoc(schoolName, title string, generatedAt time.Time) *reportDoc {
	if generatedAt.IsZero() {
		generatedAt = time.Now()
	}
	p := gofpdf.New("P", "mm", "A4", "")
	p.SetMargins(14, 14, 14)
	p.SetAutoPageBreak(true, 16)
	p.AddPage()
	p.SetFont("Arial", "B", 15)
	doc := &reportDoc{pdf: p, tr: asciiPDFText}
	doc.cell(0, 8, emptyDefault(schoolName, "OGTA"))
	p.Ln(9)
	p.SetFont("Arial", "B", 13)
	doc.cell(0, 8, title)
	p.Ln(7)
	p.SetFont("Arial", "", 9)
	doc.cell(0, 6, "Olusturma: "+formatDateTime(generatedAt))
	p.Ln(9)
	doc.line()
	return doc
}

func (d *reportDoc) section(title string) {
	d.pdf.Ln(4)
	d.pdf.SetFont("Arial", "B", 11)
	d.cell(0, 7, title)
	d.pdf.Ln(8)
}

func (d *reportDoc) paragraph(text string) {
	d.pdf.SetFont("Arial", "", 9)
	d.pdf.MultiCell(182, 5, d.tr(emptyDefault(text, "-")), "", "L", false)
	d.pdf.Ln(2)
}

func (d *reportDoc) bullets(items []string) {
	d.pdf.SetFont("Arial", "", 9)
	for _, item := range items {
		d.pdf.MultiCell(182, 5, d.tr("- "+item), "", "L", false)
	}
	d.pdf.Ln(2)
}

func (d *reportDoc) keyValueGrid(items [][2]string) {
	d.pdf.SetFont("Arial", "", 9)
	for index, item := range items {
		x := d.pdf.GetX()
		y := d.pdf.GetY()
		d.pdf.SetFont("Arial", "B", 8)
		d.cell(28, 6, item[0]+":")
		d.pdf.SetFont("Arial", "", 8)
		d.cell(62, 6, emptyDefault(item[1], "-"))
		if index%2 == 0 {
			d.pdf.SetXY(x+92, y)
		} else {
			d.pdf.Ln(6)
		}
	}
	if len(items)%2 == 1 {
		d.pdf.Ln(6)
	}
	d.pdf.Ln(2)
}

func (d *reportDoc) table(headers []string, rows [][]string, widths []float64) {
	d.pdf.SetFont("Arial", "B", 8)
	d.pdf.SetFillColor(238, 242, 247)
	for index, header := range headers {
		d.pdf.CellFormat(widths[index], 7, d.tr(header), "1", 0, "L", true, 0, "")
	}
	d.pdf.Ln(-1)
	d.pdf.SetFont("Arial", "", 8)
	for _, row := range rows {
		if d.pdf.GetY() > 268 {
			d.pdf.AddPage()
		}
		maxLines := 1
		for index, value := range row {
			lines := d.pdf.SplitLines([]byte(d.tr(value)), widths[index]-2)
			if len(lines) > maxLines {
				maxLines = len(lines)
			}
		}
		height := float64(maxLines) * 5
		x := d.pdf.GetX()
		y := d.pdf.GetY()
		for index, value := range row {
			d.pdf.Rect(x, y, widths[index], height, "")
			d.pdf.SetXY(x+1, y+1)
			d.pdf.MultiCell(widths[index]-2, 4, d.tr(emptyDefault(value, "-")), "", "L", false)
			x += widths[index]
			d.pdf.SetXY(x, y)
		}
		d.pdf.SetY(y + height)
	}
	d.pdf.Ln(3)
}

func (d *reportDoc) line() {
	d.pdf.SetDrawColor(226, 232, 240)
	d.pdf.Line(14, d.pdf.GetY(), 196, d.pdf.GetY())
	d.pdf.Ln(3)
}

func (d *reportDoc) cell(w, h float64, text string) {
	d.pdf.Cell(w, h, d.tr(text))
}

func (d *reportDoc) bytes() ([]byte, error) {
	buf := new(bytes.Buffer)
	if err := d.pdf.Output(buf); err != nil {
		return nil, fmt.Errorf("pdf generation failed: %w", err)
	}
	return buf.Bytes(), nil
}

func asciiPDFText(value string) string {
	replacer := strings.NewReplacer(
		"ı", "i", "İ", "I", "ğ", "g", "Ğ", "G", "ü", "u", "Ü", "U",
		"ş", "s", "Ş", "S", "ö", "o", "Ö", "O", "ç", "c", "Ç", "C",
		"—", "-", "–", "-", "“", "\"", "”", "\"", "’", "'", "₺", "TRY",
	)
	return replacer.Replace(value)
}

func emptyDefault(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func formatDateTime(value time.Time) string {
	if value.IsZero() {
		return "-"
	}
	return value.Format("02.01.2006 15:04")
}

func money(value float64) string {
	return fmt.Sprintf("%.2f", value)
}

func statusLabel(value string) string {
	switch value {
	case "present":
		return "Geldi"
	case "absent":
		return "Devamsiz"
	case "late":
		return "Gec"
	case "excused":
		return "Mazeretli"
	default:
		return emptyDefault(value, "-")
	}
}

func paymentMethodLabel(value string) string {
	switch value {
	case "cash":
		return "Nakit"
	case "bank_transfer":
		return "Banka"
	case "card":
		return "Kart"
	case "other":
		return "Diger"
	default:
		return emptyDefault(value, "-")
	}
}

func guidanceStatusLabel(value string) string {
	switch value {
	case "open":
		return "Acik"
	case "monitoring":
		return "Izlemede"
	case "closed":
		return "Kapali"
	default:
		return emptyDefault(value, "-")
	}
}

func priorityLabel(value string) string {
	switch value {
	case "low":
		return "Dusuk"
	case "medium":
		return "Orta"
	case "high":
		return "Yuksek"
	case "critical":
		return "Kritik"
	default:
		return emptyDefault(value, "-")
	}
}

func trendLabel(value string) string {
	switch value {
	case "up":
		return "Yukselen"
	case "down":
		return "Dusen"
	case "stable":
		return "Stabil"
	default:
		return emptyDefault(value, "-")
	}
}

func directionLabel(value string) string {
	switch value {
	case "morning":
		return "Sabah"
	case "evening":
		return "Aksam"
	case "both":
		return "Cift Yon"
	default:
		return emptyDefault(value, "-")
	}
}

func tripStatusLabel(value string) string {
	switch value {
	case "active":
		return "Aktif"
	case "completed":
		return "Tamamlandi"
	case "canceled":
		return "Iptal"
	default:
		return emptyDefault(value, "-")
	}
}
