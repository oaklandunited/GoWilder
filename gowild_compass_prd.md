# Product Requirements Document: GoWild Compass (v2.0)

**Document Status:** Ready for Distribution & Build  
**Target Stack:** React + TypeScript + Vite frontend, Node.js/Express backend API, containerized on Google Cloud Run (`us-central1` / `us-east1`), with optional Firebase Hosting or Cloud CDN for static asset delivery.

## 1. Executive Summary & Core Value Proposition

GoWild Compass is a web-based trip-cost and ROI modeling application for Frontier Airlines GoWild! Pass holders and prospective pass buyers. It models true out-of-pocket trip economics across multi-leg itineraries—accounting for pass amortization, per-segment taxes/fees, baggage/ancillary add-ons, multi-leg layover friction (such as Denver `DEN` or Las Vegas `LAS` connections between South Florida `FLL`/`MIA`/`PBI` and Northern California `OAK`/`SMF`/`SFO`), and budget accommodation (such as hostels vs. hotels).

Unlike static fare calculators, GoWild Compass evaluates net savings vs. baseline cash fares, breakeven trip count, booking-window risk (domestic confirmation opening the day before departure vs. paid early booking), and multi-leg connection/overnight exposure.

## 2. Target Users & Primary Use Cases

1. **Frequent Cross-Country Budget Flyers (Primary):** Travelers flying recurring corridors (e.g., South Florida `FLL`/`MIA`/`PBI` to Northern California `OAK`/`SMF`/`SFO`) who want to test whether the annual pass plus taxes, bags, and layover/lodging costs beats ad-hoc budget/legacy cash fares.
2. **Connection & Layover Optimizers:** Travelers routing through hub airports (`DEN`, `LAS`) who need to model misconnect/overnight buffer costs, airport lounge/rest trade-offs, or same-day vs. next-day connection timing.
3. **Pass ROI Evaluators:** Prospective buyers comparing annual pass amortization across 2–8+ roundtrips per year against baseline cash tickets and ancillary fees.

## 3. Functional Requirements

### 3.1 ROI & Trip Cost Calculator Engine

- **Pass Amortization Model:** Configurable annual pass price (default $399 baseline; user-editable), planned annual roundtrips/segments, and pass-already-sunk vs. amortize-across-trips toggle.
- **Per-Trip & Per-Segment Cost Breakdown:**
  - GoWild! base fare ($0 airfare where applicable) + government taxes/carrier-imposed fees per segment.
  - Carry-on / checked bag / seat selection / bundle add-ons per direction.
  - Optional early-booking fee toggle vs. day-before domestic booking window modeling.
  - Ground & lodging inputs: hostel nightly rate vs. hotel nightly rate, nights per trip, transit/airport transfers, and layover buffer/overnight cost.
- **Baseline Comparison:** Side-by-side comparison against a user-defined or preset baseline roundtrip cash fare (including baseline baggage fees), outputting:
  - Net Annual Savings ($) and ROI (%)
  - Breakeven Trips Required
  - Effective Cost per Roundtrip ($)

### 3.2 Route, Corridor & Layover Scenario Builder

- **Origin / Destination Presets & Custom Codes:** Quick-select hubs (e.g., `FLL`, `MIA`, `PBI`, `OAK`, `SMF`, `SFO`, `DEN`, `LAS`) plus custom 3-letter IATA inputs.
- **Leg & Layover Modeling:** Support direct, 1-stop, and multi-leg itineraries with configurable layover duration, connection risk weighting, and forced-overnight lodging triggers.
- **Accommodation Mode Toggle:** Switch between Hostel / Budget, Mid-Range / Hotel, and Visiting Family / Zero-Lodging per trip.

### 3.3 Shareable Scenarios & Exportable Output

- **URL State Serialization:** Encode calculator parameters into query params or shareable scenario slugs so users can bookmark or send exact configurations.
- **JSON / CSV Export:** Download scenario comparisons and trip-by-trip cost matrices for external spreadsheets or personal tracking.

## 4. Non-Functional Requirements & Google Cloud Hosting Architecture

### 4.1 Recommended GCP Hosting Topology

- **Primary Compute — Google Cloud Run:** Deploy a containerized web app (or API + SSR frontend) to Cloud Run in `us-central1` with `--min-instances=0` (scale to zero when idle to minimize cost) and `--max-instances=10`.
- **Static Asset & Edge Layer — Firebase Hosting (Optional / Recommended for Pure SPA):** Serve static bundles over Firebase Hosting's global CDN with automatic TLS, optionally rewriting `/api/**` to a Cloud Run backend service.
- **CI/CD — Cloud Build + Artifact Registry:** Build container images via `gcloud builds submit` or GitHub Actions pushing to Artifact Registry and triggering rolling Cloud Run revisions.

### 4.2 Reliability, Performance & Security

- **Cold-Start Mitigation:** Keep container image slim (`node:slim` or multi-stage build), health-check endpoint `/healthz` returning `200 OK`, and lightweight startup payload so cold starts stay fast.
- **Input Validation & Rate Limiting:** Validate all numeric bounds server-side (no negative fares/nights, bounded array lengths) and enforce request rate limits on any backend/export endpoints.
- **Privacy & Data Handling:** Keep calculator state client-side or stateless by default; if server-side persistence or analytics is added, avoid collecting PII and disclose telemetry clearly.
- **Disclaimer & Rules Accuracy:** Clearly note that airline pass rules, blackout dates, taxes, and availability change frequently and that calculations are estimates rather than live fare guarantees.

## 5. Suggested Improvements for v2.0+

1. **Monte Carlo / Sensitivity Simulation for Booking Availability:** Because GoWild! domestic seats open the day before departure and availability varies by route and peak travel periods, add a Fallback Cash-Fare Probability Slider (e.g., "15% of return legs require a last-minute fallback fare") to compute expected-value ROI rather than best-case ROI.
2. **Connection Buffer & Misconnect Risk Scoring:** For multi-leg routes through hubs like `DEN` or `LAS`, model minimum connection time, terminal transfers, and late-evening arrival risk (where a missed last leg forces an unplanned hotel night).
3. **Multi-Pass / Household & Group Mode:** Allow modeling 2+ passes on the same itinerary, since every passenger on a GoWild! booking requires an active pass and fares cannot be mixed with standard/Discount Den fares on the same reservation.
4. **Preset Corridor Templates:** Ship 4–5 realistic presets (e.g., `FLL → OAK` via `DEN`/`LAS`, `PBI → SMF` Budget Hostel Run, Weekend Hop) so first-time visitors see meaningful numbers immediately without manual setup.
5. **Observability & Cost Guardrails on GCP:** Configure Cloud Run billing budgets/alerts, structured JSON logging to Cloud Logging, and Cloud Error Reporting from day one.

## 6. Deployment & Distribution Checklist

- [ ] Containerize app with a production Dockerfile listening on `process.env.PORT` (default `8080`) and `/healthz` route.
- [ ] Push image to Artifact Registry and deploy to Cloud Run with least-privilege IAM service account and unauthenticated invoker access for public web traffic.
- [ ] Map custom domain with managed SSL and configure `firebase.json` rewrites if pairing Firebase Hosting with Cloud Run.
- [ ] Set a GCP Budget alert (e.g., $5/$10 monthly threshold) and verify scale-to-zero behavior.
- [ ] Publish repository README with local dev steps, environment variables, and one-command `gcloud run deploy` instructions.
