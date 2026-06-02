package handlers

import (
	"sync"
	"time"

	attendanceDomain "ots/backend/internal/domain/attendance"
)

type idempotencyRecord struct {
	session attendanceDomain.Session
	at      time.Time
}

var (
	idempotencyMu    sync.Mutex
	idempotencyCache = map[string]idempotencyRecord{}
)

func idempotencyCacheKey(tenantID, sessionID, key string) string {
	return tenantID + ":" + sessionID + ":" + key
}

func lookupIdempotentSession(cacheKey string) (attendanceDomain.Session, bool) {
	idempotencyMu.Lock()
	defer idempotencyMu.Unlock()
	pruneIdempotencyCacheLocked()
	record, ok := idempotencyCache[cacheKey]
	if !ok {
		return attendanceDomain.Session{}, false
	}
	return record.session, true
}

func rememberIdempotentSession(cacheKey string, session attendanceDomain.Session) {
	idempotencyMu.Lock()
	defer idempotencyMu.Unlock()
	idempotencyCache[cacheKey] = idempotencyRecord{session: session, at: time.Now()}
	pruneIdempotencyCacheLocked()
}

func pruneIdempotencyCacheLocked() {
	cutoff := time.Now().Add(-24 * time.Hour)
	for key, record := range idempotencyCache {
		if record.at.Before(cutoff) {
			delete(idempotencyCache, key)
		}
	}
}
