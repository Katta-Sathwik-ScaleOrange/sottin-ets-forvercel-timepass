# Tellapur Transit — Build Summary

**Date:** 25 April 2026  
**Repo:** https://github.com/sott-in/sottin-ets.git  
**Stack:** React 18 + Vite + Tailwind · Node.js + Express · PostgreSQL (Neon) + PostGIS · Redis · Turborepo

---

## What Was Built (106 files · 9,173 lines)

### Backend API (`apps/api/`)

| Layer | Files | Details |
|---|---|---|
| **Server** | `src/index.js` | Express entry, helmet, CORS, morgan, 9 route mounts |
| **Config** | `db.js`, `redis.js`, `env.js` | Neon PG pool, Redis client, env validation |
| **Middleware** | `auth.js`, `adminAuth.js`, `errorHandler.js` | JWT verify, role check, global error handler |
| **Auth** | routes + controller | Google One-Tap login, user upsert, JWT issue |
| **Apartments** | routes + controller | Fuzzy search (pg_trgm), user suggestion flow |
| **Offices** | routes + controller | 3-tier search: local DB → Typesense → Google Places |
| **Survey** | routes + controller | 4-step survey submit (upsert per user) |
| **Inventory** | routes + controller | Full-month seat data in 1 call, atomic seat holds via Redis TTL |
| **Bookings** | routes + controller | Razorpay order creation, idempotent webhook, booking history |
| **Routes** | routes + controller | Active routes with shifts & stops (JSON aggregated) |
| **Trips** | routes + controller | Active trip detection, GPS ping endpoint (Stage 3 skeleton) |
| **Admin** | routes + controller | Survey stats, OD matrix, route CRUD, publish, inventory view |
| **Services** | 5 files | Pricing tiers, Razorpay, Google Places API, Typesense, WhatsApp |
| **Database** | migration SQL | Full schema: 9 tables, PostGIS + pg_trgm, 2 views, triggers |
| **Seed Data** | 2 JSON files | 50 apartments (Tellapur/Gopanpally/Kollur), 25 offices (Madhapur/FD/Gachibowli) |
| **Scripts** | `migrate.js`, `seed.js` | DB migration runner, seed data loader |

### Rider Frontend (`apps/web/`)

| Layer | Files | Details |
|---|---|---|
| **Config** | vite, tailwind, postcss, index.html | Path aliases, API proxy, dark theme, Inter font, Google One-Tap script |
| **Design System** | `index.css` | CSS variables, custom scrollbar, dark theme tokens |
| **UI Primitives** | 11 components | Button, Chip/ChipGroup/ChipRadio, Card, Input, Avatar, Badge, Spinner, Toast, Modal, BottomSheet, ProgressBar |
| **Shared** | 4 components | LocationSearch (debounced), GoogleOneTap, AppHeader, BottomNav |
| **Survey Flow** | 6 components | SurveyShell (progress bar + AnimatePresence), ApartmentStep, OfficeStep, ScheduleStep, TimingStep, SurveyConfirm (with success celebration) |
| **Booking Flow** | 5 components | RouteCard, ShiftSelector, BookingCalendar (color-coded seats), PriceTicker (tier nudges), BookingReview |
| **Home Screen** | 4 components | TripCard (3-state: active/today/idle), LiveTrackMap (placeholder), NextTripReminder, SavingsTicker |
| **Pages** | 7 pages | Landing, Home, Survey, Booking, BookingConfirm, MyTrips, Profile |
| **State** | 3 Zustand stores | authStore (persist), surveyStore, bookingStore |
| **Libs** | `api.js`, `pricing.js`, `utils.js` | Axios + JWT interceptor, frontend pricing calc, formatters |
| **Hooks** | 3 hooks | useAuth, useInventory, usePricing |

### Admin Dashboard (`apps/admin/`) — Skeleton

4 page scaffolds: SurveyDashboard, RouteBuilder, InventoryManager, LiveOps

### Shared Package (`packages/shared/`)

JSDoc type definitions for User, Apartment, Office, PricingResult

---

## Tasks To Do

### 🔴 Critical — Before First Launch

- [ ] **Set up Google OAuth credentials** — Create a project in Google Cloud Console, enable OAuth 2.0, get Client ID. Add to both `apps/api/.env` (`GOOGLE_CLIENT_ID`) and `apps/web/.env` (`VITE_GOOGLE_CLIENT_ID`)
- [ ] **Set a real JWT secret** — Replace the placeholder in `apps/api/.env` with a random 64-char string
- [ ] **Run database migration** — Execute `npm run db:migrate` to create all tables on Neon
- [ ] **Run database seed** — Execute `npm run db:seed` to populate apartments and offices
- [ ] **Test the dev server** — Run `npm run dev` and verify both API (`:3001`) and web (`:5173`) start

