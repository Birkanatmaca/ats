ALTER TABLE service_route_stops
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Atlas demo route stops (Istanbul-ish coordinates for live tracking smoke).
UPDATE service_route_stops
SET latitude = 41.0150, longitude = 28.9790
WHERE id = '00000000-0000-0000-0000-000000010401';

UPDATE service_route_stops
SET latitude = 41.0185, longitude = 28.9845
WHERE id = '00000000-0000-0000-0000-000000010402';

UPDATE service_route_stops
SET latitude = 41.0220, longitude = 28.9900
WHERE id = '00000000-0000-0000-0000-000000010403';
