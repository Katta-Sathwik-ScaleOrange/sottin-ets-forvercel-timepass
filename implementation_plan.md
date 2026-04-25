# Tellapur Transit — Implementation Plan

A fixed-route, pre-committed seat bus service connecting Tellapur residential clusters with IT corridors in Hyderabad. Built as a Turborepo monorepo with three apps: **API** (Node.js + Express), **Web** (React + Vite + Tailwind), and **Admin** (React + Vite + Tailwind).

## User Review Required

> [!IMPORTANT]
> **Database Connection**: The implementation document includes a Neon PostgreSQL connection string. I will use this for migration but will place it in `.env` files (which are `.gitignore`-d). Confirm this is acceptable.

> [!WARNING]
> **Third-party API Keys Required**: The following services need real API keys to function. I will scaffold placeholder `.env` files — you will need to provide actual keys:
> - Google OAuth Client ID (for Google One-Tap login)
> - Google Places API Key (office search fallback)
> - Typesense API Key (fuzzy search)
> - Razorpay Key ID + Secret (payments — Stage 2)
> - WhatsApp Business API Token (notifications — Stage 2)

> [!IMPORTANT]
> **TailwindCSS**: The implementation document specifies TailwindCSS v3.4. I will use Tailwind as prescribed since the entire design system, component library, and implementation document are written around Tailwind utility classes.

## Open Questions

1. **Scope for this session** — The implementation document covers 4 weeks of work. Should I build everything at once, or start with **Week 1 (Survey Live)** only?
2. **Apartment seed data** — The requirements mention ~50 pre-seeded apartment complexes in Tellapur/Gopanpalle/Kollur. Do you have this data, or should I create a representative sample?
3. **Office seed data** — Same question for office buildings in Madhapur/Financial District/Gachibowli.
4. **Google OAuth Client ID** — Do you have one ready, or should I set up the auth flow with a placeholder for now?

## Proposed Changes

This follows the exact architecture from `tellapur-transit-impl.md`. I'll implement file-by-file as specified.

---

### Phase 1: Monorepo Scaffold & Configuration

#### [NEW] Root package.json
- Turborepo workspace configuration
- Workspace scripts: `dev`, `build`, `db:migrate`

#### [NEW] turbo.json
- Pipeline configuration for `dev`, `build`, `lint`

#### [MODIFY] .gitignore
- Extended for monorepo: `node_modules`, `.env`, `dist`, etc.

---

### Phase 2: Backend API (`apps/api/`)

#### [NEW] apps/api/package.json
- Express, pg, redis, jsonwebtoken, google-auth-library, razorpay, typesense, etc.

#### [NEW] apps/api/.env
- Template with all required environment variables

#### [NEW] apps/api/src/index.js
- Express server entry point with helmet, cors, morgan
- Route mounting for all API modules
- Raw body parsing for Razorpay webhook

#### Config Layer
#### [NEW] apps/api/src/config/db.js
- Neon PostgreSQL pool with SSL

#### [NEW] apps/api/src/config/redis.js
- Redis client for seat holds

#### [NEW] apps/api/src/config/env.js
- Validated environment variable access

#### Middleware
#### [NEW] apps/api/src/middleware/auth.js
- JWT verification middleware

#### [NEW] apps/api/src/middleware/adminAuth.js
- Admin/Ops role check middleware

#### [NEW] apps/api/src/middleware/errorHandler.js
- Global error handler

#### Utilities
#### [NEW] apps/api/src/utils/jwt.js
- Sign & verify JWT tokens

#### [NEW] apps/api/src/utils/asyncHandler.js
- Async route handler wrapper

#### Routes & Controllers
#### [NEW] apps/api/src/routes/auth.routes.js + controllers/auth.controller.js
- `POST /api/auth/google` — Google One-Tap login, upsert user, return JWT

#### [NEW] apps/api/src/routes/apartments.routes.js + controllers/apartments.controller.js
- `GET /api/apartments/search?q=` — Fuzzy search (pg_trgm)
- `POST /api/apartments/suggest` — User suggests missing apartment

#### [NEW] apps/api/src/routes/offices.routes.js + controllers/offices.controller.js
- `GET /api/offices/search?q=` — 3-tier fallback (DB → Typesense → Google Places)
- `POST /api/offices` — Cache office from Google Places
- `PATCH /api/offices/:id` — Admin enrich/verify

