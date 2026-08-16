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

type TeacherOverview struct {
	From           string                    `json:"from"`
	To             string                    `json:"to"`
	GeneratedAt    time.Time                 `json:"generatedAt"`
	Teacher        TeacherOverviewProfile    `json:"teacher"`
	Workload       TeacherWorkload           `json:"workload"`
	Attendance     TeacherAttendanceOverview `json:"attendance"`
	Classes        []TeacherClassBreakdown   `json:"classes"`
	Lessons        []TeacherLessonSlot       `json:"lessons"`
	RecentSessions []TeacherRecentSession    `json:"recentSessions"`
}

type TeacherOverviewProfile struct {
	ID                 string    `json:"id"`
	UserID             string    `json:"userId"`
	FullName           string    `json:"fullName"`
	Email              string    `json:"email"`
	Phone              string    `json:"phone,omitempty"`
	Title              string    `json:"title"`
	Status             string    `json:"status"`
	MustChangePassword bool      `json:"mustChangePassword"`
	CreatedAt          time.Time `json:"createdAt"`
}

type TeacherWorkload struct {
	WeeklyLessons int      `json:"weeklyLessons"`
	WeeklyMinutes int      `json:"weeklyMinutes"`
	ClassCount    int      `json:"classCount"`
	SubjectCount  int      `json:"subjectCount"`
	Subjects      []string `json:"subjects"`
}

type TeacherAttendanceOverview struct {
	TodayLessons       int                     `json:"todayLessons"`
	TodayFinalized     int                     `json:"todayFinalized"`
	TodayCompletionPct int                     `json:"todayCompletionPct"`
	Sessions           int                     `json:"sessions"`
	FinalizedSessions  int                     `json:"finalizedSessions"`
	CompletionPct      int                     `json:"completionPct"`
	Present            int                     `json:"present"`
	Absent             int                     `json:"absent"`
	Late               int                     `json:"late"`
	Excused            int                     `json:"excused"`
	PresencePct        int                     `json:"presencePct"`
	Daily              []ReportAttendanceDaily `json:"daily"`
}

type TeacherClassBreakdown struct {
	ClassID       string `json:"classId"`
	ClassName     string `json:"className"`
	WeeklyLessons int    `json:"weeklyLessons"`
	Sessions      int    `json:"sessions"`
	Finalized     int    `json:"finalized"`
	Present       int    `json:"present"`
	Absent        int    `json:"absent"`
	Late          int    `json:"late"`
	PresencePct   int    `json:"presencePct"`
}

type TeacherLessonSlot struct {
	ID          string `json:"id"`
	ClassID     string `json:"classId"`
	ClassName   string `json:"className"`
	SubjectName string `json:"subjectName"`
	DayOfWeek   int    `json:"dayOfWeek"`
	StartTime   string `json:"startTime"`
	EndTime     string `json:"endTime"`
	Room        string `json:"room"`
}

type TeacherRecentSession struct {
	ID           string     `json:"id"`
	LessonID     string     `json:"lessonId"`
	ClassName    string     `json:"className"`
	SubjectName  string     `json:"subjectName"`
	StartedAt    time.Time  `json:"startedAt"`
	FinalizedAt  *time.Time `json:"finalizedAt,omitempty"`
	Present      int        `json:"present"`
	Absent       int        `json:"absent"`
	Late         int        `json:"late"`
	Excused      int        `json:"excused"`
	StudentCount int        `json:"studentCount"`
}
