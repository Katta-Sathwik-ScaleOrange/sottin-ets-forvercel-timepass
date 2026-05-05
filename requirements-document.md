# Tellapur Transit — Product Requirements Document

**Version:** 1.0  
**Product:** Tellapur Transit — Fixed-route corporate commute bus service  
**Geography:** Tellapur / Gopanpalle / Kollur → Madhapur / Financial District / Gachibowli, Hyderabad  
**Date:** April 2026

---

## 1. Product Vision

Tellapur Transit is a **fixed-route, pre-committed seat bus service** connecting residential apartment clusters in Tellapur with IT office corridors in Hyderabad. It is a scheduled transit product — not an on-demand or aggregator service. The operator defines routes, stops, and shift times. Users choose from what is available.

The product evolves across three distinct stages, each unlocking progressively as the business scales.

---

## 2. Business Rules (Non-Negotiable)

| Rule | Detail |
|---|---|
| **Routes are fixed** | Operator defines routes. Users cannot request custom routes. |
| **Stops are fixed** | Pickup and drop points are predefined on each route. |
| **Shifts are fixed** | Departure times are set by the operator. No custom timings. |
| **Days of operation** | Monday to Friday only. |
| **Seat capacity** | 22 seats per bus per shift. |
| **Booking window** | Opens on the **25th of each month** for the following month only. |
| **Day selection** | Users pre-select **specific dates** they will travel. No blanket monthly passes. |
| **No cancellations** | Once booked, a seat cannot be cancelled. No refunds. |
| **No-show policy** | No-show = seat and full amount forfeited. No exceptions. |
| **No phone bookings** | All bookings are digital-only, self-serve. No call centre. |
| **No flexibility** | No route changes, shift changes, or date swaps post-booking. |
| **Payment** | Online only via Razorpay (UPI + cards). No cash, no invoicing at launch. |

---

## 3. Application Stages

### Stage 1 — Survey Mode
**Trigger:** App launch (now)  
**Purpose:** Collect demand data to determine viable routes and shift times.  
**Home screen:** Single survey CTA card.  
**No payments, no bookings.**

### Stage 2 — Booking Mode
**Trigger:** Admin publishes confirmed routes after survey analysis.  
**Purpose:** Users book specific seats on specific dates.  
**Home screen:** Survey + Book buttons visible.

### Stage 3 — Rider Mode
**Trigger:** User completes first paid booking.  
**Purpose:** Live trip experience — tracking, countdowns, history.  
**Home screen:** Full-screen trip card (3 states). Survey + Book move to navigation menu.

---

## 4. User Roles

| Role | Description |
|---|---|
| **Rider** | End user. Surveys, books seats, tracks trips. |
| **Admin** | Internal operator. Manages routes, stops, shifts, inventory, and publishes routes. |
| **Ops** | Field operations. Views live bus locations and passenger manifests. |

---

## 5. Functional Requirements

### 5.1 Authentication

**FR-AUTH-01:** Users authenticate exclusively via **Google One-Tap** sign-in.  
**FR-AUTH-02:** Google One-Tap captures name, email, and profile photo. Zero typing required.  
**FR-AUTH-03:** On first login, a user account is created automatically (upsert).  
**FR-AUTH-04:** Authentication returns a **JWT token** stored client-side.  
**FR-AUTH-05:** JWT must be included in all authenticated API requests as a Bearer token.  
**FR-AUTH-06:** Token expiry is 7 days. Users are silently re-authenticated via One-Tap on expiry.  
**FR-AUTH-07:** Admin and Ops roles are assigned manually in the database. No self-registration for these roles.

---

### 5.2 Apartment Selection (Survey + Profile)

**FR-APT-01:** The system maintains a pre-seeded database of ~50 apartment complexes in the Tellapur / Gopanpalle / Kollur radius.  
**FR-APT-02:** Users search for their apartment via a fuzzy text search field.  
**FR-APT-03:** Search is performed against the local database. No external API calls for apartments.  
**FR-APT-04:** Search results display apartment name and area label.  
**FR-APT-05:** If an apartment is not found, the user may submit it via a text field. The submission is queued for admin review. The raw name is captured in the survey response.  
**FR-APT-06:** Apartments include: name, aliases array (for fuzzy matching), area, lat/lng coordinates, PostGIS geometry point, and optionally a building polygon (GeoJSON).  
**FR-APT-07:** Building polygon data is sourced from OpenStreetMap Overpass API and Microsoft Planetary Computer building footprints. Gaps are filled by manual polygon drawing in QGIS and imported to PostGIS.  
**FR-APT-08:** The PostGIS `ST_Within` function is used to auto-detect a user's apartment from their GPS location (Stage 3 feature — build polygon DB now, use in rider app later).

