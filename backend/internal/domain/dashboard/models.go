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
