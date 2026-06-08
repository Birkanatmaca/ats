-- Live service tracking: trip sessions, location points and operational events.

CREATE TABLE IF NOT EXISTS service_trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES service_routes(id) ON DELETE RESTRICT,
    driver_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    driver_staff_id UUID NOT NULL REFERENCES service_staff(id) ON DELETE RESTRICT,
    direction TEXT NOT NULL CHECK (direction IN ('morning', 'evening', 'both')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'canceled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_trips_tenant_status
    ON service_trips (tenant_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_trips_driver_active
    ON service_trips (tenant_id, driver_user_id)
    WHERE status = 'active';

CREATE TABLE IF NOT EXISTS service_trip_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES service_trips(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    accuracy_meters DOUBLE PRECISION NOT NULL DEFAULT 0,
    speed_kph DOUBLE PRECISION NOT NULL DEFAULT 0,
    heading_degrees DOUBLE PRECISION NOT NULL DEFAULT 0,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_trip_locations_trip_time
    ON service_trip_locations (tenant_id, trip_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS service_trip_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES service_trips(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_trip_events_trip_time
    ON service_trip_events (tenant_id, trip_id, created_at DESC);

-- Atlas demo transport seed for local/mobile smoke tests.
INSERT INTO roles (id, tenant_id, code, name)
VALUES (
    '00000000-0000-0000-0000-000000010305',
    '00000000-0000-0000-0000-000000010001',
    'driver',
    'Şoför'
)
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO users (id, email, password_hash, full_name, is_active, must_change_password)
VALUES (
    '00000000-0000-0000-0000-000000010114',
    'sofor@atlas.k12.tr',
    'sha256$ots-default-driver$e82b322787205a3a448eabe1eb6a83b50ac9287020b4291ba1b14e0af509975b',
    'Mehmet Yalçın',
    true,
    false
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO tenant_memberships (id, tenant_id, user_id, status)
VALUES (
    '00000000-0000-0000-0000-000000010214',
    '00000000-0000-0000-0000-000000010001',
    '00000000-0000-0000-0000-000000010114',
    'active'
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;

INSERT INTO user_roles (tenant_id, user_id, role_id)
VALUES (
    '00000000-0000-0000-0000-000000010001',
    '00000000-0000-0000-0000-000000010114',
    '00000000-0000-0000-0000-000000010305'
)
ON CONFLICT DO NOTHING;

INSERT INTO service_vehicles (id, tenant_id, plate, capacity, brand, model, status)
VALUES (
    '00000000-0000-0000-0000-000000010901',
    '00000000-0000-0000-0000-000000010001',
    '34 OTS 101',
    1,
    'Ford',
    'Transit',
    'active'
)
ON CONFLICT (tenant_id, plate) DO NOTHING;

INSERT INTO service_staff (id, tenant_id, user_id, full_name, phone, role, status, sharing_status)
VALUES
    (
        '00000000-0000-0000-0000-000000010911',
        '00000000-0000-0000-0000-000000010001',
        '00000000-0000-0000-0000-000000010114',
        'Mehmet Yalçın',
        '+90 555 010 1010',
        'driver',
        'active',
        'passive'
    ),
    (
        '00000000-0000-0000-0000-000000010912',
        '00000000-0000-0000-0000-000000010001',
        NULL,
        'Zeynep Güneş',
        '+90 555 010 2020',
        'attendant',
        'active',
        'passive'
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_routes (id, tenant_id, name, direction, vehicle_id, driver_id, attendant_id, status)
VALUES (
    '00000000-0000-0000-0000-000000010921',
    '00000000-0000-0000-0000-000000010001',
    '5/A Sabah Servisi',
    'morning',
    '00000000-0000-0000-0000-000000010901',
    '00000000-0000-0000-0000-000000010911',
    '00000000-0000-0000-0000-000000010912',
    'active'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_route_stops (id, tenant_id, route_id, name, planned_time, sort_order)
VALUES
    (
        '00000000-0000-0000-0000-000000010931',
        '00000000-0000-0000-0000-000000010001',
        '00000000-0000-0000-0000-000000010921',
        'Ataşehir Meydan',
        TIME '07:35',
        1
    ),
    (
        '00000000-0000-0000-0000-000000010932',
        '00000000-0000-0000-0000-000000010001',
        '00000000-0000-0000-0000-000000010921',
        'Okul Kapısı',
        TIME '08:05',
        2
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO student_service_assignments (id, tenant_id, student_id, route_id, stop_id, direction, status)
VALUES (
    '00000000-0000-0000-0000-000000010941',
    '00000000-0000-0000-0000-000000010001',
    '00000000-0000-0000-0100-000000000002',
    '00000000-0000-0000-0000-000000010921',
    '00000000-0000-0000-0000-000000010931',
    'morning',
    'active'
)
ON CONFLICT (tenant_id, student_id, direction) DO NOTHING;