---

### 5.3 Office Selection (Survey + Profile)

**FR-OFF-01:** The system maintains a cached database of office buildings in Madhapur, Financial District, Gachibowli, and Nanakramguda.  
**FR-OFF-02:** Office search uses a **three-tier fallback strategy:**
1. Local PostgreSQL database (cached offices, ordered by selection count)
2. Typesense fuzzy search index
3. Google Places API (only if local results < 3)

**FR-OFF-03:** When a user selects a Google Places result, it is immediately cached in the local database for all future users. Subsequent searches for the same office never hit Google Places API.  
**FR-OFF-04:** Each office record includes: name, short name, aliases array, area, lat/lng, PostGIS point, building polygon (where available), Google Place ID, gate sub-points (label + lat/lng), verification status, and selection count.  
**FR-OFF-05:** For large campuses (e.g. Amazon, Microsoft, Infosys), the system supports **gate-level selection** displayed as chip buttons after the building is selected.  
**FR-OFF-06:** The selected office is displayed as a confirmed card with building name and area. The user may tap "Change" to modify.  
**FR-OFF-07:** Admin may edit and verify office records, add aliases, and add gate coordinates.  
**FR-OFF-08:** Office building polygon data is sourced the same way as apartments (OSM + Microsoft footprints + manual).

---

### 5.4 Survey Flow

**FR-SUR-01:** The survey is a **4-step linear flow** with animated step transitions and a visible progress bar.  
**FR-SUR-02:** The back button is always visible from Step 2 onwards.  
**FR-SUR-03:** Each step has exactly **one primary action** (Next / Submit button) pinned to the bottom of the viewport.  
**FR-SUR-04:** No text input fields except the "apartment not found" fallback field.

**Step 1 — Apartment:**  
**FR-SUR-05:** Apartment search as described in §5.2.  
**FR-SUR-06:** Once selected, the apartment is shown as a confirmed card. User taps Next.

**Step 2 — Office:**  
**FR-SUR-07:** Office search as described in §5.3.  
**FR-SUR-08:** Gate selection chips appear inline after building selection, where gate data exists.

**Step 3 — Schedule:**  
**FR-SUR-09:** User selects preferred days of week via **multi-select day chips**: Mon / Tue / Wed / Thu / Fri.  
**FR-SUR-10:** User selects estimated days per month via a **single-select chip row**: 4 / 8 / 12 / 16 / 20+ days.  
**FR-SUR-11:** Both selections are chips. No calendar, no sliders, no text input.

**Step 4 — Timings:**  
**FR-SUR-12:** User selects morning departure band via **single-select chips**: Before 7:30 / 7:30–8:30 / 8:30–9:30 / After 9:30.  
**FR-SUR-13:** User selects evening return band via **single-select chips**: Before 5 PM / 5–6 PM / 6–7 PM / After 7 PM.

**Confirmation Screen:**  
**FR-SUR-14:** A summary card shows: apartment → office, preferred days, timing bands.  
**FR-SUR-15:** Submit button sends the payload to the API.  
**FR-SUR-16:** On success, a success screen is shown with a WhatsApp opt-in toggle (pre-ticked) and a referral share button.  
**FR-SUR-17:** A user may only submit one survey response. Resubmission overwrites the previous response.

---

### 5.5 Route Management (Admin)

**FR-RTE-01:** Admin views an **OD (Origin-Destination) matrix** derived from survey responses, showing which apartment→office corridors have the highest density of demand.  
**FR-RTE-02:** Admin creates routes manually, specifying: name, origin area, destination area.  
**FR-RTE-03:** Admin adds **ordered stops** to each route, specifying: stop type (pickup or drop), associated apartment or office, label, lat/lng, and sequence number.  
**FR-RTE-04:** Admin creates **shifts** on each route, specifying: direction (onward or return), departure time, bus capacity (default 22), and a display label (e.g. "Early Bird · 7:30 AM").  
**FR-RTE-05:** Admin **publishes** a route by changing its status from `draft` to `active`. Publishing triggers the booking feature flag for all users.  
**FR-RTE-06:** Routes may be paused or retired without deletion.

---

### 5.6 Seat Inventory