### 🟡 Required for Stage 2 (Booking)

- [ ] **Set up Razorpay** — Create a Razorpay account, get Key ID + Secret + Webhook Secret. Add to `apps/api/.env`
- [ ] **Set up Redis** — Install Redis locally or use a cloud provider (Upstash). Update `REDIS_URL` in `.env`
- [ ] **Set up Typesense** — Install Typesense or use Typesense Cloud. Update host/port/key in `.env`
- [ ] **Configure Razorpay webhook** — Point `POST /api/bookings/webhook` in Razorpay dashboard to your deployed API URL
- [ ] **Load Razorpay checkout script** — Add `<script src="https://checkout.razorpay.com/v1/checkout.js"></script>` to `apps/web/index.html`
- [ ] **Set up Google Places API** — Enable Places API (New) in Google Cloud, add key to `.env`
- [ ] **Create first route via Admin** — Use admin API endpoints to create a route, add stops, add shifts, and publish

### 🟢 Required for Stage 3 (Rider)

- [ ] **Implement MapLibre GL** — Replace the placeholder in `LiveTrackMap.jsx` with actual MapLibre GL JS map rendering using OSM tiles
- [ ] **Set up Socket.io** — Add real-time seat count updates and live bus tracking via WebSocket
- [ ] **Set up MQTT broker** — For bus GPS telemetry ingestion
- [ ] **Set up Firebase Cloud Messaging** — For in-app push notifications
- [ ] **Build WhatsApp templates** — Create message templates in WhatsApp Business API for booking confirmation, trip reminder, booking window open

### 🔵 Polish & Enhancement

- [ ] **Build out Admin Dashboard** — Full UI for SurveyDashboard (charts), RouteBuilder (map + form), InventoryManager (calendar grid), LiveOps (live map)
- [ ] **Add error boundaries** — Wrap pages in React error boundaries
- [ ] **Add loading skeletons** — Replace spinners with skeleton loading states
- [ ] **Add PWA manifest** — For "Add to Home Screen" on mobile
- [ ] **Set up CI/CD** — GitHub Actions for lint, build, deploy
- [ ] **Deploy to Railway/Vercel** — API on Railway, web on Vercel/Railway
- [ ] **Add privacy policy page** — Required for DPDP Act compliance before public launch
- [ ] **Add apartment polygon data** — Source from OpenStreetMap Overpass API + Microsoft Planetary Computer
- [ ] **Implement refresh token flow** — Currently the refresh endpoint is a stub

---

## Environment Variables Checklist

### `apps/api/.env`

| Variable | Status | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ Set | Neon connection string included |
| `JWT_SECRET` | ⚠️ Placeholder | Replace with random 64-char string |
| `GOOGLE_CLIENT_ID` | ❌ Needed | From Google Cloud Console |
| `REDIS_URL` | ⚠️ Default | Points to localhost:6379 |
| `GOOGLE_PLACES_API_KEY` | ❌ Needed | From Google Cloud Console |
| `TYPESENSE_HOST` | ⚠️ Default | Points to localhost:8108 |
| `TYPESENSE_API_KEY` | ❌ Needed | From Typesense instance |
| `RAZORPAY_KEY_ID` | ❌ Needed | From Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | ❌ Needed | From Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | ❌ Needed | From Razorpay dashboard |
| `WHATSAPP_API_TOKEN` | ❌ Needed | From Meta Business Suite |
| `WHATSAPP_PHONE_NUMBER_ID` | ❌ Needed | From Meta Business Suite |

### `apps/web/.env`

| Variable | Status | Notes |
|---|---|---|
| `VITE_API_URL` | ✅ Set | localhost:3001/api |
| `VITE_GOOGLE_CLIENT_ID` | ❌ Needed | Same as API's GOOGLE_CLIENT_ID |
| `VITE_RAZORPAY_KEY_ID` | ❌ Needed | Same as API's RAZORPAY_KEY_ID |
| `VITE_APP_STAGE` | ✅ Set | `survey` |

---

## Quick Start Commands

```bash
# Install dependencies
npm install

# Run database migration
npm run db:migrate

# Seed apartments & offices
npm run db:seed

# Start dev servers (API + Web)
npm run dev
```

---

*Generated from implementation of tellapur-transit-impl.md and requirements document.md*
