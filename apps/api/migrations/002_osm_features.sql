-- =============================================================
-- Migration 002: OSM Integration Features
-- Adds building_name to offices (second search key),
-- osm_id tracking columns, and pending_locations table
-- for GPS hits that don't match any known apartment polygon.
-- =============================================================

-- 1. Add building_name to offices (second search key for OSM)
--    e.g. office name = "Amazon" but building = "Galleria Corporate Centre"
ALTER TABLE offices
  ADD COLUMN IF NOT EXISTS building_name TEXT;

CREATE INDEX IF NOT EXISTS idx_offices_building_name_trgm
  ON offices USING GIN(building_name gin_trgm_ops);

-- 2. Add OSM tracking columns to apartments
ALTER TABLE apartments
  ADD COLUMN IF NOT EXISTS osm_id     BIGINT,
  ADD COLUMN IF NOT EXISTS osm_type   TEXT;   -- 'way' | 'relation'

-- 3. Add OSM tracking columns to offices
ALTER TABLE offices
  ADD COLUMN IF NOT EXISTS osm_id     BIGINT,
  ADD COLUMN IF NOT EXISTS osm_type   TEXT;

-- 4. Pending locations: GPS hits that didn't match any apartment polygon
--    Admin reviews these to merge into the apartments table.
CREATE TABLE IF NOT EXISTS pending_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  location        GEOGRAPHY(POINT, 4326),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  raw_address     TEXT,          -- reverse-geocoded via OSM Nominatim
  suggested_name  TEXT,          -- user-typed name from "suggest" fallback
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'reviewed', 'merged', 'rejected')),
  merged_into     UUID REFERENCES apartments(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-populate location from lat/lng via trigger
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

CREATE INDEX IF NOT EXISTS idx_pending_locations_status  ON pending_locations(status);
CREATE INDEX IF NOT EXISTS idx_pending_locations_user    ON pending_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_locations_loc     ON pending_locations USING GIST(location);
