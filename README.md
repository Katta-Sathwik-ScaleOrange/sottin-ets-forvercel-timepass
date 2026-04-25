# Tellapur Transit

Fixed-route corporate commute bus service connecting Tellapur/Gopanpalle/Kollur with Madhapur/Financial District/Gachibowli, Hyderabad.

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + Framer Motion + Zustand
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Neon) + PostGIS
- **Cache:** Redis (seat holds)
- **Search:** Typesense (fuzzy autocomplete)
- **Payments:** Razorpay
- **Auth:** Google One-Tap (OAuth 2.0)
- **Monorepo:** Turborepo

## Project Structure

```
tellapur-transit/
├── apps/
│   ├── api/          # Express backend API
│   ├── web/          # React rider frontend
│   └── admin/        # React admin dashboard
├── packages/
│   └── shared/       # Shared types
├── turbo.json
└── package.json
```

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/sott-in/sottin-ets.git
   cd sottin-ets
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `apps/api/.env` and fill in your API keys
   - Copy `apps/web/.env` and fill in your client IDs

4. Run database migration:
   ```bash
   npm run db:migrate
   ```

5. Seed initial data:
   ```bash
   npm run db:seed
   ```

6. Start development servers:
   ```bash
   npm run dev
   ```

   - API: http://localhost:3001
   - Web: http://localhost:5173
   - Admin: http://localhost:5174

## App Stages

| Stage | Trigger | Home Screen |
|---|---|---|
| **Survey** | App launch | Survey CTA |
| **Booking** | Routes published by admin | Survey + Book |
| **Rider** | First paid booking | Live trip card |
