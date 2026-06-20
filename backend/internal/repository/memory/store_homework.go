package memory

import (
	"context"
	"fmt"
	"sync"
	"time"

	domain "ots/backend/internal/domain/homework"
)

// HomeworkStore is an in-memory implementation of homework.Repository.
type HomeworkStore struct {
	mu             sync.RWMutex
	assignments    []domain.Assignment
	submissions    []domain.Submission
	studentClass   map[string]string
	teacherClasses map[string]map[string]struct{}
	clock          func() time.Time
}

func NewHomeworkStore(clock func() time.Time) *HomeworkStore {
	if clock == nil {
		clock = time.Now
	}
	return &HomeworkStore{clock: clock, studentClass: make(map[string]string), teacherClasses: make(map[string]map[string]struct{})}
}

func NewSeededHomeworkStore(source *Store, clock func() time.Time) *HomeworkStore {
	store := NewHomeworkStore(clock)
	if source == nil {
		return store
	}

	source.mu.RLock()
	studentClasses := make(map[string]string, len(source.students))
	for _, student := range source.students {
		if student.ID != "" && student.ClassID != "" {
			studentClasses[student.ID] = student.ClassID
		}
	}
	teacherClasses := make(map[string]map[string]struct{})
	collectLesson := func(teacherID, classID string) {
		if teacherID == "" || classID == "" {
			return
		}
		if teacherClasses[teacherID] == nil {
			teacherClasses[teacherID] = map[string]struct{}{}
		}
		teacherClasses[teacherID][classID] = struct{}{}
	}
	for _, lesson := range source.schedule.Lessons {
		collectLesson(lesson.TeacherID, lesson.ClassID)
	}
	for _, schedule := range source.schedules {
		for _, lesson := range schedule.Lessons {
			collectLesson(lesson.TeacherID, lesson.ClassID)
		}
	}
	source.mu.RUnlock()

	store.mu.Lock()
	store.studentClass = studentClasses
	store.teacherClasses = teacherClasses
	store.mu.Unlock()
	return store
}

func (h *HomeworkStore) BindStudentToClass(studentID, classID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.studentClass[studentID] = classID
}

func (h *HomeworkStore) BindTeacherToClass(teacherUserID, classID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.teacherClasses[teacherUserID] == nil {
		h.teacherClasses[teacherUserID] = map[string]struct{}{}
	}
	h.teacherClasses[teacherUserID][classID] = struct{}{}
}

func (h *HomeworkStore) CreateAssignment(_ context.Context, item domain.Assignment) (domain.Assignment, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	item.ID = fmt.Sprintf("hw-%d", len(h.assignments)+1)
	h.assignments = append([]domain.Assignment{item}, h.assignments...)
	return item, nil
}

func (h *HomeworkStore) ListAssignments(_ context.Context, tenantID, classID string) ([]domain.Assignment, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	out := make([]domain.Assignment, 0, len(h.assignments))
	for _, a := range h.assignments {
		if a.TenantID != tenantID {
			continue
		}
		if classID != "" && a.ClassID != classID {
			continue
		}
		a.SubmissionCount = h.countLocked(a.ID)
		out = append(out, a)
	}
	return out, nil
}

func (h *HomeworkStore) GetAssignment(_ context.Context, tenantID, assignmentID string) (domain.Assignment, bool, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, a := range h.assignments {
		if a.TenantID == tenantID && a.ID == assignmentID {
			a.SubmissionCount = h.countLocked(a.ID)
			return a, true, nil
		}
	}
	return domain.Assignment{}, false, nil
}

func (h *HomeworkStore) SubmitAssignment(_ context.Context, sub domain.Submission) (domain.Submission, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	sub.ID = fmt.Sprintf("hws-%d", len(h.submissions)+1)
	// upsert: replace if same student+assignment
	for i, s := range h.submissions {
		if s.TenantID == sub.TenantID && s.AssignmentID == sub.AssignmentID && s.StudentID == sub.StudentID {
			h.submissions[i] = sub
			return sub, nil
		}
	}
	h.submissions = append([]domain.Submission{sub}, h.submissions...)
	return sub, nil
}

func (h *HomeworkStore) CountSubmissions(_ context.Context, tenantID, assignmentID string) (int, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.countLocked(assignmentID), nil
}

func (h *HomeworkStore) TeacherCanManageClass(_ context.Context, _, teacherUserID, classID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if len(h.teacherClasses) == 0 {
		return true
	}
	classes, ok := h.teacherClasses[teacherUserID]
	if !ok {
		return false
	}
	_, ok = classes[classID]
	return ok
}

func (h *HomeworkStore) StudentCurrentClassID(_ context.Context, _, studentID string) (string, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	classID, ok := h.studentClass[studentID]
	return classID, ok && classID != ""
}

func (h *HomeworkStore) StudentCanAccessAssignment(_ context.Context, _, studentID, assignmentID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	assignmentClassID := ""
	for _, a := range h.assignments {
		if a.ID == assignmentID {
			assignmentClassID = a.ClassID
			break
		}
	}
	if assignmentClassID == "" {
		return false
	}
	studentClassID, ok := h.studentClass[studentID]
	if !ok || studentClassID == "" {
		return true
	}
	return studentClassID == assignmentClassID
}

func (h *HomeworkStore) RecordHomeworkAudit(_ context.Context, _, _, _, _, _ string) {}

func (h *HomeworkStore) countLocked(assignmentID string) int {
	n := 0
	for _, s := range h.submissions {
		if s.AssignmentID == assignmentID {
			n++
		}
	}
	return n
}
