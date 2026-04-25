# Tellapur Transit — Full Implementation Document

> **For Copilot / AI-assisted development**  
> Stack: Node.js + Express, React + Vite + Tailwind CSS, PostgreSQL (Neon)  
> DB: `postgresql://neondb_owner:npg_ZqCu46TAXHSJ@ep-fragrant-river-an9pfz7d-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Folder Structure](#2-folder-structure)
3. [Environment Variables](#3-environment-variables)
4. [Database Schema](#4-database-schema)
5. [Backend — API Server](#5-backend--api-server)
6. [Frontend — React App](#6-frontend--react-app)
7. [Custom Components](#7-custom-components)
8. [UX Rules & Design System](#8-ux-rules--design-system)
9. [Third-Party Integrations](#9-third-party-integrations)
10. [Build & Deployment](#10-build--deployment)

---

## 1. Product Overview

Tellapur Transit is a fixed-route, pre-committed seat bus service connecting residential apartment clusters in Tellapur/Gopanpalle with IT offices in Madhapur, Financial District, and Gachibowli, Hyderabad.

### App Stages

| Stage | Trigger | Home Screen |
|---|---|---|
| **Stage 1 — Survey** | App launches | Survey CTA card |
| **Stage 2 — Booking** | Routes confirmed by admin | Survey + Book buttons |
| **Stage 3 — Rider** | First paid booking confirmed | Live trip card |

### Core Business Rules

- Users pre-select **specific travel dates** for the following month
- Booking window opens **25th of each month** for next month
- Seats are **22 per bus per shift**
- No-show or cancellation = **seat and amount forfeited**
- No phone bookings. Digital-only. No exceptions.
- Monday–Friday only
- Pricing is **tiered by volume** — more trips booked = lower per-trip rate

### Pricing Tiers

| Onward trips booked | Per trip (one-way) |
|---|---|
| 1–4 | ₹250 |
| 5–9 | ₹210 |
| 10–15 | ₹175 |
| 16–22 | ₹150 |

Return trip: flat ₹130/trip additional on top of onward rate.

---

## 2. Folder Structure

```
tellapur-transit/
├── apps/
│   ├── api/                          # Node.js + Express backend
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── db.js             # Neon PostgreSQL pool
│   │   │   │   ├── redis.js          # Redis client (seat holds)
│   │   │   │   └── env.js            # Validated env vars
│   │   │   ├── middleware/
│   │   │   │   ├── auth.js           # JWT verify middleware
│   │   │   │   ├── adminAuth.js      # Admin role check
│   │   │   │   └── errorHandler.js   # Global error handler
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.js
│   │   │   │   ├── apartments.routes.js
│   │   │   │   ├── offices.routes.js
│   │   │   │   ├── survey.routes.js
│   │   │   │   ├── routes.routes.js
│   │   │   │   ├── inventory.routes.js
│   │   │   │   ├── bookings.routes.js
│   │   │   │   ├── trips.routes.js
│   │   │   │   └── admin.routes.js
│   │   │   ├── controllers/
│   │   │   │   ├── auth.controller.js
│   │   │   │   ├── apartments.controller.js
│   │   │   │   ├── offices.controller.js
│   │   │   │   ├── survey.controller.js
│   │   │   │   ├── routes.controller.js
│   │   │   │   ├── inventory.controller.js
│   │   │   │   ├── bookings.controller.js
│   │   │   │   ├── trips.controller.js
│   │   │   │   └── admin.controller.js
│   │   │   ├── services/
│   │   │   │   ├── google-places.service.js
│   │   │   │   ├── typesense.service.js
│   │   │   │   ├── razorpay.service.js
│   │   │   │   ├── whatsapp.service.js
│   │   │   │   └── pricing.service.js
│   │   │   ├── utils/
│   │   │   │   ├── jwt.js
│   │   │   │   └── asyncHandler.js
│   │   │   └── index.js              # Express app entry point
│   │   ├── migrations/
│   │   │   └── 001_initial_schema.sql
│   │   ├── seeds/
│   │   │   ├── apartments.json
│   │   │   └── offices.json
│   │   ├── .env
│   │   └── package.json
│   │
│   ├── web/                          # React + Vite rider frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/               # Primitive components
│   │   │   │   │   ├── Button.jsx
│   │   │   │   │   ├── Chip.jsx
│   │   │   │   │   ├── Card.jsx
│   │   │   │   │   ├── Input.jsx
│   │   │   │   │   ├── Avatar.jsx
│   │   │   │   │   ├── Badge.jsx
│   │   │   │   │   ├── Spinner.jsx
│   │   │   │   │   ├── Toast.jsx
│   │   │   │   │   ├── Modal.jsx
│   │   │   │   │   ├── BottomSheet.jsx
│   │   │   │   │   └── ProgressBar.jsx
│   │   │   │   ├── survey/
│   │   │   │   │   ├── SurveyShell.jsx       # Step wrapper + progress
│   │   │   │   │   ├── ApartmentStep.jsx
│   │   │   │   │   ├── OfficeStep.jsx
│   │   │   │   │   ├── ScheduleStep.jsx
│   │   │   │   │   ├── TimingStep.jsx
│   │   │   │   │   └── SurveyConfirm.jsx
│   │   │   │   ├── booking/
│   │   │   │   │   ├── RouteCard.jsx
│   │   │   │   │   ├── ShiftSelector.jsx
│   │   │   │   │   ├── BookingCalendar.jsx   # Custom calendar with seat counts
│   │   │   │   │   ├── PriceTicker.jsx       # Live price as dates selected
│   │   │   │   │   └── BookingReview.jsx
│   │   │   │   ├── home/
│   │   │   │   │   ├── TripCard.jsx          # 3-state home card
│   │   │   │   │   ├── LiveTrackMap.jsx
│   │   │   │   │   ├── NextTripReminder.jsx
│   │   │   │   │   └── SavingsTicker.jsx
│   │   │   │   └── shared/
│   │   │   │       ├── LocationSearch.jsx    # Reusable apt/office search
│   │   │   │       ├── GoogleOneTap.jsx
│   │   │   │       ├── AppHeader.jsx
│   │   │   │       └── BottomNav.jsx
│   │   │   ├── pages/
│   │   │   │   ├── Landing.jsx
│   │   │   │   ├── Home.jsx
│   │   │   │   ├── Survey.jsx
│   │   │   │   ├── Booking.jsx
│   │   │   │   ├── BookingConfirm.jsx
│   │   │   │   ├── MyTrips.jsx
│   │   │   │   └── Profile.jsx
│   │   │   ├── store/
│   │   │   │   ├── authStore.js
│   │   │   │   ├── surveyStore.js
│   │   │   │   └── bookingStore.js
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.js
│   │   │   │   ├── useInventory.js
│   │   │   │   └── usePricing.js
│   │   │   ├── lib/
│   │   │   │   ├── api.js            # Axios instance + interceptors
│   │   │   │   └── utils.js
│   │   │   ├── App.jsx
│   │   │   ├── main.jsx
│   │   │   └── index.css             # Tailwind + CSS variables
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   ├── tailwind.config.js
│   │   └── package.json
│   │
│   └── admin/                        # React + Vite admin dashboard
│       ├── src/
│       │   ├── pages/
│       │   │   ├── SurveyDashboard.jsx
│       │   │   ├── RouteBuilder.jsx
│       │   │   ├── InventoryManager.jsx
│       │   │   └── LiveOps.jsx
│       │   └── ...
│       └── package.json
│
├── packages/
│   └── shared/
│       └── types/                    # Shared TypeScript-like JSDoc types
│           └── index.js
│
├── package.json                      # Root workspace
└── turbo.json                        # Turborepo config
```

---

## 3. Environment Variables

### `apps/api/.env`

```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_ZqCu46TAXHSJ@ep-fragrant-river-an9pfz7d-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Auth
JWT_SECRET=your_jwt_secret_min_64_chars
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_oauth_client_id

