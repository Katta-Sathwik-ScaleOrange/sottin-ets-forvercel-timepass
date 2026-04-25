-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For fuzzy text search

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id     TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'rider' CHECK (role IN ('rider', 'admin', 'ops')),
  whatsapp_opt  BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- APARTMENTS
-- Seeded from script. Users can suggest new ones.
-- ============================================================
CREATE TABLE IF NOT EXISTS apartments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  aliases         TEXT[],
  area            TEXT NOT NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  location        GEOGRAPHY(POINT, 4326),
  polygon         GEOGRAPHY(POLYGON, 4326),
  place_id        TEXT,
  verified        BOOLEAN DEFAULT FALSE,
  suggested_by    UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apartments_location ON apartments USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_apartments_polygon ON apartments USING GIST(polygon);
CREATE INDEX IF NOT EXISTS idx_apartments_name_trgm ON apartments USING GIN(name gin_trgm_ops);

-- ============================================================
-- OFFICES
-- Grows via user submissions. Cached after first selection.
-- ============================================================
CREATE TABLE IF NOT EXISTS offices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  short_name      TEXT,
  aliases         TEXT[],
  area            TEXT NOT NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  location        GEOGRAPHY(POINT, 4326),
  polygon         GEOGRAPHY(POLYGON, 4326),
  place_id        TEXT UNIQUE,
  gates           JSONB DEFAULT '[]',
  source          TEXT DEFAULT 'google'
                  CHECK (source IN ('google', 'manual')),
  verified        BOOLEAN DEFAULT FALSE,
  selection_count INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offices_location ON offices USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_offices_name_trgm ON offices USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_offices_selection_count ON offices(selection_count DESC);

-- ============================================================
-- ROUTES
-- Created by admin after survey analysis
-- ============================================================
CREATE TABLE IF NOT EXISTS routes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  origin_area     TEXT NOT NULL,
  destination_area TEXT NOT NULL,
  status          TEXT DEFAULT 'draft'
                  CHECK (status IN ('draft', 'active', 'paused', 'retired')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STOPS
-- Ordered pickup/drop points per route
-- ============================================================
CREATE TABLE IF NOT EXISTS stops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id        UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_type       TEXT NOT NULL CHECK (stop_type IN ('pickup', 'drop')),
  apartment_id    UUID REFERENCES apartments(id),
  office_id       UUID REFERENCES offices(id),
  label           TEXT NOT NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  sequence        INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, sequence)
);

-- ============================================================
-- SHIFTS
-- A shift = one direction of travel at a specific time
-- ============================================================
CREATE TABLE IF NOT EXISTS shifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id        UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('onward', 'return')),
  departure_time  TIME NOT NULL,
  bus_capacity    INTEGER NOT NULL DEFAULT 22,
  label           TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEAT INVENTORY
-- One row per date per shift. Source of truth for availability.
-- ============================================================
CREATE TABLE IF NOT EXISTS seat_inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id        UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  seats_total     INTEGER NOT NULL DEFAULT 22,
  seats_booked    INTEGER NOT NULL DEFAULT 0,
  seats_held      INTEGER NOT NULL DEFAULT 0,
  UNIQUE(shift_id, date),
  CHECK (seats_booked + seats_held <= seats_total),
  CHECK (seats_booked >= 0),
  CHECK (seats_held >= 0)
);

CREATE INDEX IF NOT EXISTS idx_inventory_shift_date ON seat_inventory(shift_id, date);

-- ============================================================
-- BOOKINGS
-- One booking per user per month per shift combination
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id),
  onward_shift_id     UUID REFERENCES shifts(id),
  return_shift_id     UUID REFERENCES shifts(id),
  booking_dates       DATE[] NOT NULL,
  return_dates        DATE[],
  onward_trips        INTEGER NOT NULL,
  return_trips        INTEGER NOT NULL DEFAULT 0,
  per_trip_rate_onward NUMERIC(10,2) NOT NULL,
  per_trip_rate_return NUMERIC(10,2),
  amount_total        NUMERIC(10,2) NOT NULL,
  status              TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'forfeited', 'expired')),
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  month_year          TEXT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_month ON bookings(month_year);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ============================================================
-- SURVEY RESPONSES
-- ============================================================
CREATE TABLE IF NOT EXISTS survey_responses (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id),
  apartment_id            UUID REFERENCES apartments(id),
  apartment_name_raw      TEXT,
  office_id               UUID REFERENCES offices(id),
  office_name_raw         TEXT,
  preferred_days          TEXT[],
  estimated_days_month    INTEGER,
  morning_band            TEXT,
  evening_band            TEXT,
  submitted_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- SEAT HOLDS (redundant with Redis, but for audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS seat_holds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  shift_id        UUID NOT NULL REFERENCES shifts(id),
  dates           DATE[] NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  released        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VIEWS
-- ============================================================

-- Available seats per shift per date (accounts for holds)
CREATE OR REPLACE VIEW seat_availability AS
SELECT
  si.shift_id,
  si.date,
  si.seats_total,
  si.seats_booked,
  si.seats_held,
  (si.seats_total - si.seats_booked - si.seats_held) AS seats_available,
  s.departure_time,
  s.direction,
  s.route_id
FROM seat_inventory si
JOIN shifts s ON si.shift_id = s.id;

-- Survey OD matrix for route planning (admin)
CREATE OR REPLACE VIEW survey_od_matrix AS
SELECT
  COALESCE(a.area, 'Unknown') AS origin_area,
  COALESCE(o.area, 'Unknown') AS destination_area,
  sr.morning_band,
  sr.evening_band,
  COUNT(*) AS response_count,
  ARRAY_AGG(DISTINCT COALESCE(a.name, sr.apartment_name_raw)) AS apartments,
  ARRAY_AGG(DISTINCT COALESCE(o.name, sr.office_name_raw)) AS offices
FROM survey_responses sr
LEFT JOIN apartments a ON sr.apartment_id = a.id
LEFT JOIN offices o ON sr.office_id = o.id
GROUP BY 1,2,3,4
ORDER BY response_count DESC;
