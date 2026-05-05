-- =============================================================
-- Migration 004: Comprehensive Schema & Data Integrity Fix
-- Fixes ALL NULL pointers, FK mismatches, missing columns,
-- broken triggers, and view discrepancies found in full audit.
-- Safe to run multiple times (fully idempotent).
-- =============================================================

-- ─── STEP 1: Ensure PostGIS + pg_trgm extensions ─────────────
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── STEP 2: Add missing columns to apartments ────────────────
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS osm_id       BIGINT;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS osm_type     TEXT;

UPDATE apartments SET updated_at = created_at WHERE updated_at IS NULL;

-- ─── STEP 3: Add missing columns to offices ───────────────────
ALTER TABLE offices ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE offices ADD COLUMN IF NOT EXISTS building_name  TEXT;
ALTER TABLE offices ADD COLUMN IF NOT EXISTS osm_id         BIGINT;
ALTER TABLE offices ADD COLUMN IF NOT EXISTS osm_type       TEXT;

UPDATE offices SET updated_at = created_at WHERE updated_at IS NULL;

-- ─── STEP 4: Add missing columns to routes ────────────────────
ALTER TABLE routes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE routes SET updated_at = created_at WHERE updated_at IS NULL;

-- ─── STEP 5: Add location column to stops (critical!) ─────────
ALTER TABLE stops ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Back-fill location for ALL stops that have lat/lng but NULL location
UPDATE stops
SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE location IS NULL AND lat IS NOT NULL AND lng IS NOT NULL;

-- ─── STEP 6: Add missing columns to survey_responses ──────────
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS data_consent BOOLEAN DEFAULT TRUE;

-- ─── STEP 7: Add route_id to bookings ─────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id);

-- Back-fill route_id from the onward shift
UPDATE bookings b
SET route_id = s.route_id
FROM shifts s
WHERE b.onward_shift_id = s.id AND b.route_id IS NULL;

-- ─── STEP 8: Fix offices selection_count integrity ────────────
-- Any office with NULL or 0 selection_count gets set to 1
UPDATE offices SET selection_count = 1
WHERE selection_count IS NULL OR selection_count < 1;

-- Fix source for manually-seeded offices (no place_id = not from Google)
UPDATE offices
SET source = 'manual'
WHERE source = 'google' AND (place_id IS NULL OR place_id = '');

-- ─── STEP 9: Enhanced stops → apartments FK linking ───────────
-- Strategy 1: Direct label match (case-insensitive)
UPDATE stops st
SET apartment_id = a.id
FROM apartments a
WHERE st.stop_type = 'pickup'
  AND st.apartment_id IS NULL
  AND (
    a.name ILIKE st.label
    OR st.label ILIKE '%' || a.name || '%'
    OR a.name ILIKE '%' || st.label || '%'
  );

-- Strategy 2: Strip common stop suffixes then match
UPDATE stops st
SET apartment_id = a.id
FROM apartments a
WHERE st.stop_type = 'pickup'
  AND st.apartment_id IS NULL
  AND (
    a.name ILIKE regexp_replace(st.label, '\s*(Gate|Main Gate|Entry|Exit|South Gate|North Gate|East Gate|West Gate)\s*$', '', 'i')
    OR regexp_replace(st.label, '\s*(Gate|Main Gate|Entry|Exit|South Gate|North Gate|East Gate|West Gate)\s*$', '', 'i') ILIKE '%' || a.name || '%'
    OR a.name ILIKE '%' || regexp_replace(st.label, '\s*(Gate|Main Gate|Entry|Exit)\s*$', '', 'i') || '%'
  );

-- ─── STEP 10: Enhanced stops → offices FK linking ─────────────
-- Strategy 1: Direct match
UPDATE stops st
SET office_id = o.id
FROM offices o
WHERE st.stop_type = 'drop'
  AND st.office_id IS NULL
  AND (
    o.name ILIKE st.label
    OR st.label ILIKE '%' || o.name || '%'
    OR o.name ILIKE '%' || st.label || '%'
  );

-- Strategy 2: Match before " — " separator (e.g. "Amazon — Main Gate" → "Amazon")
UPDATE stops st
SET office_id = o.id
FROM offices o
WHERE st.stop_type = 'drop'
  AND st.office_id IS NULL
  AND (
    o.name ILIKE split_part(st.label, ' — ', 1)
    OR split_part(st.label, ' — ', 1) ILIKE '%' || o.name || '%'
    OR o.name ILIKE '%' || split_part(st.label, ' — ', 1) || '%'
  );

-- Strategy 3: Match building_name
UPDATE stops st
SET office_id = o.id
FROM offices o
WHERE st.stop_type = 'drop'
  AND st.office_id IS NULL
  AND o.building_name IS NOT NULL
  AND (
    o.building_name ILIKE st.label
    OR st.label ILIKE '%' || o.building_name || '%'
    OR o.building_name ILIKE '%' || st.label || '%'
  );

-- ─── STEP 11: Release stale seat holds ───────────────────────
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT shift_id FROM seat_holds
    WHERE released = false AND expires_at < NOW()
  LOOP
    UPDATE seat_inventory si
    SET seats_held = GREATEST(
      si.seats_held - (
        SELECT COUNT(*) FROM seat_holds sh
        CROSS JOIN UNNEST(sh.dates) AS d(hold_date)
        WHERE sh.shift_id = rec.shift_id
          AND sh.released = false AND sh.expires_at < NOW()
          AND d.hold_date = si.date
      ), 0
    )
    WHERE si.shift_id = rec.shift_id;
  END LOOP;
END;
$$;

