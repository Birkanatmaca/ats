-- Service transportation module: vehicles, staff, routes, stops and student assignments

CREATE TABLE IF NOT EXISTS service_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plate TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    brand TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passive', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, plate)
);

CREATE INDEX IF NOT EXISTS idx_service_vehicles_tenant_status
    ON service_vehicles (tenant_id, status);

CREATE TABLE IF NOT EXISTS service_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL CHECK (role IN ('driver', 'attendant')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passive', 'archived')),
    sharing_status TEXT NOT NULL DEFAULT 'passive' CHECK (sharing_status IN ('active', 'passive')),
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_staff_tenant_role
    ON service_staff (tenant_id, role, status);

CREATE TABLE IF NOT EXISTS service_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('morning', 'evening', 'both')),
    vehicle_id UUID REFERENCES service_vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES service_staff(id) ON DELETE SET NULL,
    attendant_id UUID REFERENCES service_staff(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passive', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_routes_tenant_status
    ON service_routes (tenant_id, status, direction);

CREATE TABLE IF NOT EXISTS service_route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES service_routes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    planned_time TIME NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_service_route_stops_route
    ON service_route_stops (tenant_id, route_id, sort_order);

CREATE TABLE IF NOT EXISTS student_service_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES service_routes(id) ON DELETE RESTRICT,
    stop_id UUID REFERENCES service_route_stops(id) ON DELETE SET NULL,
    direction TEXT NOT NULL CHECK (direction IN ('morning', 'evening', 'both')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passive', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, student_id, direction)
);

CREATE INDEX IF NOT EXISTS idx_student_service_assignments_route
    ON student_service_assignments (tenant_id, route_id, status);

CREATE INDEX IF NOT EXISTS idx_student_service_assignments_student
    ON student_service_assignments (tenant_id, student_id, status);