**FR-INV-01:** The system maintains a **seat inventory record per shift per date**: seats_total, seats_booked, seats_held.  
**FR-INV-02:** `seats_booked + seats_held` must never exceed `seats_total`. This constraint is enforced at the database level.  
**FR-INV-03:** The booking calendar fetches **all seat counts for a full month in a single API call**. There are no per-date API calls.  
**FR-INV-04:** Seat counts are displayed **inside each date cell** of the booking calendar.  
**FR-INV-05:** When a user selects dates for booking, the system creates a **soft hold** in Redis with a **10-minute TTL**. The `seats_held` count is incremented in the database.  
**FR-INV-06:** If the user does not complete payment within 10 minutes, the hold expires and seats are released automatically.  
**FR-INV-07:** On successful payment (Razorpay webhook confirmation), the hold is converted to a confirmed booking: `seats_booked` incremented, `seats_held` decremented.  
**FR-INV-08:** Two users cannot both hold the last seat simultaneously. The hold operation is atomic and transactional. If a seat is unavailable during hold, a 409 error is returned immediately.

---

### 5.7 Booking Flow

**FR-BOK-01:** The booking flow is accessible only after at least one route has been published by admin.  
**FR-BOK-02:** The booking flow is a **3-step linear flow**.

**Step 1 — Route + Shift Selection:**  
**FR-BOK-03:** Available routes are displayed as cards showing: origin → destination, shift times, and current seat availability.  
**FR-BOK-04:** User selects one route. User then selects an onward shift. Optionally selects a return shift.  
**FR-BOK-05:** Onward and return are independent selections (user may book one-way or round trip).

**Step 2 — Date Selection:**  
**FR-BOK-06:** A custom calendar renders all Monday–Friday dates for the upcoming month.  
**FR-BOK-07:** Each date cell displays the number of seats remaining (e.g. "18", "3", "Full").  
**FR-BOK-08:** Date cells are **colour-coded by availability:**
  - Green: > 70% seats available
  - Amber: 25–70% seats available
  - Red: < 25% seats available
  - Grey / disabled: Sold out or past date

**FR-BOK-09:** User taps individual dates to select/deselect them. There are no "select all" or range shortcuts. Each date is an explicit commitment.  
**FR-BOK-10:** Selected dates are visually highlighted in brand green with a checkmark or fill.  
**FR-BOK-11:** A **live price ticker** updates in real time as dates are selected, showing: total amount, per-trip rate, and breakdown (onward + return separately).  
**FR-BOK-12:** The price ticker also shows a **tier nudge**: "Add 2 more days to unlock ₹175/trip" — calculated dynamically.  
**FR-BOK-13:** Users may independently select different return dates from onward dates (e.g. leave Mon/Wed/Fri, return Mon/Tue/Wed/Thu/Fri).

**Step 3 — Review + Payment:**  
**FR-BOK-14:** A review screen shows the full booking summary: route, shifts, all selected dates listed, price breakdown.  
**FR-BOK-15:** The forfeiture policy is displayed in plain language: "Booked seats cannot be cancelled or refunded."  
**FR-BOK-16:** User taps "Pay ₹X" to open the Razorpay payment sheet.  
**FR-BOK-17:** On payment success, the Razorpay webhook fires, confirms the booking server-side, and the frontend navigates to the confirmation screen.  
**FR-BOK-18:** On payment failure, the hold is retained for the remainder of the TTL. User may retry.

**Confirmation Screen:**  
**FR-BOK-19:** Success screen shows: booking summary card, "Add to Google Calendar" button, and referral share link.  
**FR-BOK-20:** A WhatsApp confirmation message is sent to the user (if opted in) via WhatsApp Business API.

---

### 5.8 Pricing

**FR-PRI-01:** Pricing is tiered based on the number of **onward trips** booked in a single booking:

| Onward trips | Per-trip rate |
|---|---|
| 1–4 | ₹250 |
| 5–9 | ₹210 |
| 10–15 | ₹175 |
| 16–22 | ₹150 |

**FR-PRI-02:** Return trips are a flat **₹130 per trip**, regardless of volume.  
**FR-PRI-03:** Total = (onward trips × onward rate) + (return trips × ₹130).  
**FR-PRI-04:** Pricing is calculated server-side and validated before order creation. Frontend calculation is for display only.  
**FR-PRI-05:** All prices are in Indian Rupees (INR). All amounts are stored as `NUMERIC(10,2)` in the database.  
**FR-PRI-06:** Payments are processed in paise (multiply by 100) for Razorpay.