UPDATE seat_holds SET released = true WHERE released = false AND expires_at < NOW();

-- ─── STEP 12: Create/repair all triggers ─────────────────────

-- update_updated_at function (shared)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- users trigger
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- apartments trigger
DROP TRIGGER IF EXISTS apartments_updated_at ON apartments;
CREATE TRIGGER apartments_updated_at
  BEFORE UPDATE ON apartments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- offices trigger
DROP TRIGGER IF EXISTS offices_updated_at ON offices;
CREATE TRIGGER offices_updated_at
  BEFORE UPDATE ON offices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- routes trigger
DROP TRIGGER IF EXISTS routes_updated_at ON routes;
CREATE TRIGGER routes_updated_at
  BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- stops location auto-populate trigger
CREATE OR REPLACE FUNCTION stops_set_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stops_location ON stops;
CREATE TRIGGER trg_stops_location
  BEFORE INSERT OR UPDATE OF lat, lng ON stops
  FOR EACH ROW EXECUTE FUNCTION stops_set_location();

-- pending_locations auto-populate trigger
CREATE OR REPLACE FUNCTION pending_locations_set_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pending_locations_location ON pending_locations;
CREATE TRIGGER trg_pending_locations_location
  BEFORE INSERT OR UPDATE OF lat, lng ON pending_locations
  FOR EACH ROW EXECUTE FUNCTION pending_locations_set_location();

-- ─── STEP 13: Create missing tables (if 002 never ran) ────────

CREATE TABLE IF NOT EXISTS pending_locations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat            DOUBLE PRECISION NOT NULL,
  lng            DOUBLE PRECISION NOT NULL,
  location       GEOGRAPHY(POINT, 4326),
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  raw_address    TEXT,
  suggested_name TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'reviewed', 'merged', 'rejected')),
  merged_into    UUID REFERENCES apartments(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seat_holds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  shift_id    UUID NOT NULL REFERENCES shifts(id),
  dates       DATE[] NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  released    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── STEP 14: Rebuild all indexes ─────────────────────────────

-- stops
CREATE INDEX IF NOT EXISTS idx_stops_location    ON stops USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_stops_route       ON stops(route_id);
CREATE INDEX IF NOT EXISTS idx_stops_type        ON stops(stop_type);
CREATE INDEX IF NOT EXISTS idx_stops_apt         ON stops(apartment_id) WHERE apartment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stops_office      ON stops(office_id)    WHERE office_id IS NOT NULL;

-- pending_locations
CREATE INDEX IF NOT EXISTS idx_pending_locations_status ON pending_locations(status);
CREATE INDEX IF NOT EXISTS idx_pending_locations_user   ON pending_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_locations_loc    ON pending_locations USING GIST(location);

-- seat_holds
CREATE INDEX IF NOT EXISTS idx_seat_holds_user_shift ON seat_holds(user_id, shift_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_expires    ON seat_holds(expires_at) WHERE released = false;

-- bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user   ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_month  ON bookings(month_year);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_route  ON bookings(route_id);

-- offices building_name trgm index
CREATE INDEX IF NOT EXISTS idx_offices_building_name_trgm
  ON offices USING GIN(building_name gin_trgm_ops)
  WHERE building_name IS NOT NULL;

-- seat_inventory
CREATE INDEX IF NOT EXISTS idx_inventory_shift_date ON seat_inventory(shift_id, date);

-- ─── STEP 15: Rebuild views (correct date serialization) ──────

DROP VIEW IF EXISTS seat_availability;
CREATE VIEW seat_availability AS
SELECT
  si.id,
  si.shift_id,
  to_char(si.date, 'YYYY-MM-DD') AS date,   -- string, not JS Date object
  si.seats_total,
  si.seats_booked,
  si.seats_held,
  (si.seats_total - si.seats_booked - si.seats_held) AS seats_available,
  s.departure_time,
  s.direction,
  s.label        AS shift_label,
  s.bus_capacity,
  s.route_id
FROM seat_inventory si
JOIN shifts s ON si.shift_id = s.id;

CREATE OR REPLACE VIEW survey_od_matrix AS
SELECT
  COALESCE(a.area, 'Unknown') AS origin_area,
  COALESCE(o.area, 'Unknown') AS destination_area,
  sr.morning_band,
  sr.evening_band,
  COUNT(*)                    AS response_count,
  ARRAY_AGG(DISTINCT COALESCE(a.name, sr.apartment_name_raw))
    FILTER (WHERE COALESCE(a.name, sr.apartment_name_raw) IS NOT NULL) AS apartments,
  ARRAY_AGG(DISTINCT COALESCE(o.name, sr.office_name_raw))
    FILTER (WHERE COALESCE(o.name, sr.office_name_raw)    IS NOT NULL) AS offices
FROM survey_responses sr
LEFT JOIN apartments a ON sr.apartment_id = a.id
LEFT JOIN offices    o ON sr.office_id    = o.id
GROUP BY 1, 2, 3, 4
ORDER BY response_count DESC;

-- ─── VERIFICATION QUERIES (comment out after confirming) ───────
-- SELECT COUNT(*) FROM stops WHERE location IS NULL;          -- should be 0
-- SELECT COUNT(*) FROM offices WHERE selection_count < 1;     -- should be 0
-- SELECT COUNT(*) FROM seat_holds WHERE released=false AND expires_at<NOW(); -- 0
-- SELECT COUNT(*) FROM stops WHERE stop_type='pickup' AND apartment_id IS NULL; -- ideally 0
-- SELECT COUNT(*) FROM stops WHERE stop_type='drop'   AND office_id IS NULL;   -- ideally 0
