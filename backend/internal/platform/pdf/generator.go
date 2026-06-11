package pdf

import (
	"bytes"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
)

// ReportGenerator produces PDF documents from structured data
type ReportGenerator struct{}

// GuidanceNoteInput defines data for generating guidance note PDF
type GuidanceNoteInput struct {
	StudentName     string
	StudentID       string
	SchoolName      string
	DateCreated     time.Time
	CounselorName   string
	Title           string
	Content         string
	Confidentiality string // "public", "staff", "restricted"
}

// StudentProgressInput defines data for generating progress report PDF
type StudentProgressInput struct {
	StudentName     string
	StudentID       string
	SchoolName      string
	PeriodStartDate time.Time
	PeriodEndDate   time.Time
	Subjects        []SubjectGrade
	BehaviorNotes   string
	Summary         string
}

type SubjectGrade struct {
	SubjectName string
	Grade       string
	Teacher     string
}

// NewReportGenerator creates a new PDF report generator
func NewReportGenerator() *ReportGenerator {
	return &ReportGenerator{}
}

// GenerateGuidanceNotePDF creates a PDF from guidance note data
func (g *ReportGenerator) GenerateGuidanceNotePDF(input GuidanceNoteInput) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)

	// Header
	pdf.Cell(190, 10, input.SchoolName)
	pdf.Ln(15)

	// Title
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(190, 10, "Rehberlik Notu")
	pdf.Ln(10)

	// Student info
	pdf.SetFont("Arial", "", 11)
	pdf.Cell(95, 8, fmt.Sprintf("Öğrenci: %s", input.StudentName))
	pdf.Cell(95, 8, fmt.Sprintf("Tarih: %s", input.DateCreated.Format("02.01.2006")))
	pdf.Ln(10)

	pdf.Cell(95, 8, fmt.Sprintf("Kimlik No: %s", input.StudentID))
	pdf.Cell(95, 8, fmt.Sprintf("Rehber: %s", input.CounselorName))
	pdf.Ln(15)

	// Content
	pdf.SetFont("Arial", "", 10)
	pdf.MultiCell(190, 5, input.Content, "", "L", false)
	pdf.Ln(10)

	// Footer
	pdf.SetFont("Arial", "I", 9)
	pdf.Cell(190, 8, fmt.Sprintf("Gizlilik Seviyesi: %s", input.Confidentiality))

	// Generate to buffer
	buf := new(bytes.Buffer)
	if err := pdf.Output(buf); err != nil {
		return nil, fmt.Errorf("pdf generation failed: %w", err)
	}

	return buf.Bytes(), nil
}

// GenerateProgressReportPDF creates a PDF from student progress data
func (g *ReportGenerator) GenerateProgressReportPDF(input StudentProgressInput) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Header
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(190, 10, input.SchoolName)
	pdf.Ln(15)

	// Title
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(190, 10, "Dönemlik Başarı Raporu")
	pdf.Ln(10)

	// Student info
	pdf.SetFont("Arial", "", 11)
	pdf.Cell(95, 8, fmt.Sprintf("Öğrenci: %s", input.StudentName))
	pdf.Cell(95, 8, fmt.Sprintf("Kimlik: %s", input.StudentID))
	pdf.Ln(10)

	pdf.Cell(190, 8, fmt.Sprintf("Dönem: %s - %s",
		input.PeriodStartDate.Format("02.01.2006"),
		input.PeriodEndDate.Format("02.01.2006")))
	pdf.Ln(15)

	// Grades table
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(60, 8, "Ders")
	pdf.Cell(40, 8, "Not")
	pdf.Cell(90, 8, "Öğretmen")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 10)
	for _, sg := range input.Subjects {
		pdf.Cell(60, 8, sg.SubjectName)
		pdf.Cell(40, 8, sg.Grade)
		pdf.Cell(90, 8, sg.Teacher)
		pdf.Ln(8)
	}

	pdf.Ln(8)

	// Behavior notes
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(190, 8, "Davranış Notları:")
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 10)
	pdf.MultiCell(190, 5, input.BehaviorNotes, "", "L", false)
	pdf.Ln(10)

	// Summary
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(190, 8, "Özet:")
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 10)
	pdf.MultiCell(190, 5, input.Summary, "", "L", false)

	// Generate to buffer
	buf := new(bytes.Buffer)
	if err := pdf.Output(buf); err != nil {
		return nil, fmt.Errorf("pdf generation failed: %w", err)
	}

	return buf.Bytes(), nil
}

// GenerateReportMetadata creates metadata for a generated PDF
func GenerateReportMetadata(reportType, title, resourceType, resourceID string) map[string]interface{} {
	return map[string]interface{}{
		"reportType":      reportType,
		"reportTitle":     title,
		"generatedAt":     time.Now(),
		"generatedBy":     "system",
		"resourceType":    resourceType,
		"resourceID":      resourceID,
		"documentID":      uuid.New().String(),
		"version":         "1.0",
		"confidentiality": "staff",
	}
}