---

### 5.9 Home Screen — Rider Mode (Stage 3)

The home screen displays a **single trip card** with three states:

**State 1 — Active Trip (bus is moving):**  
**FR-HOME-01:** Live map showing current bus location, rendered via MapLibre GL JS.  
**FR-HOME-02:** ETA to user's stop in minutes ("Your stop in 4 mins").  
**FR-HOME-03:** Driver name and bus number plate.  
**FR-HOME-04:** Animated live indicator (pulsing green dot).

**State 2 — Trip Today, Not Yet Departed:**  
**FR-HOME-05:** Countdown timer (hours : minutes : seconds) to departure time.  
**FR-HOME-06:** Stop name and route destination.  
**FR-HOME-07:** Light contextual nudge (e.g. weather, traffic condition — non-critical).

**State 3 — No Active Trip:**  
**FR-HOME-08:** Date and time of next booked trip.  
**FR-HOME-09:** Departure time and stop name for next trip.  
**FR-HOME-10:** Monthly savings ticker: "₹X,XXX saved this month vs Uber/Ola" — calculated using a fixed Uber baseline of ₹350/trip.  
**FR-HOME-11:** If no trips are booked, a CTA to book for next month is shown.

---

### 5.10 My Trips

**FR-TRP-01:** Displays upcoming bookings grouped by month, showing: dates, route, shift time, and status.  
**FR-TRP-02:** Displays past trips with: date, route, amount paid.  
**FR-TRP-03:** Displays a cumulative savings figure (vs Uber baseline) for the current month and all-time.  
**FR-TRP-04:** No cancellation or modification actions are available. The UI does not present these options.

---

### 5.11 Profile

**FR-PRO-01:** Displays user name, email, and profile photo (from Google).  
**FR-PRO-02:** User may update their saved apartment (triggers re-search).  
**FR-PRO-03:** User may update their saved office (triggers re-search).  
**FR-PRO-04:** User may toggle WhatsApp notification opt-in.  
**FR-PRO-05:** Payment history accessible from profile (list of confirmed bookings with amounts).

---

### 5.12 Admin Dashboard

**FR-ADM-01:** Displays total survey response count and response rate over time.  
**FR-ADM-02:** Displays the **OD matrix** — a ranked table of origin area → destination area pairs with response counts. This is the primary route-decision tool.  
**FR-ADM-03:** Displays distribution of morning and evening time bands across all responses.  
**FR-ADM-04:** Admin may create, edit, and publish routes and shifts.  
**FR-ADM-05:** Admin may view seat inventory per shift per date (calendar view).  
**FR-ADM-06:** Admin may manually override seat counts for a specific date/shift.  
**FR-ADM-07:** Admin may verify, edit, and enrich office records (add gates, aliases, correct coordinates).  
**FR-ADM-08:** Admin may approve or reject user-suggested apartments.  
**FR-ADM-09:** Live ops view: all active buses on map, passenger manifests per bus per trip (Stage 3).

---

### 5.13 Live Bus Tracking (Stage 3)

**FR-TRK-01:** Each bus device (Android tablet or dedicated GPS unit) sends location pings to the API at a regular interval (every 10–15 seconds).  
**FR-TRK-02:** The API stores the latest GPS coordinate per bus.  
**FR-TRK-03:** The rider's app subscribes to live location via **WebSocket** (Socket.io).  
**FR-TRK-04:** The ETA to the user's stop is calculated server-side from the current bus location, the route stop sequence, and average speed.  
**FR-TRK-05:** The live map uses **MapLibre GL JS** with OpenStreetMap tiles (no Google Maps billing).  
**FR-TRK-06:** Bus telemetry architecture: GPS device → MQTT broker → API → PostGIS → WebSocket → client.

---

### 5.14 Notifications

**FR-NOT-01:** WhatsApp Business API is used for all user-facing notifications.  
**FR-NOT-02:** Notification triggers:
  - Route launch announcement (to all opted-in survey respondents on the relevant corridor)
  - Booking confirmation (immediately post-payment)
  - Trip reminder (night before a booked trip, 9 PM)
  - Booking window open (25th of each month, 9 AM)

**FR-NOT-03:** All notifications are opt-in. Default is opted-in. User may opt out from profile.  
**FR-NOT-04:** Firebase Cloud Messaging (FCM) is used for in-app push notifications (Stage 3).

---

## 6. Non-Functional Requirements

### 6.1 Performance