# Redis (for seat holds)
REDIS_URL=redis://localhost:6379

# Google Places API
GOOGLE_PLACES_API_KEY=your_places_api_key

# Typesense
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_API_KEY=your_typesense_api_key

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# WhatsApp Business API
WHATSAPP_API_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# App
PORT=3001
NODE_ENV=development
APP_STAGE=survey           # survey | booking | rider (controls feature flags)
SEAT_HOLD_TTL_SECONDS=600  # 10 minutes
```

### `apps/web/.env`

```env
VITE_API_URL=http://localhost:3001/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_GOOGLE_MAPS_API_KEY=your_maps_api_key
VITE_APP_STAGE=survey
```

---

## 4. Database Schema

File: `apps/api/migrations/001_initial_schema.sql`

```sql
-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For fuzzy text search

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
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

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- APARTMENTS
-- Seeded from script. Users can suggest new ones.
-- ============================================================
CREATE TABLE apartments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  aliases         TEXT[],                          -- For fuzzy search
  area            TEXT NOT NULL,                   -- e.g. "Tellapur"
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  location        GEOGRAPHY(POINT, 4326),          -- PostGIS point
  polygon         GEOGRAPHY(POLYGON, 4326),        -- Building footprint
  place_id        TEXT,                            -- Google Place ID
  verified        BOOLEAN DEFAULT FALSE,
  suggested_by    UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_apartments_location ON apartments USING GIST(location);
CREATE INDEX idx_apartments_polygon ON apartments USING GIST(polygon);
CREATE INDEX idx_apartments_name_trgm ON apartments USING GIN(name gin_trgm_ops);

-- ============================================================
-- OFFICES
-- Grows via user submissions. Cached after first selection.
-- ============================================================
CREATE TABLE offices (
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
  gates           JSONB DEFAULT '[]',             -- [{label, lat, lng}]
  source          TEXT DEFAULT 'google'            -- 'google' | 'manual'
                  CHECK (source IN ('google', 'manual')),
  verified        BOOLEAN DEFAULT FALSE,
  selection_count INTEGER DEFAULT 1,              -- Track popularity
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offices_location ON offices USING GIST(location);
CREATE INDEX idx_offices_name_trgm ON offices USING GIN(name gin_trgm_ops);
CREATE INDEX idx_offices_selection_count ON offices(selection_count DESC);

-- ============================================================
-- ROUTES
-- Created by admin after survey analysis
-- ============================================================
CREATE TABLE routes (
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
CREATE TABLE stops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id        UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_type       TEXT NOT NULL CHECK (stop_type IN ('pickup', 'drop')),
  apartment_id    UUID REFERENCES apartments(id),
  office_id       UUID REFERENCES offices(id),
  label           TEXT NOT NULL,                  -- Display name
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  sequence        INTEGER NOT NULL,               -- Order along route
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, sequence)
);

-- ============================================================
-- SHIFTS
-- A shift = one direction of travel at a specific time
-- ============================================================
CREATE TABLE shifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id        UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('onward', 'return')),
  departure_time  TIME NOT NULL,
  bus_capacity    INTEGER NOT NULL DEFAULT 22,
  label           TEXT NOT NULL,                  -- e.g. "Early Bird · 7:30 AM"
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEAT INVENTORY
-- One row per date per shift. Source of truth for availability.
-- ============================================================
CREATE TABLE seat_inventory (
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

CREATE INDEX idx_inventory_shift_date ON seat_inventory(shift_id, date);

-- ============================================================
-- BOOKINGS
-- One booking per user per month per shift combination
-- ============================================================
CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id),
  onward_shift_id     UUID REFERENCES shifts(id),
  return_shift_id     UUID REFERENCES shifts(id),
  booking_dates       DATE[] NOT NULL,            -- Onward trip dates
  return_dates        DATE[],                     -- Return trip dates (can differ)
  onward_trips        INTEGER NOT NULL,
  return_trips        INTEGER NOT NULL DEFAULT 0,
  per_trip_rate_onward NUMERIC(10,2) NOT NULL,
  per_trip_rate_return NUMERIC(10,2),
  amount_total        NUMERIC(10,2) NOT NULL,
  status              TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'forfeited', 'expired')),
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  month_year          TEXT NOT NULL,              -- e.g. "2026-05" for May 2026
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at        TIMESTAMPTZ
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_month ON bookings(month_year);
CREATE INDEX idx_bookings_status ON bookings(status);

-- ============================================================
-- SURVEY RESPONSES
-- ============================================================
CREATE TABLE survey_responses (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id),
  apartment_id            UUID REFERENCES apartments(id),
  apartment_name_raw      TEXT,                   -- If not in our list yet
  office_id               UUID REFERENCES offices(id),
  office_name_raw         TEXT,
  preferred_days          TEXT[],                 -- ['Mon','Wed','Fri']
  estimated_days_month    INTEGER,                -- 4 | 8 | 12 | 16 | 20
  morning_band            TEXT,                   -- 'before_730' | '730_830' | '830_930' | 'after_930'
  evening_band            TEXT,                   -- 'before_5' | '5_6' | '6_7' | 'after_7'
  submitted_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- SEAT HOLDS (redundant with Redis, but for audit trail)
-- ============================================================
CREATE TABLE seat_holds (
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

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VIEWS
-- ============================================================

-- Available seats per shift per date (accounts for holds)
CREATE VIEW seat_availability AS
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
CREATE VIEW survey_od_matrix AS
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
```

---

## 5. Backend — API Server

### `apps/api/src/index.js`

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth.routes');
const apartmentRoutes = require('./routes/apartments.routes');
const officeRoutes = require('./routes/offices.routes');
const surveyRoutes = require('./routes/survey.routes');
const routesRoutes = require('./routes/routes.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const bookingRoutes = require('./routes/bookings.routes');
const tripRoutes = require('./routes/trips.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(morgan('dev'));

// Razorpay webhook needs raw body
app.use('/api/bookings/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/apartments', apartmentRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/survey', surveyRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on :${PORT}`));
```

### `apps/api/src/config/db.js`

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('Unexpected PG pool error', err));

const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
```

### `apps/api/src/config/redis.js`

```javascript
const { createClient } = require('redis');

const client = createClient({ url: process.env.REDIS_URL });
client.on('error', (err) => console.error('Redis error', err));
client.connect();

module.exports = client;
```

---

### All API Routes & Controllers

#### AUTH

**`apps/api/src/routes/auth.routes.js`**
```javascript
const router = require('express').Router();
const { googleLogin, refreshToken, logout } = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');

router.post('/google', googleLogin);
router.post('/refresh', refreshToken);
router.post('/logout', auth, logout);

module.exports = router;
```

