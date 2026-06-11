package guardian

import (
	"context"
	"time"
)

// StudentListItem represents a student visible to a guardian
type StudentListItem struct {
	StudentID       string    `json:"studentId"`
	FirstName       string    `json:"firstName"`
	LastName        string    `json:"lastName"`
	Email           string    `json:"email"`
	ClassCode       string    `json:"classCode"`
	ClassTeacher    string    `json:"classTeacher"`
	ProfileImageURL string    `json:"profileImageUrl,omitempty"`
	LastActiveAt    time.Time `json:"lastActiveAt"`
	Status          string    `json:"status"` // "active", "inactive", "graduated"
}

// DocumentListItem represents a file/document accessible to guardian
type DocumentListItem struct {
	DocumentID     string    `json:"documentId"`
	FileKey        string    `json:"fileKey"`
	FileName       string    `json:"fileName"`
	DocumentType   string    `json:"documentType"` // "progress_report", "guidance_note", "ticket_file"
	RelatedStudent string    `json:"relatedStudent"`
	UploadedAt     time.Time `json:"uploadedAt"`
	URL            string    `json:"url"`
}

// MobileDashboardData aggregates all data for guardian mobile dashboard
type MobileDashboardData struct {
	Guardian          *GuardianProfile   `json:"guardian"`
	Students          []StudentListItem  `json:"students"`
	RecentDocuments   []DocumentListItem `json:"recentDocuments"`
	NotificationCount int                `json:"notificationCount"`
	LastSyncedAt      time.Time          `json:"lastSyncedAt"`
}

// GuardianProfile represents parent/guardian profile
type GuardianProfile struct {
	UserID       string `json:"userId"`
	FirstName    string `json:"firstName"`
	LastName     string `json:"lastName"`
	Email        string `json:"email"`
	PhoneNumber  string `json:"phoneNumber,omitempty"`
	ProfileImage string `json:"profileImage,omitempty"`
	Relationship string `json:"relationship"` // "mother", "father", "guardian"
}

// MobileDashboardService provides guardian mobile dashboard operations
type MobileDashboardService struct {
	// Dependencies will be injected
}

// NewMobileDashboardService creates a new guardian mobile dashboard service
func NewMobileDashboardService() *MobileDashboardService {
	return &MobileDashboardService{}
}

// GetDashboardData retrieves all data needed for guardian mobile dashboard
func (s *MobileDashboardService) GetDashboardData(
	ctx context.Context,
	guardianID string,
	tenantID string,
) (*MobileDashboardData, error) {
	// Placeholder implementation - to be replaced with actual data aggregation

	profile := &GuardianProfile{
		UserID:       guardianID,
		FirstName:    "Veli",
		LastName:     "Örnek",
		Email:        "veli@example.com",
		Relationship: "mother",
	}

	students := []StudentListItem{
		{
			StudentID:    "student-1",
			FirstName:    "Ahmet",
			LastName:     "Örnek",
			Email:        "ahmet@example.com",
			ClassCode:    "9-A",
			ClassTeacher: "Öğretmen Adı",
			LastActiveAt: time.Now().Add(-2 * time.Hour),
			Status:       "active",
		},
	}

	documents := []DocumentListItem{
		{
			DocumentID:     "doc-1",
			FileKey:        "tenant-1/guidance/2026/06/abc123.pdf",
			FileName:       "rehberlik_notu.pdf",
			DocumentType:   "guidance_note",
			RelatedStudent: "student-1",
			UploadedAt:     time.Now().Add(-24 * time.Hour),
			URL:            "/api/v1/files/tenant-1/guidance/2026/06/abc123.pdf",
		},
	}

	return &MobileDashboardData{
		Guardian:          profile,
		Students:          students,
		RecentDocuments:   documents,
		NotificationCount: 3,
		LastSyncedAt:      time.Now(),
	}, nil
}

// GetStudentDocuments retrieves all documents for a specific student
func (s *MobileDashboardService) GetStudentDocuments(
	ctx context.Context,
	guardianID, tenantID, studentID string,
	limit int,
) ([]DocumentListItem, error) {
	// Placeholder - documents fetched from file storage based on resource_type and resource_id

	return []DocumentListItem{
		{
			DocumentID:     "doc-1",
			FileKey:        "tenant-1/guidance/2026/06/abc123.pdf",
			FileName:       "rehberlik_notu.pdf",
			DocumentType:   "guidance_note",
			RelatedStudent: studentID,
			UploadedAt:     time.Now().Add(-1 * time.Hour),
			URL:            "/api/v1/files/tenant-1/guidance/2026/06/abc123.pdf",
		},
	}, nil
}

// StudentAttendanceSummary for quick dashboard view
type StudentAttendanceSummary struct {
	StudentID      string     `json:"studentId"`
	AttendanceRate float32    `json:"attendanceRate"` // 0.0-1.0
	AbsentDays     int        `json:"absentDays"`
	LateArrivals   int        `json:"lateArrivals"`
	LastAbsentDate *time.Time `json:"lastAbsentDate,omitempty"`
}

// GetStudentAttendanceSummary provides quick attendance overview
func (s *MobileDashboardService) GetStudentAttendanceSummary(
	ctx context.Context,
	tenantID, studentID string,
) (*StudentAttendanceSummary, error) {
	// Placeholder - will query attendance data

	return &StudentAttendanceSummary{
		StudentID:      studentID,
		AttendanceRate: 0.95,
		AbsentDays:     2,
		LateArrivals:   1,
	}, nil
}

// StudentGuidanceStatus for support/counseling info
type StudentGuidanceStatus struct {
	StudentID             string     `json:"studentId"`
	HasOpenCase           bool       `json:"hasOpenCase"`
	RiskLevel             string     `json:"riskLevel"` // "low", "medium", "high"
	LastCounselorNote     string     `json:"lastCounselorNote,omitempty"`
	LastCounselorNoteDate *time.Time `json:"lastCounselorNoteDate,omitempty"`
}

// GetStudentGuidanceStatus provides counseling/support status
func (s *MobileDashboardService) GetStudentGuidanceStatus(
	ctx context.Context,
	tenantID, studentID string,
) (*StudentGuidanceStatus, error) {
	// Placeholder - will query guidance cases

	return &StudentGuidanceStatus{
		StudentID:   studentID,
		HasOpenCase: false,
		RiskLevel:   "low",
	}, nil
}