#### [NEW] apps/api/src/routes/survey.routes.js + controllers/survey.controller.js
- `POST /api/survey` — Submit survey (upsert per user)
- `GET /api/survey/me` — Get current user's response

#### [NEW] apps/api/src/routes/inventory.routes.js + controllers/inventory.controller.js
- `GET /api/inventory/:shiftId/:year/:month` — Full month seat data
- `POST /api/inventory/hold` — Atomic seat hold with Redis TTL
- `DELETE /api/inventory/hold` — Release hold

#### [NEW] apps/api/src/routes/bookings.routes.js + controllers/bookings.controller.js
- `POST /api/bookings` — Create Razorpay order + pending booking
- `POST /api/bookings/webhook` — Razorpay webhook (idempotent)
- `GET /api/bookings/me` — User's booking history

#### [NEW] apps/api/src/routes/routes.routes.js
- Route CRUD for admin (get active routes for riders)

#### [NEW] apps/api/src/routes/trips.routes.js + controllers/trips.controller.js
- `GET /api/trips/active` — Stage 3 skeleton
- `POST /api/trips/ping` — GPS ping from bus

#### [NEW] apps/api/src/routes/admin.routes.js + controllers/admin.controller.js
- `GET /api/admin/survey/stats` — Survey analytics
- `GET /api/admin/survey/od-matrix` — OD matrix view
- `POST /api/admin/routes` — Create route
- `PATCH /api/admin/routes/:id/publish` — Publish route

#### Services
#### [NEW] apps/api/src/services/pricing.service.js
- Tiered pricing calculator (1-4: ₹250, 5-9: ₹210, 10-15: ₹175, 16-22: ₹150)
- Return flat rate: ₹130/trip

#### [NEW] apps/api/src/services/razorpay.service.js
- Order creation + webhook signature verification

#### [NEW] apps/api/src/services/google-places.service.js
- Google Places API (New) integration for office search fallback

#### [NEW] apps/api/src/services/typesense.service.js
- Typesense fuzzy search for offices

#### [NEW] apps/api/src/services/whatsapp.service.js
- WhatsApp Business API notifications

#### Database
#### [NEW] apps/api/migrations/001_initial_schema.sql
- Full schema: users, apartments, offices, routes, stops, shifts, seat_inventory, bookings, survey_responses, seat_holds
- PostGIS + pg_trgm extensions
- Views: seat_availability, survey_od_matrix

#### [NEW] apps/api/seeds/apartments.json
- ~50 apartment complexes in Tellapur area (sample data)

#### [NEW] apps/api/seeds/offices.json
- Office buildings in Madhapur/FD/Gachibowli (sample data)

#### [NEW] apps/api/scripts/migrate.js
- Migration runner script

#### [NEW] apps/api/scripts/seed.js
- Seed data loader

---

### Phase 3: Rider Frontend (`apps/web/`)

#### [NEW] apps/web/package.json
- React 18, react-router-dom, zustand, framer-motion, axios, clsx, TailwindCSS

#### [NEW] apps/web/vite.config.js
- Vite config with React plugin, path aliases, API proxy

#### [NEW] apps/web/tailwind.config.js
- Custom brand colors, surface colors, Inter font, animations

#### [NEW] apps/web/postcss.config.js
- Tailwind + Autoprefixer

#### [NEW] apps/web/index.html
- HTML entry with Google One-Tap script, Inter font

#### [NEW] apps/web/src/index.css
- Tailwind directives + CSS custom properties (dark theme)

#### [NEW] apps/web/src/main.jsx
- React DOM render entry

#### [NEW] apps/web/src/App.jsx
- React Router setup with all page routes, auth guard

#### State Management
#### [NEW] apps/web/src/store/authStore.js
- Zustand store with persist (user, token, hasSurvey)

#### [NEW] apps/web/src/store/surveyStore.js
- Survey step state, selections, payload builder

#### [NEW] apps/web/src/store/bookingStore.js
- Route, shift, date selection, pricing state

#### Utilities & Hooks
#### [NEW] apps/web/src/lib/api.js
- Axios instance with JWT interceptors

#### [NEW] apps/web/src/lib/utils.js
- Common utility functions

#### [NEW] apps/web/src/lib/pricing.js
- Frontend pricing calculator (display only)

#### [NEW] apps/web/src/hooks/useAuth.js
- Auth state hook