**`apps/api/src/controllers/auth.controller.js`**
```javascript
const { OAuth2Client } = require('google-auth-library');
const { query } = require('../config/db');
const { signToken } = require('../utils/jwt');
const asyncHandler = require('../utils/asyncHandler');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/google
// Body: { credential: <google_id_token> }
exports.googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'credential required' });

  // Verify Google token
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { sub: googleId, name, email, picture } = payload;

  // Upsert user
  const { rows } = await query(
    `INSERT INTO users (google_id, name, email, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO UPDATE
       SET name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url, updated_at = NOW()
     RETURNING *`,
    [googleId, name, email, picture]
  );

  const user = rows[0];
  const token = signToken({ userId: user.id, role: user.role });

  // Check if user has completed survey (for frontend routing)
  const surveyResult = await query(
    'SELECT id FROM survey_responses WHERE user_id = $1',
    [user.id]
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
      role: user.role,
    },
    hasSurvey: surveyResult.rows.length > 0,
  });
});

// POST /api/auth/refresh
exports.refreshToken = asyncHandler(async (req, res) => {
  // Implement refresh token logic
  res.json({ message: 'refresh' });
});

// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  res.json({ success: true });
});
```

---

#### APARTMENTS

**`apps/api/src/routes/apartments.routes.js`**
```javascript
const router = require('express').Router();
const { search, suggest } = require('../controllers/apartments.controller');
const { auth } = require('../middleware/auth');

router.get('/search', search);           // Public — no auth needed
router.post('/suggest', auth, suggest);  // Authenticated — suggest missing apt

module.exports = router;
```

**`apps/api/src/controllers/apartments.controller.js`**
```javascript
const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/apartments/search?q=aliens
exports.search = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  if (q.length < 2) return res.json([]);

  const { rows } = await query(
    `SELECT id, name, area, lat, lng, aliases, verified
     FROM apartments
     WHERE name ILIKE $1
        OR $2 = ANY(aliases)
        OR similarity(name, $3) > 0.2
     ORDER BY verified DESC, similarity(name, $3) DESC
     LIMIT 10`,
    [`%${q}%`, q.toLowerCase(), q]
  );

  res.json(rows);
});

// POST /api/apartments/suggest
// Body: { name, area, lat, lng }
exports.suggest = asyncHandler(async (req, res) => {
  const { name, area, lat, lng } = req.body;
  const userId = req.user.userId;

  const { rows } = await query(
    `INSERT INTO apartments (name, area, lat, lng, location, verified, suggested_by)
     VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($4, $3), 4326), false, $5)
     ON CONFLICT DO NOTHING
     RETURNING id, name, area`,
    [name, area || 'Tellapur', lat || 17.456, lng || 78.321, userId]
  );

  res.status(201).json(rows[0] || { message: 'Already exists or queued for review' });
});
```

---

#### OFFICES

**`apps/api/src/routes/offices.routes.js`**
```javascript
const router = require('express').Router();
const { search, create, update } = require('../controllers/offices.controller');
const { auth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');

router.get('/search', search);
router.post('/', auth, create);
router.patch('/:id', adminAuth, update);

module.exports = router;
```

**`apps/api/src/controllers/offices.controller.js`**
```javascript
const { query } = require('../config/db');
const { searchGooglePlaces, getPlaceDetails } = require('../services/google-places.service');
const { indexOffice, searchTypesense } = require('../services/typesense.service');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/offices/search?q=amazon
// Strategy: local DB → Typesense → Google Places
exports.search = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  if (q.length < 2) return res.json([]);

  // 1. Search local DB first (cached offices)
  const { rows: localResults } = await query(
    `SELECT id, name, short_name, area, lat, lng, gates, verified, selection_count
     FROM offices
     WHERE name ILIKE $1 OR short_name ILIKE $1 OR $2 = ANY(aliases)
     ORDER BY selection_count DESC, verified DESC
     LIMIT 5`,
    [`%${q}%`, q.toLowerCase()]
  );

  if (localResults.length >= 3) {
    return res.json({ source: 'cache', results: localResults });
  }

  // 2. Typesense fuzzy search
  try {
    const tsResults = await searchTypesense('offices', q);
    if (tsResults.length >= 3) {
      return res.json({ source: 'typesense', results: tsResults });
    }
  } catch (e) {
    console.warn('Typesense unavailable, falling back to Google Places');
  }

  // 3. Google Places fallback
  const placesResults = await searchGooglePlaces(q, {
    location: { lat: 17.42, lng: 78.35 },
    radius: 15000,
    type: 'establishment',
  });

  res.json({ source: 'google', results: placesResults });
});

// POST /api/offices
// Body: { name, short_name, area, lat, lng, place_id, gates }
// Called when user selects a Google Places result to cache it
exports.create = asyncHandler(async (req, res) => {
  const { name, short_name, area, lat, lng, place_id, gates = [] } = req.body;

  const { rows } = await query(
    `INSERT INTO offices (name, short_name, area, lat, lng, location, place_id, gates, source)
     VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($5, $4), 4326), $6, $7, 'google')
     ON CONFLICT (place_id) DO UPDATE
       SET selection_count = offices.selection_count + 1, updated_at = NOW()
     RETURNING *`,
    [name, short_name, area, lat, lng, place_id, JSON.stringify(gates)]
  );

  // Index in Typesense for future searches
  await indexOffice(rows[0]).catch(console.warn);

  res.status(201).json(rows[0]);
});

// PATCH /api/offices/:id — Admin: verify and enrich office data
exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, short_name, aliases, gates, verified } = req.body;

  const { rows } = await query(
    `UPDATE offices
     SET name = COALESCE($1, name),
         short_name = COALESCE($2, short_name),
         aliases = COALESCE($3, aliases),
         gates = COALESCE($4, gates),
         verified = COALESCE($5, verified)
     WHERE id = $6
     RETURNING *`,
    [name, short_name, aliases, gates ? JSON.stringify(gates) : null, verified, id]
  );

  res.json(rows[0]);
});
```

---

#### SURVEY

**`apps/api/src/routes/survey.routes.js`**
```javascript
const router = require('express').Router();
const { submit, getMyResponse } = require('../controllers/survey.controller');
const { auth } = require('../middleware/auth');

router.post('/', auth, submit);
router.get('/me', auth, getMyResponse);

module.exports = router;
```

**`apps/api/src/controllers/survey.controller.js`**
```javascript
const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/survey
exports.submit = asyncHandler(async (req, res) => {
  const {
    apartment_id, apartment_name_raw,
    office_id, office_name_raw,
    preferred_days, estimated_days_month,
    morning_band, evening_band
  } = req.body;

  const userId = req.user.userId;

  const { rows } = await query(
    `INSERT INTO survey_responses
       (user_id, apartment_id, apartment_name_raw, office_id, office_name_raw,
        preferred_days, estimated_days_month, morning_band, evening_band)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (user_id) DO UPDATE SET
       apartment_id = EXCLUDED.apartment_id,
       apartment_name_raw = EXCLUDED.apartment_name_raw,
       office_id = EXCLUDED.office_id,
       office_name_raw = EXCLUDED.office_name_raw,
       preferred_days = EXCLUDED.preferred_days,
       estimated_days_month = EXCLUDED.estimated_days_month,
       morning_band = EXCLUDED.morning_band,
       evening_band = EXCLUDED.evening_band,
       submitted_at = NOW()
     RETURNING *`,
    [userId, apartment_id, apartment_name_raw, office_id, office_name_raw,
     preferred_days, estimated_days_month, morning_band, evening_band]
  );

  res.status(201).json(rows[0]);
});

// GET /api/survey/me
exports.getMyResponse = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT sr.*, a.name as apartment_name, o.name as office_name
     FROM survey_responses sr
     LEFT JOIN apartments a ON sr.apartment_id = a.id
     LEFT JOIN offices o ON sr.office_id = o.id
     WHERE sr.user_id = $1`,
    [req.user.userId]
  );

  res.json(rows[0] || null);
});
```

---

#### INVENTORY

**`apps/api/src/routes/inventory.routes.js`**
```javascript
const router = require('express').Router();
const { getMonthInventory, holdSeats, releaseHold } = require('../controllers/inventory.controller');
const { auth } = require('../middleware/auth');

router.get('/:shiftId/:year/:month', auth, getMonthInventory);
router.post('/hold', auth, holdSeats);
router.delete('/hold', auth, releaseHold);

module.exports = router;
```

**`apps/api/src/controllers/inventory.controller.js`**
```javascript
const { query } = require('../config/db');
const redis = require('../config/redis');
const asyncHandler = require('../utils/asyncHandler');

