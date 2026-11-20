# GoWild Compass (v2.0)

**GoWild Compass** is a trip-cost, connection risk, and expected-value ROI modeling web application for Frontier Airlines GoWild! Pass holders and prospective pass buyers.

See the full product specification in [gowild_compass_prd.md](./gowild_compass_prd.md).

## Features

- **ROI & Trip Cost Calculator Engine:** Pass amortization (including sunk-cost toggle), per-segment taxes/fees, carry-on/checked bag/seat add-ons, early-booking vs. day-before window toggle, hostel/hotel/family lodging modes, and baseline cash fare comparison.
- **Corridor Presets:** Instant 1-click scenarios (`FLL → OAK via DEN`, `PBI → SMF via LAS`, `MIA → SFO via DEN`, `FLL → DEN Direct`, `FLL → LAS Direct`) plus custom 3-letter IATA inputs.
- **Booking Availability Sensitivity & Monte Carlo Simulation:** Models last-minute fallback cash-fare probability (0–60%) across 1,000 seeded trials with P10/P50/P90 savings bands and win-rate probability.
- **Connection Buffer & Misconnect Risk Scoring:** Evaluates hub minimum connection time (MCT), layover cushion, late-evening arrival exposure, and expected unplanned overnight hotel costs.
- **Shareable URLs & Export:** Live query-param state serialization plus server-validated CSV and JSON exports.
- **Cloud Run Ready:** Multi-stage `node:22-slim` Dockerfile, `/healthz` endpoint, structured JSON Cloud Logging, Zod input validation, Helmet headers, and rate limiting.

## Local Development

```bash
npm install
npm run dev
```

- Frontend (Vite): `http://localhost:5173`
- Backend API (Express): `http://localhost:8080` (`GET /healthz`, `GET /api/presets`, `POST /api/calculate`, `POST /api/export/csv`, `POST /api/export/json`)

## Scripts

```bash
npm run typecheck   # Type-check client, shared, and server
npm test            # Run Vitest unit + Express API integration tests
npm run build       # Build Vite SPA (dist/client) and Express server (dist/server)
npm start           # Run production server on PORT (default 8080)
```

## Environment Variables

| Variable   | Default       | Description                          |
| ---------- | ------------- | ------------------------------------ |
| `PORT`     | `8080`        | HTTP port (injected by Cloud Run)    |
| `NODE_ENV` | `development` | Set to `production` in containers    |

## One-Command Google Cloud Run Deploy

```bash
gcloud run deploy gowild-compass \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi
```

### Optional Firebase Hosting Edge Layer

After deploying the Cloud Run service `gowild-compass` in `us-central1`:

```bash
npm run build:client
firebase deploy --only hosting
```

### Recommended GCP Cost Guardrail

Set a monthly billing budget alert (e.g., $5 / $10) in Google Cloud Console → Billing → Budgets & Alerts and verify scale-to-zero (`--min-instances=0`) on the Cloud Run service.