#### [NEW] apps/web/src/hooks/useInventory.js
- Inventory data fetching hook

#### [NEW] apps/web/src/hooks/usePricing.js
- Real-time pricing calculation hook

#### UI Primitives (`components/ui/`)
#### [NEW] Button.jsx — Primary/secondary/ghost/danger variants, loading state
#### [NEW] Chip.jsx — Single/multi-select chip groups (ChipGroup, ChipRadio)
#### [NEW] Card.jsx — Surface card with glass variant
#### [NEW] Input.jsx — Styled text input
#### [NEW] Avatar.jsx — User avatar
#### [NEW] Badge.jsx — Status badges
#### [NEW] Spinner.jsx — Loading spinner
#### [NEW] Toast.jsx — Toast notifications
#### [NEW] Modal.jsx — Modal dialog
#### [NEW] BottomSheet.jsx — Bottom sheet for sub-selections
#### [NEW] ProgressBar.jsx — Animated progress bar

#### Shared Components (`components/shared/`)
#### [NEW] LocationSearch.jsx — Reusable apartment/office search with debounce
#### [NEW] GoogleOneTap.jsx — Google One-Tap integration
#### [NEW] AppHeader.jsx — App header bar
#### [NEW] BottomNav.jsx — Bottom navigation (Survey/Book/Home/Trips/Profile)

#### Survey Flow (`components/survey/`)
#### [NEW] SurveyShell.jsx — Step wrapper with progress bar, back nav, AnimatePresence
#### [NEW] ApartmentStep.jsx — Step 1: Apartment search & selection
#### [NEW] OfficeStep.jsx — Step 2: Office search with gate picker
#### [NEW] ScheduleStep.jsx — Step 3: Day chips + estimated days
#### [NEW] TimingStep.jsx — Step 4: Morning/evening band selection
#### [NEW] SurveyConfirm.jsx — Review + submit + success screen

#### Booking Flow (`components/booking/`)
#### [NEW] RouteCard.jsx — Route display with shifts & availability
#### [NEW] ShiftSelector.jsx — Onward/return shift selection
#### [NEW] BookingCalendar.jsx — Custom calendar with seat counts, color-coded availability
#### [NEW] PriceTicker.jsx — Live price with tier nudges, AnimatePresence number flip
#### [NEW] BookingReview.jsx — Review + Razorpay payment trigger

#### Home Screen (`components/home/`)
#### [NEW] TripCard.jsx — 3-state card (active/today/idle)
#### [NEW] LiveTrackMap.jsx — MapLibre GL integration (Stage 3)
#### [NEW] NextTripReminder.jsx — Next trip display
#### [NEW] SavingsTicker.jsx — Monthly savings vs Uber

#### Pages
#### [NEW] Landing.jsx — Pre-auth landing with Google One-Tap
#### [NEW] Home.jsx — Stage-aware home screen
#### [NEW] Survey.jsx — Survey page (renders SurveyShell + steps)
#### [NEW] Booking.jsx — Booking flow page
#### [NEW] BookingConfirm.jsx — Booking confirmation + Add to Calendar
#### [NEW] MyTrips.jsx — Upcoming + past trips
#### [NEW] Profile.jsx — User profile, apartment/office edit, WhatsApp toggle

---

### Phase 4: Admin Dashboard (`apps/admin/`) — Skeleton

#### [NEW] apps/admin/package.json
#### [NEW] apps/admin/src/pages/SurveyDashboard.jsx — Survey stats + response counts
#### [NEW] apps/admin/src/pages/RouteBuilder.jsx — Create routes, stops, shifts
#### [NEW] apps/admin/src/pages/InventoryManager.jsx — Seat inventory calendar view
#### [NEW] apps/admin/src/pages/LiveOps.jsx — Stage 3 live map skeleton

---

### Phase 5: Shared Package

#### [NEW] packages/shared/types/index.js — JSDoc type definitions shared across apps

---

## Verification Plan

### Automated Tests
- `npm install` in root — all workspaces resolve
- `npm run dev` — both API and web start without errors
- API health check: `GET /api/auth` returns expected response
- Frontend renders at `localhost:5173` with the dark theme landing page

### Manual Verification
- Visual check of the landing page, survey flow UI, and booking calendar
- Confirm all API routes respond (via browser DevTools / Postman)
- Verify Tailwind design system matches spec (dark theme, brand green, Inter font)