const HOLD_TTL = parseInt(process.env.SEAT_HOLD_TTL_SECONDS || '600');

// GET /api/inventory/:shiftId/:year/:month
// Returns all dates in month with seat availability
// One API call = full calendar data for the booking UI
exports.getMonthInventory = asyncHandler(async (req, res) => {
  const { shiftId, year, month } = req.params;

  // Get or create inventory rows for all working days in month
  const { rows } = await query(
    `WITH month_days AS (
       SELECT generate_series(
         date_trunc('month', make_date($2::int, $3::int, 1)),
         date_trunc('month', make_date($2::int, $3::int, 1)) + interval '1 month' - interval '1 day',
         interval '1 day'
       )::date AS date
     ),
     working_days AS (
       SELECT date FROM month_days
       WHERE EXTRACT(DOW FROM date) BETWEEN 1 AND 5  -- Mon-Fri only
     )
     SELECT
       wd.date,
       COALESCE(si.seats_total, s.bus_capacity) AS seats_total,
       COALESCE(si.seats_booked, 0) AS seats_booked,
       COALESCE(si.seats_held, 0) AS seats_held,
       GREATEST(
         COALESCE(si.seats_total, s.bus_capacity) 
         - COALESCE(si.seats_booked, 0) 
         - COALESCE(si.seats_held, 0),
         0
       ) AS seats_available
     FROM working_days wd
     LEFT JOIN seat_inventory si ON si.shift_id = $1 AND si.date = wd.date
     JOIN shifts s ON s.id = $1
     ORDER BY wd.date`,
    [shiftId, year, month]
  );

  res.json(rows);
});

// POST /api/inventory/hold
// Body: { shift_id, dates: ['2026-05-01', ...] }
// Reserves seats for 10 minutes while user completes payment
exports.holdSeats = asyncHandler(async (req, res) => {
  const { shift_id, dates } = req.body;
  const userId = req.user.userId;

  if (!dates || dates.length === 0) {
    return res.status(400).json({ error: 'No dates provided' });
  }

  const holdKey = `hold:${userId}:${shift_id}`;

  // Check if user already has a hold (release it first)
  const existingHold = await redis.get(holdKey);
  if (existingHold) {
    const parsed = JSON.parse(existingHold);
    await releaseHoldFromRedis(parsed.shift_id, parsed.dates);
  }

  // Attempt to hold seats in a transaction
  const client = await require('../config/db').getClient();
  try {
    await client.query('BEGIN');

    for (const date of dates) {
      // Upsert inventory row if it doesn't exist
      await client.query(
        `INSERT INTO seat_inventory (shift_id, date, seats_total, seats_booked, seats_held)
         SELECT $1, $2, bus_capacity, 0, 0
         FROM shifts WHERE id = $1
         ON CONFLICT (shift_id, date) DO NOTHING`,
        [shift_id, date]
      );

      // Try to increment hold count
      const { rows } = await client.query(
        `UPDATE seat_inventory
         SET seats_held = seats_held + 1
         WHERE shift_id = $1 AND date = $2
           AND (seats_total - seats_booked - seats_held) > 0
         RETURNING seats_held`,
        [shift_id, date]
      );

      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `No seats available on ${date}` });
      }
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  // Store hold in Redis with TTL
  await redis.setEx(holdKey, HOLD_TTL, JSON.stringify({ shift_id, dates }));

  res.json({ held: true, expiresInSeconds: HOLD_TTL, dates });
});

// DELETE /api/inventory/hold
exports.releaseHold = asyncHandler(async (req, res) => {
  const { shift_id } = req.body;
  const userId = req.user.userId;

  const holdKey = `hold:${userId}:${shift_id}`;
  const holdData = await redis.get(holdKey);

  if (holdData) {
    const parsed = JSON.parse(holdData);
    await releaseHoldFromRedis(parsed.shift_id, parsed.dates);
    await redis.del(holdKey);
  }

  res.json({ released: true });
});

async function releaseHoldFromRedis(shiftId, dates) {
  if (!dates || dates.length === 0) return;
  await query(
    `UPDATE seat_inventory
     SET seats_held = GREATEST(seats_held - 1, 0)
     WHERE shift_id = $1 AND date = ANY($2::date[])`,
    [shiftId, dates]
  );
}
```

---

#### BOOKINGS

**`apps/api/src/routes/bookings.routes.js`**
```javascript
const router = require('express').Router();
const { createOrder, webhook, getMyBookings } = require('../controllers/bookings.controller');
const { auth } = require('../middleware/auth');

router.post('/', auth, createOrder);
router.post('/webhook', webhook);           // Raw body — no auth
router.get('/me', auth, getMyBookings);

module.exports = router;
```

**`apps/api/src/controllers/bookings.controller.js`**
```javascript
const { query, getClient } = require('../config/db');
const redis = require('../config/redis');
const { createRazorpayOrder, verifyWebhookSignature } = require('../services/razorpay.service');
const { calculatePrice } = require('../services/pricing.service');
const asyncHandler = require('../utils/asyncHandler');
const crypto = require('crypto');

// POST /api/bookings
// Body: { onward_shift_id, return_shift_id?, booking_dates, return_dates? }
exports.createOrder = asyncHandler(async (req, res) => {
  const { onward_shift_id, return_shift_id, booking_dates, return_dates = [] } = req.body;
  const userId = req.user.userId;

  const onwardTrips = booking_dates.length;
  const returnTrips = return_dates.length;

  // Calculate pricing
  const { perTripOnward, perTripReturn, total } = calculatePrice(onwardTrips, returnTrips);

  // Create Razorpay order
  const razorpayOrder = await createRazorpayOrder(total * 100); // paise

  // Create pending booking
  const monthYear = booking_dates[0].substring(0, 7); // e.g. '2026-05'
  const { rows } = await query(
    `INSERT INTO bookings
       (user_id, onward_shift_id, return_shift_id, booking_dates, return_dates,
        onward_trips, return_trips, per_trip_rate_onward, per_trip_rate_return,
        amount_total, status, razorpay_order_id, month_year)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,$12)
     RETURNING *`,
    [userId, onward_shift_id, return_shift_id, booking_dates, return_dates,
     onwardTrips, returnTrips, perTripOnward, perTripReturn,
     total, razorpayOrder.id, monthYear]
  );

  res.json({
    booking: rows[0],
    razorpayOrder: {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    }
  });
});

// POST /api/bookings/webhook — Razorpay webhook
exports.webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const isValid = verifyWebhookSignature(req.body, signature);

  if (!isValid) return res.status(400).json({ error: 'Invalid signature' });

  const event = JSON.parse(req.body);

  if (event.event === 'payment.captured') {
    const orderId = event.payload.payment.entity.order_id;
    const paymentId = event.payload.payment.entity.id;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Confirm booking
      const { rows } = await client.query(
        `UPDATE bookings
         SET status = 'confirmed', razorpay_payment_id = $1, confirmed_at = NOW()
         WHERE razorpay_order_id = $2
         RETURNING *`,
        [paymentId, orderId]
      );

      const booking = rows[0];
      if (!booking) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Convert holds to confirmed bookings in inventory
      for (const date of booking.booking_dates) {
        await client.query(
          `UPDATE seat_inventory
           SET seats_booked = seats_booked + 1,
               seats_held = GREATEST(seats_held - 1, 0)
           WHERE shift_id = $1 AND date = $2`,
          [booking.onward_shift_id, date]
        );
      }

      if (booking.return_shift_id) {
        for (const date of booking.return_dates || []) {
          await client.query(
            `UPDATE seat_inventory
             SET seats_booked = seats_booked + 1,
                 seats_held = GREATEST(seats_held - 1, 0)
             WHERE shift_id = $1 AND date = $2`,
            [booking.return_shift_id, date]
          );
        }
      }

      // Clear Redis hold
      await redis.del(`hold:${booking.user_id}:${booking.onward_shift_id}`);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  res.json({ received: true });
});