**NFR-PER-01:** The inventory API (seat counts for a full month) must respond in under **200ms** for 95th percentile requests.  
**NFR-PER-02:** Apartment and office search must return results in under **300ms** from local DB.  
**NFR-PER-03:** The booking calendar must render all date cells with inventory data in a **single API call**. No waterfall requests.  
**NFR-PER-04:** The seat hold operation must complete in under **500ms** including the database transaction.  
**NFR-PER-05:** The app must be fully functional on a **3G connection** (4+ Mbps). All assets must be lazy-loaded.

### 6.2 Reliability

**NFR-REL-01:** Seat hold and booking confirmation are wrapped in **database transactions**. Partial states are not possible.  
**NFR-REL-02:** Redis TTL expiry automatically releases held seats. No manual cleanup job required.  
**NFR-REL-03:** The Razorpay webhook must be **idempotent** — processing the same webhook twice must not double-book or double-decrement inventory.  
**NFR-REL-04:** The application must degrade gracefully if Typesense is unavailable — falling back to PostgreSQL search, then Google Places.  
**NFR-REL-05:** The application must degrade gracefully if Google Places API is unavailable — showing local results only with a "Can't find your office? Try again later" message.

### 6.3 Security

**NFR-SEC-01:** All API endpoints (except public search and Razorpay webhook) require a valid JWT.  
**NFR-SEC-02:** Admin and Ops endpoints require role validation in addition to JWT.  
**NFR-SEC-03:** Razorpay webhook signature is verified using HMAC-SHA256 before processing.  
**NFR-SEC-04:** The database connection string is never exposed to the frontend.  
**NFR-SEC-05:** All API responses strip sensitive fields (e.g. internal IDs used for joins are not returned unless needed).  
**NFR-SEC-06:** SSL is enforced on all database connections (`sslmode=require`).  
**NFR-SEC-07:** User passwords do not exist. Authentication is delegated entirely to Google.

### 6.4 Data & Privacy

**NFR-DAT-01:** Survey responses are stored at the individual level linked to user ID.  
**NFR-DAT-02:** Aggregated/anonymised data (OD matrix, time band distributions) may be used for route planning and third-party data products.  
**NFR-DAT-03:** Raw individual data (name, email, apartment, office, travel dates) is never shared with third parties.  
**NFR-DAT-04:** User consent for anonymised data sharing is captured via a checkbox during survey submission (pre-ticked, plain-language label).  
**NFR-DAT-05:** The application is compliant with India's **Digital Personal Data Protection Act 2023 (DPDP Act)**. A privacy policy is required before public launch.  
**NFR-DAT-06:** Users may request deletion of their data. This must be actioned within 72 hours.

### 6.5 Scalability

**NFR-SCA-01:** The database uses **PostGIS** for all geospatial queries. Geometry columns are indexed with GIST indexes.  
**NFR-SCA-02:** The system is architected to support multiple routes and shifts without code changes — all configuration is data-driven.  
**NFR-SCA-03:** Seat inventory records are generated on-demand for new dates. The system does not pre-generate records for all future dates.  
**NFR-SCA-04:** Typesense is used for autocomplete search. Migration to Elasticsearch is planned when telemetry log volume warrants it.  
**NFR-SCA-05:** The monorepo architecture (Turborepo) allows the admin and rider frontends to be developed and deployed independently.

---

## 7. UX Requirements

### 7.1 Zero-Typing Principle

**UXR-01:** No text input fields except: name/email captured by Google One-Tap, apartment/office search fields, and the "suggest missing apartment" fallback.  
**UXR-02:** All selections are chips, toggles, or search results. No dropdowns, no sliders, no radio buttons.  
**UXR-03:** The entire survey must be completable in **under 60 seconds** on a first-time user's mobile device.  
**UXR-04:** The entire booking flow (route → dates → payment) must be completable in **under 90 seconds** for a returning user.

### 7.2 Mobile-First

**UXR-05:** All screens are designed for mobile viewport (375px–430px). Desktop is secondary.  
**UXR-06:** All tap targets are a minimum of **44×44px**.  
**UXR-07:** The primary CTA button is always **pinned to the bottom of the viewport** and never scrolled off screen.  
**UXR-08:** No horizontal scroll. No swipe navigation. Vertical stack only.  
**UXR-09:** Bottom sheet (not modal or new page) for all supplementary selections (e.g. gate picker, time picker).

### 7.3 Visual Design

