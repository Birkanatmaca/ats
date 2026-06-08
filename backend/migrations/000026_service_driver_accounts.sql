ALTER TABLE service_staff
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sharing_status TEXT NOT NULL DEFAULT 'passive' CHECK (sharing_status IN ('active', 'passive')),
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