// GET /api/bookings/me
exports.getMyBookings = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT b.*,
            s_on.departure_time AS onward_time,
            s_on.label AS onward_label,
            s_ret.departure_time AS return_time,
            s_ret.label AS return_label,
            r.name AS route_name
     FROM bookings b
     LEFT JOIN shifts s_on ON b.onward_shift_id = s_on.id
     LEFT JOIN shifts s_ret ON b.return_shift_id = s_ret.id
     LEFT JOIN routes r ON s_on.route_id = r.id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [req.user.userId]
  );

  res.json(rows);
});
```

---

#### PRICING SERVICE

**`apps/api/src/services/pricing.service.js`**
```javascript
// Pricing tiers based on number of onward trips
const ONWARD_TIERS = [
  { min: 1,  max: 4,  rate: 250 },
  { min: 5,  max: 9,  rate: 210 },
  { min: 10, max: 15, rate: 175 },
  { min: 16, max: 22, rate: 150 },
];
const RETURN_RATE = 130;

function getOnwardRate(trips) {
  const tier = ONWARD_TIERS.find(t => trips >= t.min && trips <= t.max);
  return tier ? tier.rate : 150;
}

function calculatePrice(onwardTrips, returnTrips = 0) {
  const perTripOnward = getOnwardRate(onwardTrips);
  const perTripReturn = returnTrips > 0 ? RETURN_RATE : 0;
  const total = (onwardTrips * perTripOnward) + (returnTrips * perTripReturn);

  return {
    perTripOnward,
    perTripReturn: perTripReturn || null,
    total,
    breakdown: {
      onward: `${onwardTrips} trips × ₹${perTripOnward} = ₹${onwardTrips * perTripOnward}`,
      return: returnTrips ? `${returnTrips} trips × ₹${RETURN_RATE} = ₹${returnTrips * RETURN_RATE}` : null,
    },
    tiers: ONWARD_TIERS,
  };
}

module.exports = { calculatePrice, getOnwardRate, ONWARD_TIERS, RETURN_RATE };
```

---

#### TRIPS (Live Tracking — Stage 3 skeleton)

**`apps/api/src/routes/trips.routes.js`**
```javascript
const router = require('express').Router();
const { getActiveTrip, pingLocation } = require('../controllers/trips.controller');
const { auth } = require('../middleware/auth');

router.get('/active', auth, getActiveTrip);
router.post('/ping', pingLocation);        // Bus device posts GPS

module.exports = router;
```

---

#### ADMIN

**`apps/api/src/routes/admin.routes.js`**
```javascript
const router = require('express').Router();
const { getSurveyStats, getODMatrix, createRoute, publishRoute } = require('../controllers/admin.controller');
const { adminAuth } = require('../middleware/adminAuth');

router.get('/survey/stats', adminAuth, getSurveyStats);
router.get('/survey/od-matrix', adminAuth, getODMatrix);
router.post('/routes', adminAuth, createRoute);
router.patch('/routes/:id/publish', adminAuth, publishRoute);

module.exports = router;
```

---

#### MIDDLEWARE

**`apps/api/src/middleware/auth.js`**
```javascript
const { verifyToken } = require('../utils/jwt');

exports.auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

**`apps/api/src/middleware/adminAuth.js`**
```javascript
const { verifyToken } = require('../utils/jwt');

exports.adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = verifyToken(token);
    if (decoded.role !== 'admin' && decoded.role !== 'ops') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

**`apps/api/src/utils/jwt.js`**
```javascript
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

exports.signToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
exports.verifyToken = (token) => jwt.verify(token, SECRET);
```

**`apps/api/src/utils/asyncHandler.js`**
```javascript
module.exports = (fn) => (req, res, next) => fn(req, res, next).catch(next);
```

**`apps/api/src/middleware/errorHandler.js`**
```javascript
exports.errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
};
```

---

## 6. Frontend — React App

### `apps/web/vite.config.js`

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { proxy: { '/api': 'http://localhost:3001' } },
});
```

### `apps/web/tailwind.config.js`

```javascript
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          900: '#14532d',
        },
        surface: {
          0: '#0a0a0f',
          1: '#111118',
          2: '#1a1a24',
          3: '#24243a',
          border: '#2e2e45',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      },
    },
  },
  plugins: [],
};
```

### `apps/web/src/index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brand: #22c55e;
  --brand-dim: #16a34a;
  --surface-0: #0a0a0f;
  --surface-1: #111118;
  --surface-2: #1a1a24;
  --surface-3: #24243a;
  --border: #2e2e45;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #475569;
  --warning: #f59e0b;
  --danger: #ef4444;
  --seat-green: #22c55e;
  --seat-yellow: #f59e0b;
  --seat-red: #ef4444;
  --seat-gray: #374151;
}