**UXR-10:** Dark theme throughout. Background: `#0a0a0f`. Card surface: `#1a1a24`.  
**UXR-11:** Brand colour: `#22c55e` (green). Used exclusively for: selected states, primary buttons, live indicators, and positive values.  
**UXR-12:** Typography: Inter font. Sizes: 24px titles, 16px section labels, 14px body, 12px captions.  
**UXR-13:** All interactive elements have `active:scale-95` press feedback. Response within 16ms.  
**UXR-14:** Step transitions: slide on x-axis (30px, 200ms ease-out) using Framer Motion AnimatePresence.  
**UXR-15:** Element entrances: fade + slide up (y-axis, 20px, 200ms).  
**UXR-16:** Live indicators (bus tracking, booking activity): soft opacity pulse (1→0.3→1, 1.5s loop).  
**UXR-17:** Price changes in the live ticker: y-axis number flip using AnimatePresence.

### 7.4 Error Prevention

**UXR-18:** Sold-out dates are visually disabled before the user attempts to select them.  
**UXR-19:** The "Next" button is disabled until the current step's required selection is made.  
**UXR-20:** The seat hold API is called **before** opening the Razorpay payment sheet, not after. If a seat is unavailable, the user is told immediately before entering payment details.  
**UXR-21:** The booking window closed state (before 25th of month) is shown as an informational message, not an error.

---

## 8. Data Model Summary

| Entity | Key Fields |
|---|---|
| `users` | id, google_id, name, email, phone, role, whatsapp_opt |
| `apartments` | id, name, aliases[], area, lat, lng, polygon (PostGIS), verified |
| `offices` | id, name, aliases[], area, lat, lng, polygon (PostGIS), gates (JSONB), selection_count |
| `routes` | id, name, origin_area, destination_area, status |
| `stops` | id, route_id, stop_type, sequence, lat, lng |
| `shifts` | id, route_id, direction, departure_time, bus_capacity, label |
| `seat_inventory` | id, shift_id, date, seats_total, seats_booked, seats_held |
| `bookings` | id, user_id, onward_shift_id, return_shift_id, booking_dates[], return_dates[], amount_total, status, razorpay_order_id |
| `survey_responses` | id, user_id, apartment_id, office_id, preferred_days[], estimated_days_month, morning_band, evening_band |

---

## 9. Third-Party Dependencies

| Service | Purpose | Stage |
|---|---|---|
| **Google OAuth 2.0** | User authentication (One-Tap) | 1 |
| **Google Places API (New)** | Office search fallback | 1 |
| **Neon PostgreSQL + PostGIS** | Primary database + geospatial | 1 |
| **Typesense** | Office/apartment fuzzy autocomplete | 1 |
| **Redis** | Seat hold TTL (10 min) | 2 |
| **Razorpay** | Payment processing + webhooks | 2 |
| **WhatsApp Business API** | Booking confirmation + reminders | 2 |
| **MapLibre GL JS** | Map rendering (free, OSM tiles) | 2 |
| **Overpass API (OSM)** | One-time building polygon data pull | 2 |
| **Microsoft Planetary Computer** | Building footprint polygons (Telangana dataset) | 2 |
| **Socket.io** | Real-time seat count updates + live tracking | 3 |
| **MQTT Broker** | Bus GPS telemetry ingestion | 3 |
| **Firebase Cloud Messaging** | Mobile push notifications | 3 |

---

## 10. Out of Scope (Explicitly)

The following are **not** in scope for any current stage and must not be built or implied by the UI:

- Custom route requests by users
- Seat cancellations or refunds
- Partial bookings or date modifications post-payment
- Phone or WhatsApp booking flows
- Driver-facing app (tracked separately)
- Corporate invoicing or bulk billing (future stage)
- Loyalty or rewards programme
- Dynamic pricing or surge pricing
- Multi-city operations (Hyderabad only at launch)

---

## 11. Future Considerations (Post-Launch)

- **Corporate billing:** Bulk invoice to HR/admin teams for companies with 50+ riders on the same route
- **Data products:** Anonymised OD matrix reports sold to real estate developers, IT parks, and HMDA/Metro Rail
- **Building polygon enrichment:** As the polygon database matures, auto-detect user's apartment and office from GPS on login
- **Route expansion:** Additional corridors based on OD matrix demand signals from survey data
- **Driver app:** Separate mobile app for drivers with manifest, navigation, and attendance tracking
- **Elasticsearch:** Migration from Typesense when telemetry log volume justifies operational overhead

---

*End of Requirements Document*