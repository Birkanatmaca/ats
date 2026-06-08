-- School life module: meal menus, study sessions, study attendance, clubs and memberships

CREATE TABLE IF NOT EXISTS meal_menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'snack')),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    allergens JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, date, meal_type)
);

CREATE INDEX IF NOT EXISTS idx_meal_menus_tenant_date
    ON meal_menus (tenant_id, date, meal_type);

CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    teacher_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passive', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_tenant_time
    ON study_sessions (tenant_id, status, starts_at);

CREATE INDEX IF NOT EXISTS idx_study_sessions_teacher
    ON study_sessions (tenant_id, teacher_user_id, status);

CREATE TABLE IF NOT EXISTS study_session_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('attended', 'absent', 'excused')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_study_session_attendance_session
    ON study_session_attendance (tenant_id, session_id, status);

CREATE INDEX IF NOT EXISTS idx_study_session_attendance_student
    ON study_session_attendance (tenant_id, student_id, status);

CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    advisor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passive', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_clubs_tenant_status
    ON clubs (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_clubs_advisor
    ON clubs (tenant_id, advisor_user_id, status);

CREATE TABLE IF NOT EXISTS club_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'waitlisted', 'left')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, club_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_club_memberships_club
    ON club_memberships (tenant_id, club_id, status);

CREATE INDEX IF NOT EXISTS idx_club_memberships_student
    ON club_memberships (tenant_id, student_id, status);