body {
  background: var(--surface-0);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Prevent iOS tap highlight */
* { -webkit-tap-highlight-color: transparent; }

/* Custom scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: var(--surface-1); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
```

### `apps/web/src/lib/api.js`

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tt_token');
      window.location.href = '/';
    }
    return Promise.reject(err.response?.data || err);
  }
);

export default api;
```

### `apps/web/src/store/authStore.js`

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      hasSurvey: false,
      isAuthenticated: false,

      setAuth: ({ user, token, hasSurvey }) =>
        set({ user, token, hasSurvey, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, token: null, hasSurvey: false, isAuthenticated: false }),
    }),
    { name: 'tt_auth' }
  )
);
```

### `apps/web/src/store/surveyStore.js`

```javascript
import { create } from 'zustand';

export const useSurveyStore = create((set, get) => ({
  step: 1,
  totalSteps: 4,
  apartment: null,
  office: null,
  preferredDays: [],
  estimatedDays: null,
  morningBand: null,
  eveningBand: null,

  setApartment: (apartment) => set({ apartment }),
  setOffice: (office) => set({ office }),
  setPreferredDays: (days) => set({ preferredDays: days }),
  setEstimatedDays: (days) => set({ estimatedDays: days }),
  setMorningBand: (band) => set({ morningBand: band }),
  setEveningBand: (band) => set({ eveningBand: band }),

  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, s.totalSteps + 1) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),
  reset: () => set({ step: 1, apartment: null, office: null, preferredDays: [], estimatedDays: null, morningBand: null, eveningBand: null }),

  toPayload: () => {
    const s = get();
    return {
      apartment_id: s.apartment?.id,
      apartment_name_raw: s.apartment?.name,
      office_id: s.office?.id,
      office_name_raw: s.office?.name,
      preferred_days: s.preferredDays,
      estimated_days_month: s.estimatedDays,
      morning_band: s.morningBand,
      evening_band: s.eveningBand,
    };
  },
}));
```

### `apps/web/src/store/bookingStore.js`

```javascript
import { create } from 'zustand';
import { calculatePriceFrontend } from '../lib/pricing';

export const useBookingStore = create((set, get) => ({
  selectedRoute: null,
  onwardShift: null,
  returnShift: null,
  selectedDates: [],       // onward dates
  selectedReturnDates: [], // return dates
  pricing: null,

  setRoute: (route) => set({ selectedRoute: route }),
  setOnwardShift: (shift) => set({ onwardShift: shift }),
  setReturnShift: (shift) => set({ returnShift: shift }),

  toggleDate: (dateStr) => {
    const s = get();
    const exists = s.selectedDates.includes(dateStr);
    const newDates = exists
      ? s.selectedDates.filter(d => d !== dateStr)
      : [...s.selectedDates, dateStr].sort();
    const pricing = calculatePriceFrontend(newDates.length, s.selectedReturnDates.length);
    set({ selectedDates: newDates, pricing });
  },

  toggleReturnDate: (dateStr) => {
    const s = get();
    const exists = s.selectedReturnDates.includes(dateStr);
    const newDates = exists
      ? s.selectedReturnDates.filter(d => d !== dateStr)
      : [...s.selectedReturnDates, dateStr].sort();
    const pricing = calculatePriceFrontend(s.selectedDates.length, newDates.length);
    set({ selectedReturnDates: newDates, pricing });
  },

  reset: () => set({
    selectedRoute: null, onwardShift: null, returnShift: null,
    selectedDates: [], selectedReturnDates: [], pricing: null,
  }),
}));
```

---

## 7. Custom Components

### `apps/web/src/components/ui/Button.jsx`

```jsx
import { clsx } from 'clsx';

const variants = {
  primary: 'bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-lg shadow-brand-500/20',
  secondary: 'bg-surface-3 hover:bg-surface-3/80 text-white border border-surface-border',
  ghost: 'hover:bg-surface-2 text-slate-300',
  danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30',
};

const sizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-5 py-3 text-base',
  lg: 'px-6 py-4 text-lg',
  full: 'w-full px-5 py-4 text-base',
};

export function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, className = '', ...props
}) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-2xl transition-all duration-150',
        'active:scale-95 select-none',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant], sizes[size], className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      )}
      {children}
    </button>
  );
}
```

### `apps/web/src/components/ui/Chip.jsx`

```jsx
import { clsx } from 'clsx';

export function Chip({ label, selected = false, onClick, disabled = false, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 select-none',
        'active:scale-95 border',
        selected
          ? 'bg-brand-500/20 border-brand-500 text-brand-500'
          : 'bg-surface-2 border-surface-border text-slate-400 hover:border-slate-500',
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
    >
      {label}
    </button>
  );
}

// Multi-select chip group
export function ChipGroup({ options, selected = [], onChange, max = null }) {
  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      if (max && selected.length >= max) return;
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <Chip
          key={opt.value}
          label={opt.label}
          selected={selected.includes(opt.value)}
          onClick={() => toggle(opt.value)}
        />
      ))}
    </div>
  );
}

// Single-select chip group (radio-style)
export function ChipRadio({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <Chip
          key={opt.value}
          label={opt.label}
          selected={value === opt.value}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  );
}
```

### `apps/web/src/components/ui/Card.jsx`

```jsx
import { clsx } from 'clsx';

export function Card({ children, className = '', onClick, glass = false }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-2xl border border-surface-border p-4',
        glass
          ? 'bg-white/5 backdrop-blur-sm'
          : 'bg-surface-2',
        onClick && 'cursor-pointer hover:border-slate-500 transition-colors active:scale-[0.98]',
        className
      )}
    >
      {children}
    </div>
  );
}
```

### `apps/web/src/components/shared/LocationSearch.jsx`

```jsx
// Reusable search component for both apartments and offices
// Handles: local search → Typesense → Google Places fallback
import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import api from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';

export function LocationSearch({
  placeholder = 'Search...',
  endpoint,               // '/apartments/search' or '/offices/search'
  onSelect,               // (item) => void
  renderResult,           // (item) => JSX
  value = null,
  onClear,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(`${endpoint}?q=${encodeURIComponent(query)}`);
        const items = data.results || data;
        setResults(items);
        setOpen(true);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, endpoint]);

  const handleSelect = (item) => {
    onSelect(item);
    setQuery('');
    setOpen(false);
  };

  if (value) {
    return (
      <div className="flex items-center justify-between bg-surface-2 border border-brand-500/50 rounded-2xl px-4 py-3">
        <div>
          {renderResult ? renderResult(value) : (
            <div>
              <p className="text-white font-medium">{value.name}</p>
              <p className="text-slate-400 text-sm">{value.area}</p>
            </div>
          )}
        </div>
        <button onClick={onClear} className="text-slate-400 hover:text-white text-sm">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={clsx(
        'flex items-center gap-3 bg-surface-2 border rounded-2xl px-4 py-3 transition-colors',
        open ? 'border-brand-500/50' : 'border-surface-border'
      )}>
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-base"
          autoComplete="off"
        />
        {loading && <Spinner size="sm" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-surface-2 border border-surface-border rounded-2xl overflow-hidden shadow-2xl">
          {results.map((item, i) => (
            <button
              key={item.id || i}
              onClick={() => handleSelect(item)}
              className="w-full px-4 py-3 text-left hover:bg-surface-3 transition-colors border-b border-surface-border last:border-0"
            >
              {renderResult ? renderResult(item) : (
                <div>
                  <p className="text-white font-medium">{item.name}</p>
                  <p className="text-slate-400 text-sm">{item.area}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### `apps/web/src/components/booking/BookingCalendar.jsx`

**This is the most critical UI component. Build it with extreme care.**

```jsx
// Full-featured booking calendar with:
// - Seat availability count on each date cell
// - Color-coded availability: green / yellow / red / full / past
// - Multi-select individual dates
// - Live price ticker as selection changes
// - Visual selected state with clear count
import { useState, useMemo } from 'react';
import { clsx } from 'clsx';

const DAYS = ['M', 'T', 'W', 'T', 'F']; // Mon-Fri only
const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function getSeatColor(available, total) {
  if (available === 0) return 'unavailable';
  const pct = available / total;
  if (pct > 0.7) return 'green';
  if (pct > 0.25) return 'yellow';
  return 'red';
}

export function BookingCalendar({
  year,
  month,                // 0-indexed
  inventory = [],       // [{ date: '2026-05-01', seats_available: 18, seats_total: 22 }]
  selectedDates = [],
  onToggleDate,
  disabled = false,
}) {
  // Build inventory lookup map
  const inventoryMap = useMemo(() => {
    const map = {};
    inventory.forEach(i => { map[i.date] = i; });
    return map;
  }, [inventory]);

  // Get all Mon-Fri dates in month
  const calendarDates = useMemo(() => {
    const dates = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date(); today.setHours(0,0,0,0);

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) { // Mon=1 to Fri=5
        dates.push({
          dateStr: d.toISOString().split('T')[0],
          day: d.getDate(),
          isPast: d < today,
          dow,
        });
      }
    }
    return dates;
  }, [year, month]);

  // Build week rows for grid layout
  const weeks = useMemo(() => {
    const rows = [];
    let week = new Array(5).fill(null);

    calendarDates.forEach((dateObj) => {
      const col = dateObj.dow - 1; // Mon=0, Fri=4
      week[col] = dateObj;

      // If Friday or last date, push row
      if (dateObj.dow === 5 || dateObj === calendarDates[calendarDates.length - 1]) {
        rows.push([...week]);
        week = new Array(5).fill(null);
      }
    });
    return rows;
  }, [calendarDates]);

  return (
    <div className="select-none">
      {/* Month header */}
      <p className="text-center text-slate-400 text-sm font-medium mb-4 tracking-wide uppercase">
        {MONTHS[month]} {year}
      </p>

      {/* Day headers */}
      <div className="grid grid-cols-5 gap-1 mb-2">
        {['Mon','Tue','Wed','Thu','Fri'].map(d => (
          <div key={d} className="text-center text-xs text-slate-500 font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-5 gap-1">
            {week.map((dateObj, di) => {
              if (!dateObj) {
                return <div key={di} />;
              }

              const inv = inventoryMap[dateObj.dateStr];
              const available = inv?.seats_available ?? null;
              const total = inv?.seats_total ?? 22;
              const isSelected = selectedDates.includes(dateObj.dateStr);
              const isPast = dateObj.isPast;
              const isFull = available === 0;
              const colorKey = available !== null ? getSeatColor(available, total) : 'unknown';

              return (
                <button
                  key={dateObj.dateStr}
                  onClick={() => !isPast && !isFull && !disabled && onToggleDate(dateObj.dateStr)}
                  disabled={isPast || isFull || disabled}
                  className={clsx(
                    'flex flex-col items-center justify-center rounded-xl py-2 px-1',
                    'transition-all duration-150 active:scale-95',
                    'border',
                    // Selected state
                    isSelected && 'bg-brand-500 border-brand-500 shadow-lg shadow-brand-500/30',
                    // Available states
                    !isSelected && !isPast && !isFull && colorKey === 'green' && 'bg-surface-2 border-green-500/20 hover:border-green-500/60',
                    !isSelected && !isPast && !isFull && colorKey === 'yellow' && 'bg-surface-2 border-yellow-500/20 hover:border-yellow-500/60',
                    !isSelected && !isPast && !isFull && colorKey === 'red' && 'bg-surface-2 border-red-500/30 hover:border-red-500/60',
                    // Unavailable states
                    (isPast || isFull) && 'bg-surface-1 border-surface-border opacity-40 cursor-not-allowed',
                  )}
                >
                  {/* Date number */}
                  <span className={clsx(
                    'text-sm font-semibold',
                    isSelected ? 'text-white' : 'text-slate-200',
                    (isPast || isFull) && 'text-slate-600',
                  )}>
                    {dateObj.day}
                  </span>

                  {/* Seat count dot / label */}
                  {!isPast && available !== null && (
                    <span className={clsx(
                      'text-[10px] mt-0.5 font-medium leading-none',
                      isSelected ? 'text-white/80' : '',
                      !isSelected && colorKey === 'green' && 'text-green-400',
                      !isSelected && colorKey === 'yellow' && 'text-yellow-400',
                      !isSelected && colorKey === 'red' && 'text-red-400',
                      isFull && 'text-slate-600',
                    )}>
                      {isFull ? 'Full' : available}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4">
        {[
          { color: 'bg-green-400', label: 'Available' },
          { color: 'bg-yellow-400', label: 'Limited' },
          { color: 'bg-red-400', label: 'Almost full' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### `apps/web/src/components/booking/PriceTicker.jsx`

```jsx
// Live price display that updates as user selects dates
// Show tier they're in and how many trips until next discount tier
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

const TIERS = [
  { min: 1,  max: 4,  rate: 250, label: 'Standard' },
  { min: 5,  max: 9,  rate: 210, label: 'Saver' },
  { min: 10, max: 15, rate: 175, label: 'Value' },
  { min: 16, max: 22, rate: 150, label: 'Best Value' },
];

function getNextTier(trips) {
  for (const tier of TIERS) {
    if (trips < tier.min) return { tripsNeeded: tier.min - trips, rate: tier.rate };
  }
  return null;
}

export function PriceTicker({ onwardTrips = 0, returnTrips = 0, pricing }) {
  if (onwardTrips === 0) {
    return (
      <div className="rounded-2xl bg-surface-2 border border-surface-border p-4 text-center">
        <p className="text-slate-400 text-sm">Select travel dates to see pricing</p>
      </div>
    );
  }

  const nextTier = getNextTier(onwardTrips);

  return (
    <div className="rounded-2xl bg-surface-2 border border-surface-border p-4 space-y-3">
      {/* Current total */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={pricing?.total}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="text-2xl font-bold text-white"
            >
              ₹{pricing?.total?.toLocaleString('en-IN') || 0}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="text-right">
          <p className="text-slate-400 text-xs">₹{pricing?.perTripOnward}/trip onward</p>
          {returnTrips > 0 && (
            <p className="text-slate-400 text-xs">₹{pricing?.perTripReturn}/trip return</p>
          )}
        </div>
      </div>

      {/* Breakdown */}
      <div className="text-xs text-slate-500 space-y-1 border-t border-surface-border pt-3">
        <div className="flex justify-between">
          <span>{onwardTrips} onward trips × ₹{pricing?.perTripOnward}</span>
          <span>₹{(onwardTrips * (pricing?.perTripOnward || 0)).toLocaleString('en-IN')}</span>
        </div>
        {returnTrips > 0 && (
          <div className="flex justify-between">
            <span>{returnTrips} return trips × ₹{pricing?.perTripReturn}</span>
            <span>₹{(returnTrips * (pricing?.perTripReturn || 0)).toLocaleString('en-IN')}</span>
          </div>
        )}
      </div>

      {/* Next tier nudge */}
      {nextTier && (
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl px-3 py-2">
          <p className="text-brand-500 text-xs font-medium">
            Add {nextTier.tripsNeeded} more {nextTier.tripsNeeded === 1 ? 'day' : 'days'} to unlock ₹{nextTier.rate}/trip →
          </p>
        </div>
      )}
    </div>
  );
}
```

### `apps/web/src/components/survey/SurveyShell.jsx`

```jsx
// Wraps all survey steps. Handles progress bar + back nav.
import { motion, AnimatePresence } from 'framer-motion';
import { useSurveyStore } from '@/store/surveyStore';
import { Button } from '@/components/ui/Button';

export function SurveyShell({ children }) {
  const { step, totalSteps, prevStep } = useSurveyStore();
  const progress = ((step - 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 pt-safe pt-4 pb-2">
        {step > 1 && (
          <button onClick={prevStep} className="p-2 text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-slate-400 text-xs tabular-nums">
          {step}/{totalSteps}
        </span>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -30, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 px-4 py-6"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

### `apps/web/src/components/home/TripCard.jsx`

```jsx
// The core home screen card. Three states:
// 1. active — live bus location, ETA
// 2. today — countdown to departure
// 3. idle — next trip reminder + savings
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';

function Countdown({ departureTime }) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const target = new Date();
    const [h, m] = departureTime.split(':');
    target.setHours(parseInt(h), parseInt(m), 0, 0);

    const tick = () => {
      const diff = Math.max(0, Math.floor((target - new Date()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [departureTime]);

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;

  return (
    <div className="flex gap-2 items-end">
      {h > 0 && <Unit value={h} label="hr" />}
      <Unit value={m} label="min" />
      <Unit value={s} label="sec" />
    </div>
  );
}

function Unit({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-white tabular-nums">
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export function TripCard({ tripState, activeTrip, nextTrip, savingsThisMonth }) {
  if (tripState === 'active') {
    return (
      <Card glass className="space-y-3">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-green-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-green-400 text-sm font-medium">Live — Bus approaching</span>
        </div>
        <div>
          <p className="text-white text-xl font-bold">Your stop in {activeTrip?.etaMinutes} min</p>
          <p className="text-slate-400 text-sm mt-1">{activeTrip?.stopName}</p>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-surface-border">
          <div className="w-8 h-8 rounded-xl bg-surface-3 flex items-center justify-center text-xs font-bold text-white">
            {activeTrip?.busNumber}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{activeTrip?.driverName}</p>
            <p className="text-slate-400 text-xs">{activeTrip?.busPlate}</p>
          </div>
        </div>
        {/* Map placeholder — integrate MapLibre GL here */}
        <div className="h-36 bg-surface-3 rounded-xl flex items-center justify-center text-slate-500 text-sm">
          Live map
        </div>
      </Card>
    );
  }

  if (tripState === 'today') {
    return (
      <Card glass className="space-y-4">
        <p className="text-slate-400 text-sm">Your bus departs in</p>
        <Countdown departureTime={nextTrip?.departureTime} />
        <div className="border-t border-surface-border pt-3 space-y-1">
          <p className="text-white font-medium">{nextTrip?.stopName}</p>
          <p className="text-slate-400 text-sm">→ {nextTrip?.destination}</p>
        </div>
      </Card>
    );
  }

  // Idle state
  return (
    <Card glass className="space-y-4">
      <div>
        <p className="text-slate-400 text-sm">Next trip</p>
        <p className="text-white text-xl font-semibold mt-1">
          {nextTrip ? new Date(nextTrip.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }) : 'No trips booked'}
        </p>
        {nextTrip && <p className="text-slate-400 text-sm">{nextTrip.departureTime} · {nextTrip.stopName}</p>}
      </div>

      {savingsThisMonth > 0 && (
        <div className="flex items-center gap-3 bg-brand-500/10 rounded-xl px-3 py-2.5">
          <span className="text-xl">💰</span>
          <div>
            <p className="text-brand-500 font-semibold text-sm">
              ₹{savingsThisMonth.toLocaleString('en-IN')} saved this month
            </p>
            <p className="text-slate-400 text-xs">vs Uber/Ola</p>
          </div>
        </div>
      )}
    </Card>
  );
}
```

---

## 8. UX Rules & Design System

### The Zero-Click Principles

Every screen must be evaluated against these rules before shipping:

1. **No text input unless absolutely unavoidable.** Names, emails, phone — captured via Google One-Tap. Everything else is chips, toggles, or search.
2. **Maximum 1 primary action per screen.** One big green button. User never has to decide what to tap.
3. **Instant feedback on every tap.** Active scale animation + state change within 16ms. No loading spinners on selections.
4. **Never ask a question you can answer yourself.** User's apartment — offer their GPS location. User's schedule — pre-select weekdays. User's office gate — check DB first.
5. **Errors are prevented, not corrected.** Disable full dates before user taps them. Show seat count before they try to book. Never show an error after form submission if you can validate beforehand.

### Screen Flow Rules

- **No horizontal swipe navigation.** Vertical stack only. Mobile-native.
- **Bottom sheet for supplementary actions.** Never a new page for sub-selections (gate picker, time picker).
- **Sticky CTAs.** The primary action button is always pinned to the bottom of the viewport, never scrolled off-screen.
- **Progress is always visible** in multi-step flows. User always knows where they are.
- **Success screens are celebrations**, not receipts. Minimal text. Confetti or motion. Refer + WhatsApp opt-in as the only next actions.

### Dark Theme Color Usage

| Context | Color | Tailwind |
|---|---|---|
| Primary action | Brand green | `bg-brand-500` |
| Selected state | Green tint | `bg-brand-500/20 border-brand-500` |
| Card background | Dark navy | `bg-surface-2` |
| Input background | Slightly lighter | `bg-surface-2` |
| Destructive | Red | `text-red-400` |
| Muted text | Slate | `text-slate-400` |
| Success/available | Green | `text-green-400` |
| Warning/limited seats | Amber | `text-yellow-400` |
| Danger/near full | Red | `text-red-400` |

### Motion Principles

- **Step transitions:** Slide left/right (x-axis, 30px, 200ms ease-out)
- **Element entrance:** Fade + slide up (y-axis, 20px, 200ms)
- **Price changes:** Number flips (y-axis AnimatePresence)
- **Live indicators:** Soft pulse (opacity 1→0.3→1, 1.5s loop)
- **Button press:** scale(0.95) on active, 150ms

### Typography Scale

| Element | Size | Weight |
|---|---|---|
| Page title | `text-2xl` (24px) | `font-bold` |
| Section label | `text-base` (16px) | `font-semibold` |
| Body | `text-sm` (14px) | `font-normal` |
| Caption / label | `text-xs` (12px) | `font-medium` |
| Price | `text-2xl` | `font-bold` |

---

## 9. Third-Party Integrations

### Google One-Tap Setup

In `index.html`:
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

In `GoogleOneTap.jsx`:
```jsx
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export function GoogleOneTap({ onSuccess }) {
  const setAuth = useAuthStore(s => s.setAuth);

  useEffect(() => {
    window.google?.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        const data = await api.post('/auth/google', { credential });
        localStorage.setItem('tt_token', data.token);
        setAuth(data);
        onSuccess?.(data);
      },
      auto_select: true,
    });
    window.google?.accounts.id.prompt();
  }, []);

  return null; // One-Tap renders its own UI
}
```

### Razorpay Payment

```javascript
// apps/api/src/services/razorpay.service.js
const Razorpay = require('razorpay');
const crypto = require('crypto');

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createRazorpayOrder = async (amountPaise) => {
  return rzp.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `tt_${Date.now()}`,
  });
};

exports.verifyWebhookSignature = (body, signature) => {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
};
```

Frontend payment trigger:
```javascript
// In BookingReview.jsx — after createOrder API call
function openRazorpay(order) {
  const rzp = new window.Razorpay({
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    order_id: order.razorpayOrder.id,
    amount: order.razorpayOrder.amount,
    currency: 'INR',
    name: 'Tellapur Transit',
    description: 'Seat booking',
    theme: { color: '#22c55e' },
    handler: (response) => {
      // Payment success — navigate to confirmation
      navigate('/booking/confirm', { state: { bookingId: order.booking.id } });
    },
  });
  rzp.open();
}
```

---

## 10. Build & Deployment

### `package.json` (root)

```json
{
  "name": "tellapur-transit",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "db:migrate": "node apps/api/scripts/migrate.js"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### `apps/api/package.json`

```json
{
  "name": "@tt/api",
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "express": "^4.19.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "pg": "^8.11.0",
    "redis": "^4.6.0",
    "jsonwebtoken": "^9.0.0",
    "google-auth-library": "^9.0.0",
    "razorpay": "^2.9.0",
    "axios": "^1.6.0",
    "typesense": "^1.8.0",
    "dotenv": "^16.0.0"
  }
}
```

### `apps/web/package.json`

```json
{
  "name": "@tt/web",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "zustand": "^4.5.0",
    "framer-motion": "^11.0.0",
    "axios": "^1.6.0",
    "clsx": "^2.1.0",
    "react-day-picker": "^8.10.0",
    "date-fns": "^3.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.1.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### Railway Deployment

1. Create two Railway services: `api` and `web`
2. Point `api` to `apps/api`, build command: `npm install && npm run db:migrate`
3. Point `web` to `apps/web`, build command: `npm install && npm run build`, publish dir: `dist`
4. Set all env vars in Railway dashboard
5. `api` service: add PostgreSQL plugin (or point to Neon URL directly)
6. `api` service: add Redis plugin

### Database Migration Script

`apps/api/scripts/migrate.js`:
```javascript
require('dotenv').config();
const { pool } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../migrations/001_initial_schema.sql'),
    'utf8'
  );
  await pool.query(sql);
  console.log('Migration complete');
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
```

---

## Implementation Checklist

### Week 1 — Survey Live
- [ ] Turborepo scaffold + monorepo setup
- [ ] Database migration on Neon
- [ ] Auth API + Google One-Tap frontend
- [ ] Apartment search (DB fuzzy search)
- [ ] Office search (DB → Typesense → Google Places)
- [ ] Survey 4-step flow with all chip components
- [ ] Survey submit API
- [ ] Deploy API to Railway, web to Vercel/Railway

### Week 2 — Admin + Route Decision
- [ ] Admin dashboard: survey stats view
- [ ] OD matrix view (which corridors have density)
- [ ] Admin: create routes, stops, shifts
- [ ] Publish routes → unlock booking feature flag

### Week 3 — Booking Flow
- [ ] Inventory API (full month in one call)
- [ ] BookingCalendar component with seat counts
- [ ] PriceTicker live update
- [ ] Seat hold via Redis
- [ ] Razorpay order creation + webhook
- [ ] Booking confirmation screen

### Week 4 — Rider Home Screen
- [ ] TripCard 3-state component
- [ ] MyTrips page (upcoming + past)
- [ ] Savings ticker
- [ ] Socket.io groundwork
- [ ] Profile + notification preferences

---

*End of implementation document. All components listed are exhaustive for Stages 1–3.*
