-- =============================================================
-- Migration 003: Schema fixes, data integrity corrections,
-- and production-readiness improvements.
-- Run ONCE against the NeonDB instance.
-- Safe to run multiple times (idempotent).
-- =============================================================

-- ─── FIX 1: STOPS TABLE ───────────────────────────────────────
-- Add a PostGIS GEOGRAPHY(POINT) column to stops for future
-- ETA calculations and geospatial queries (Stage 3 readiness).
ALTER TABLE stops
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Back-fill location from existing lat/lng on all stops
UPDATE stops
SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE location IS NULL AND lat IS NOT NULL AND lng IS NOT NULL;

-- Add GIST index for location-based queries on stops
CREATE INDEX IF NOT EXISTS idx_stops_location ON stops USING GIST(location);

-- Add trigger to auto-populate location on future INSERT/UPDATE
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

-- ─── FIX 2: OFFICES selection_count INTEGRITY ─────────────────
-- All manually-seeded offices were inserted with selection_count=0.
-- Per business logic, any record that exists counts as selected at
-- least once (it was seeded as a known, valid office). Set to 1.
UPDATE offices
SET selection_count = 1
WHERE selection_count = 0;

-- ─── FIX 3: CLEAN UP STALE SEAT_HOLDS ────────────────────────
-- Expired seat_holds that were never marked as released.
-- This occurs when the user closes the app mid-payment.
-- Redis TTL already removed the lock; we just need to sync the DB.

-- Step 3a: Release the held seats back into seat_inventory
-- for each distinct (shift_id) group of expired holds.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT shift_id
    FROM seat_holds
    WHERE released = false AND expires_at < NOW()
  LOOP
    -- Count how many expired-unreleased holds exist for this shift per date
    UPDATE seat_inventory si
    SET seats_held = GREATEST(
      si.seats_held - (
        SELECT COUNT(*)
        FROM seat_holds sh
        CROSS JOIN UNNEST(sh.dates) AS d(hold_date)
        WHERE sh.shift_id = rec.shift_id
          AND sh.released = false
          AND sh.expires_at < NOW()
          AND d.hold_date = si.date
      ),
      0
    )
    WHERE si.shift_id = rec.shift_id;
  END LOOP;
END;
$$;

-- Step 3b: Mark all expired holds as released
UPDATE seat_holds
SET released = true
WHERE released = false AND expires_at < NOW();

-- ─── FIX 4: STOPS linkage — match stops to apartments/offices ──
-- Link stop records to their apartment/office records where
-- the stop label matches the apartment/office name.
-- This fixes the NULL apartment_id / office_id on all pickup/drop stops.

-- Link pickup stops → apartments by label match (case-insensitive)
UPDATE stops st
SET apartment_id = a.id
FROM apartments a
WHERE st.stop_type = 'pickup'
  AND st.apartment_id IS NULL
  AND (
    a.name ILIKE st.label
    OR st.label ILIKE '%' || a.name || '%'
    OR a.name ILIKE '%' || st.label || '%'
  )
  AND EXISTS (
    SELECT 1 FROM routes r WHERE r.id = st.route_id
  );

-- Link drop stops → offices by label match (case-insensitive)
UPDATE stops st
SET office_id = o.id
FROM offices o
WHERE st.stop_type = 'drop'
  AND st.office_id IS NULL
  AND (
    o.name ILIKE st.label
    OR st.label ILIKE '%' || o.name || '%'
    OR o.name ILIKE '%' || st.label || '%'
  )
  AND EXISTS (
    SELECT 1 FROM routes r WHERE r.id = st.route_id
  );

