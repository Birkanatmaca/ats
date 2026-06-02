package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"sort"
	"strings"

	attendanceDomain "ots/backend/internal/domain/attendance"
)

func attendanceSessionVersion(session attendanceDomain.Session) string {
	parts := make([]string, 0, len(session.Records))
	for _, record := range session.Records {
		parts = append(parts, record.StudentID+":"+string(record.Status))
	}
	sort.Strings(parts)
	sum := sha256.Sum256([]byte(strings.Join(parts, "|")))
	return hex.EncodeToString(sum[:8])
}
