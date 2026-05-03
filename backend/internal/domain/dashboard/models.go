package dashboard

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
	ID       string `json:"id"`
	Title    string `json:"title"`
	Status   string `json:"status"`
	Priority string `json:"priority"`
}
