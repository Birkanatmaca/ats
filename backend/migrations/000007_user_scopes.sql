-- Kullanıcı kapsamı: sınıf veya öğrenci bazlı erişim (öğretmen, rehberlik vb.)
CREATE TABLE IF NOT EXISTS user_scopes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('all', 'class', 'student')),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_scopes_target_check CHECK (
        (scope_type = 'all' AND class_id IS NULL AND student_id IS NULL)
        OR (scope_type = 'class' AND class_id IS NOT NULL)
        OR (scope_type = 'student' AND student_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_user_scopes_tenant_user ON user_scopes (tenant_id, user_id);
