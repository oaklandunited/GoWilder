export type ItineraryType = 'direct' | 'one-stop' | 'multi-leg';

export type AccommodationMode = 'hostel' | 'hotel' | 'family';

export type RiskTier = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface ScenarioInput {
  scenarioName: string;
  origin: string;
  destination: string;
  itineraryType: ItineraryType;
  connectionHub: string;
  layoverMinutes: number;
  lateEveningArrival: boolean;
  forcedOvernightLayover: boolean;
  layoverOvernightCost: number;

  // Pass amortization
  annualPassPrice: number;
  plannedRoundtrips: number;
  passAlreadySunk: boolean;

  // Per-segment & ancillary costs (GoWild!)
  baseFarePerSegment: number;
  taxesFeesPerSegment: number;
  carryOnPerDirection: number;
  checkedBagPerDirection: number;
  seatOrBundlePerDirection: number;
  earlyBookingEnabled: boolean;
  earlyBookingFeePerDirection: number;

  // Ground & lodging
  accommodationMode: AccommodationMode;
  nightsPerTrip: number;
  nightlyLodgingRate: number;
  groundTransitPerTrip: number;
  layoverBufferPerTrip: number;

  // Baseline cash comparison
  baselineRoundtripFare: number;
  baselineBaggageFees: number;

  // v2.0+ Availability & Connection Risk modeling
  fallbackLegProbability: number; // 0.0 to 0.80
  fallbackOneWayFare: number;
  unplannedOvernightCost: number;
}

export interface CorridorPreset {
  id: string;
  label: string;
  subtitle: string;
  badge: string;
  input: ScenarioInput;
}

export interface AirportHubInfo {
  code: string;
  city: string;
  name: string;
  mctMinutes: number; // Minimum recommended Frontier connection time
  congestionPenalty: number; // 0-20 risk points for hub complexity / terminal size
}

export interface PerTripBreakdown {
  segmentsPerRoundtrip: number;
  passAmortized: number;
  airfareAndTaxes: number;
  ancillaries: number;
  earlyBookingFees: number;
  lodging: number;
  groundAndLayoverBuffer: number;
  forcedOvernight: number;
  bestCaseFlightOnly: number;
  bestCaseTotal: number;
  expectedFallbackExtra: number;
  expectedMisconnectExtra: number;
  expectedTotal: number;
  baselineFlightOnly: number;
  baselineTotal: number;
}

export interface ConnectionRiskAssessment {
  score: number; // 0 to 100
  tier: RiskTier;
  hubMinimumConnectionMinutes: number;
  bufferMinutes: number;
  estimatedMisconnectProbability: number; // 0 to 1 per roundtrip
  expectedUnplannedOvernightPerTrip: number;
  advisories: string[];
}

export interface SensitivityPoint {
  fallbackPct: number;
  netAnnualSavings: number;
  roiPct: number;
  effectiveCostPerTrip: number;
}

export interface SimulationSummary {
  trials: number;
  expectedAnnualSavings: number;
  expectedAnnualRoiPct: number;
  p10Savings: number; // Optimistic (90th percentile)
  p50Savings: number; // Median
  p90Savings: number; // Downside (10th percentile)
  beatBaselineProbabilityPct: number;
  sensitivityCurve: SensitivityPoint[];
}

export interface TripMatrixRow {
  tripNumber: number;
  cumulativeGoWildBest: number;
  cumulativeGoWildExpected: number;
  cumulativeBaseline: number;
  netSavingsBest: number;
  netSavingsExpected: number;
  effectiveCostPerTripBest: number;
  effectiveCostPerTripExpected: number;
  isBreakevenBest: boolean;
  isBreakevenExpected: boolean;
}

export interface CalculationResult {
  input: ScenarioInput;
  perTrip: PerTripBreakdown;
  annual: {
    effectivePassCost: number;
    goWildBestTotal: number;
    goWildExpectedTotal: number;
    baselineTotal: number;
    netSavingsBest: number;
    netSavingsExpected: number;
    roiBestPct: number;
    roiExpectedPct: number;
    effectiveCostPerRoundtripBest: number;
    effectiveCostPerRoundtripExpected: number;
    breakevenTripsBest: number | null; // null if per-trip savings <= 0
    breakevenTripsExpected: number | null;
  };
  connectionRisk: ConnectionRiskAssessment;
  simulation: SimulationSummary;
  tripMatrix: TripMatrixRow[];
}
