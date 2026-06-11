package transport

import (
	"testing"
	"time"
)

func TestPlannedStopWindow(t *testing.T) {
	at := time.Date(2026, 6, 8, 7, 30, 0, 0, time.Local)
	if !plannedStopWindow("07:35", at) {
		t.Fatal("expected stop within approaching window")
	}
	if plannedStopWindow("09:00", at) {
		t.Fatal("expected distant stop to be outside window")
	}
}
