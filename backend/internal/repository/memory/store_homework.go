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
	mu          sync.RWMutex
	assignments []domain.Assignment
	submissions []domain.Submission
	clock       func() time.Time
}

func NewHomeworkStore(clock func() time.Time) *HomeworkStore {
	if clock == nil {
		clock = time.Now
	}
	return &HomeworkStore{clock: clock}
}

func (h *HomeworkStore) CreateAssignment(_ context.Context, item domain.Assignment) (domain.Assignment, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	item.ID = fmt.Sprintf("hw-%d", h.clock().UnixNano())
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
	sub.ID = fmt.Sprintf("hws-%d", h.clock().UnixNano())
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