-- ─── FIX 5: OFFICES default source correction ──────────────────
-- The schema default is 'google' but manually-seeded offices
-- that came from our seed scripts should be 'manual'.
-- Only fix offices that have NO place_id (they're not from Google).
UPDATE offices
SET source = 'manual'
WHERE source = 'google' AND (place_id IS NULL OR place_id = '');

-- ─── FIX 6: Add updated_at to routes (missing from schema) ─────
-- The UPDATE trigger for users uses updated_at; routes does not
-- have this column, making it impossible to know when a route
-- was last modified. Add it now.
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Back-fill updated_at = created_at for all existing routes
UPDATE routes SET updated_at = created_at WHERE updated_at IS NULL;

-- Add trigger for routes updated_at
DROP TRIGGER IF EXISTS routes_updated_at ON routes;
CREATE TRIGGER routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── FIX 7: Add updated_at to apartments (missing from schema) ──
ALTER TABLE apartments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE apartments SET updated_at = created_at WHERE updated_at IS NULL;

DROP TRIGGER IF EXISTS apartments_updated_at ON apartments;
CREATE TRIGGER apartments_updated_at
  BEFORE UPDATE ON apartments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── FIX 8: Add updated_at to offices (missing from schema) ─────
ALTER TABLE offices
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE offices SET updated_at = created_at WHERE updated_at IS NULL;

DROP TRIGGER IF EXISTS offices_updated_at ON offices;
CREATE TRIGGER offices_updated_at
  BEFORE UPDATE ON offices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── FIX 9: SURVEY RESPONSE — data_consent field ─────────────────
-- Requirements FR-SUR-16 and NFR-DAT-04 specify capturing user consent
-- for anonymised data sharing. This field is missing from the schema.
ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS data_consent BOOLEAN DEFAULT TRUE;

-- ─── FIX 10: BOOKINGS — add route_id for fast querying ───────────
-- Currently bookings join to routes via shifts. A direct route_id
-- on bookings eliminates this join for common queries.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id);

-- Back-fill route_id from onward_shift → routes linkage
UPDATE bookings b
SET route_id = s.route_id
FROM shifts s
WHERE b.onward_shift_id = s.id AND b.route_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_route ON bookings(route_id);

-- ─── REBUILD VIEWS (ensure they are up to date) ──────────────────

-- Refresh seat_availability view with updated column set
-- Must DROP first because we are adding new columns (cannot use CREATE OR REPLACE
-- when the existing view column list differs).
DROP VIEW IF EXISTS seat_availability;
CREATE VIEW seat_availability AS
SELECT
  si.id,
  si.shift_id,
  si.date,
  si.seats_total,
  si.seats_booked,
  si.seats_held,
  (si.seats_total - si.seats_booked - si.seats_held) AS seats_available,
  s.departure_time,
  s.direction,
  s.label AS shift_label,
  s.bus_capacity,
  s.route_id
FROM seat_inventory si
JOIN shifts s ON si.shift_id = s.id;

-- Refresh survey OD matrix view
CREATE OR REPLACE VIEW survey_od_matrix AS
SELECT
  COALESCE(a.area, 'Unknown') AS origin_area,
  COALESCE(o.area, 'Unknown') AS destination_area,
  sr.morning_band,
  sr.evening_band,
  COUNT(*) AS response_count,
  ARRAY_AGG(DISTINCT COALESCE(a.name, sr.apartment_name_raw)) FILTER (WHERE COALESCE(a.name, sr.apartment_name_raw) IS NOT NULL) AS apartments,
  ARRAY_AGG(DISTINCT COALESCE(o.name, sr.office_name_raw)) FILTER (WHERE COALESCE(o.name, sr.office_name_raw) IS NOT NULL) AS offices
FROM survey_responses sr
LEFT JOIN apartments a ON sr.apartment_id = a.id
LEFT JOIN offices o ON sr.office_id = o.id
GROUP BY 1, 2, 3, 4
ORDER BY response_count DESC;

-- ─── VERIFICATION QUERIES ─────────────────────────────────────────
-- Uncomment these to verify after running:
-- SELECT COUNT(*) FROM seat_holds WHERE released = false AND expires_at < NOW(); -- should be 0
-- SELECT COUNT(*) FROM offices WHERE selection_count = 0; -- should be 0
-- SELECT COUNT(*) FROM stops WHERE location IS NULL; -- should be 0
-- SELECT column_name FROM information_schema.columns WHERE table_name='stops' AND column_name='location'; -- should exist
