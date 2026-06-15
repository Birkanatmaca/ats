package dashboard

import "time"

type PrincipalSummary struct {
	ActiveStudents          int               `json:"activeStudents"`
	ActiveTeachers          int               `json:"activeTeachers"`
	Classes                 int               `json:"classes"`
	TodayLessons            int               `json:"todayLessons"`
	AttendanceCompletionPct int               `json:"attendanceCompletionPct"`
	AbsentToday             int               `json:"absentToday"`
	OpenObservationSignals  int               `json:"openObservationSignals"`
	ClassAttendance         []ClassAttendance `json:"classAttendance"`
	Operations              []OperationItem   `json:"operations"`
}

type ClassAttendance struct {
	ClassName     string `json:"className"`
	Completed     int    `json:"completed"`
	Total         int    `json:"total"`
	Absent        int    `json:"absent"`
	AttentionNeed string `json:"attentionNeed"`
}

type OperationItem struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Status     string `json:"status"`
	Priority   string `json:"priority"`
	Kind       string `json:"kind,omitempty"`
	TargetPath string `json:"targetPath,omitempty"`
}

type ClassSummary struct {
	ClassID                 string `json:"classId"`
	ClassName               string `json:"className"`
	Date                    string `json:"date"`
	LessonsTotal            int    `json:"lessonsTotal"`
	LessonsCompleted        int    `json:"lessonsCompleted"`
	AttendanceCompletionPct int    `json:"attendanceCompletionPct"`
	AbsentCount             int    `json:"absentCount"`
	StudentsTotal           int    `json:"studentsTotal"`
}

type PrincipalReportOverview struct {
	From        string                   `json:"from"`
	To          string                   `json:"to"`
	GeneratedAt time.Time                `json:"generatedAt"`
	Attendance  ReportAttendanceOverview `json:"attendance"`
	Billing     ReportBillingOverview    `json:"billing"`
	Guidance    ReportGuidanceOverview   `json:"guidance"`
	Transport   ReportTransportOverview  `json:"transport"`
}

type ReportAttendanceOverview struct {
	Sessions          int                     `json:"sessions"`
	FinalizedSessions int                     `json:"finalizedSessions"`
	Present           int                     `json:"present"`
	Absent            int                     `json:"absent"`
	Late              int                     `json:"late"`
	Excused           int                     `json:"excused"`
	CompletionPct     int                     `json:"completionPct"`
	Daily             []ReportAttendanceDaily `json:"daily"`
}

type ReportAttendanceDaily struct {
	Date              string `json:"date"`
	Sessions          int    `json:"sessions"`
	FinalizedSessions int    `json:"finalizedSessions"`
	Absent            int    `json:"absent"`
	Late              int    `json:"late"`
}

type ReportBillingOverview struct {
	CollectedAmount float64 `json:"collectedAmount"`
	PaymentCount    int     `json:"paymentCount"`
	OverdueAmount   float64 `json:"overdueAmount"`
	OverdueCount    int     `json:"overdueCount"`
	UpcomingAmount  float64 `json:"upcomingAmount"`
	UpcomingCount   int     `json:"upcomingCount"`
	Currency        string  `json:"currency"`
}

type ReportGuidanceOverview struct {
	OpenCases        int `json:"openCases"`
	MonitoringCases  int `json:"monitoringCases"`
	ClosedCases      int `json:"closedCases"`
	HighPriorityOpen int `json:"highPriorityOpen"`
	NewCases         int `json:"newCases"`
	Events           int `json:"events"`
}

type ReportTransportOverview struct {
	Trips          int `json:"trips"`
	CompletedTrips int `json:"completedTrips"`
	ActiveTrips    int `json:"activeTrips"`
	Events         int `json:"events"`
	DelayEvents    int `json:"delayEvents"`
	IncidentEvents int `json:"incidentEvents"`
}
