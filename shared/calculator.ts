import { DEFAULT_SCENARIO, HUB_CATALOG } from './presets.js';
import type {
  CalculationResult,
  ConnectionRiskAssessment,
  ItineraryType,
  RiskTier,
  ScenarioInput,
  SensitivityPoint,
  SimulationSummary,
  TripMatrixRow,
} from './types.js';
import { validateScenarioInput } from './validation.js';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getSegmentsPerRoundtrip(itineraryType: ItineraryType): number {
  if (itineraryType === 'direct') return 2;
  if (itineraryType === 'one-stop') return 4;
  return 6;
}

/**
 * Deterministic seeded PRNG (Mulberry32) so Monte Carlo results are identical
 * across client and server for the same scenario input.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashInput(input: ScenarioInput): number {
  const str = `${input.origin}-${input.destination}-${input.connectionHub}-${input.plannedRoundtrips}-${input.fallbackLegProbability}-${input.layoverMinutes}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function assessConnectionRisk(input: ScenarioInput): ConnectionRiskAssessment {
  const hubInfo = HUB_CATALOG[input.connectionHub.toUpperCase()] ?? {
    code: input.connectionHub.toUpperCase(),
    city: input.connectionHub.toUpperCase(),
    name: `${input.connectionHub.toUpperCase()} Hub`,
    mctMinutes: 70,
    congestionPenalty: 10,
  };

  if (input.itineraryType === 'direct') {
    return {
      score: 6,
      tier: 'Low',
      hubMinimumConnectionMinutes: 0,
      bufferMinutes: 0,
      estimatedMisconnectProbability: 0,
      expectedUnplannedOvernightPerTrip: 0,
      advisories: ['Nonstop routing eliminates hub misconnect and terminal transfer risk.'],
    };
  }

  const mct = hubInfo.mctMinutes;
  const buffer = input.layoverMinutes - mct;
  let score = 15 + hubInfo.congestionPenalty;
  const advisories: string[] = [];

  if (input.itineraryType === 'multi-leg') {
    score += 18;
    advisories.push('Multi-leg routing compounds schedule delay exposure across 6 total segments.');
  }

  if (input.forcedOvernightLayover) {
    score = Math.max(12, score - 12);
    advisories.push(
      `Planned overnight layover at ${hubInfo.code} eliminates same-day misconnect risk (+$${round2(input.layoverOvernightCost)} built into trip cost).`,
    );
  } else {
    if (buffer < 0) {
      score += 42;
      advisories.push(
        `Layover (${input.layoverMinutes}m) is below ${hubInfo.code}'s recommended ${mct}m minimum connection time.`,
      );
    } else if (buffer < 30) {
      score += 24;
      advisories.push(
        `Tight ${buffer}m buffer above ${hubInfo.code} MCT (${mct}m). Minor inbound delays can trigger a misconnect.`,
      );
    } else if (buffer < 75) {
      score += 10;
      advisories.push(`Healthy ${buffer}m buffer at ${hubInfo.code}; manageable for normal operations.`);
    } else {
      score -= 4;
      advisories.push(`Generous ${buffer}m connection cushion at ${hubInfo.code} absorbs typical Frontier delays.`);
    }

    if (input.lateEveningArrival) {
      score += 18;
      advisories.push(
        'Late-evening arrival increases overnight stranding risk when the final outbound leg is missed.',
      );
    }
  }

  score = Math.max(5, Math.min(100, Math.round(score)));

  let tier: RiskTier = 'Low';
  if (score >= 75) tier = 'Critical';
  else if (score >= 52) tier = 'High';
  else if (score >= 30) tier = 'Moderate';

  // Convert score into per-roundtrip misconnect probability (0 when planned overnight)
  const rawProb = input.forcedOvernightLayover
    ? 0
    : Math.min(0.45, Math.max(0.01, (score - 10) / 240));
  const estimatedMisconnectProbability = round2(rawProb * 100) / 100;
  const expectedUnplannedOvernightPerTrip = round2(
    estimatedMisconnectProbability * input.unplannedOvernightCost,
  );

  return {
    score,
    tier,
    hubMinimumConnectionMinutes: mct,
    bufferMinutes: buffer,
    estimatedMisconnectProbability,
    expectedUnplannedOvernightPerTrip,
    advisories,
  };
}

export function calculateScenario(input: ScenarioInput): CalculationResult {
  const segments = getSegmentsPerRoundtrip(input.itineraryType);
  const effectivePassCost = input.passAlreadySunk ? 0 : input.annualPassPrice;
  const passAmortized = effectivePassCost / input.plannedRoundtrips;

  const airfareAndTaxes = (input.baseFarePerSegment + input.taxesFeesPerSegment) * segments;
  const ancillaries =
    (input.carryOnPerDirection + input.checkedBagPerDirection + input.seatOrBundlePerDirection) * 2;
  const earlyBookingFees = input.earlyBookingEnabled ? input.earlyBookingFeePerDirection * 2 : 0;

  const lodging =
    input.accommodationMode === 'family' ? 0 : input.nightsPerTrip * input.nightlyLodgingRate;
  const groundAndLayoverBuffer = input.groundTransitPerTrip + input.layoverBufferPerTrip;
  const forcedOvernight =
    input.itineraryType !== 'direct' && input.forcedOvernightLayover
      ? input.layoverOvernightCost
      : 0;

  const bestCaseFlightOnly = airfareAndTaxes + ancillaries + earlyBookingFees;
  const bestCaseVariableTrip =
    bestCaseFlightOnly + lodging + groundAndLayoverBuffer + forcedOvernight;
  const bestCaseTotal = bestCaseVariableTrip + passAmortized;

  const connectionRisk = assessConnectionRisk(input);

  // Per-direction GoWild flight cost that gets replaced when a leg falls back to cash
  const goWildOneWayFlightCost = bestCaseFlightOnly / 2;
  const fallbackIncrementalPerDirection = Math.max(
    0,
    input.fallbackOneWayFare - goWildOneWayFlightCost,
  );

  // 2 directions per roundtrip
  const expectedFallbackExtra = 2 * input.fallbackLegProbability * fallbackIncrementalPerDirection;
  const expectedMisconnectExtra = connectionRisk.expectedUnplannedOvernightPerTrip;
  const expectedVariableTrip =
    bestCaseVariableTrip + expectedFallbackExtra + expectedMisconnectExtra;
  const expectedTotal = expectedVariableTrip + passAmortized;

  const baselineFlightOnly = input.baselineRoundtripFare + input.baselineBaggageFees;
  const baselineTotalPerTrip = baselineFlightOnly + lodging + input.groundTransitPerTrip;

  // Annual totals
  const goWildBestTotal = effectivePassCost + bestCaseVariableTrip * input.plannedRoundtrips;
  const goWildExpectedTotal = effectivePassCost + expectedVariableTrip * input.plannedRoundtrips;
  const baselineAnnualTotal = baselineTotalPerTrip * input.plannedRoundtrips;

  const netSavingsBest = baselineAnnualTotal - goWildBestTotal;
  const netSavingsExpected = baselineAnnualTotal - goWildExpectedTotal;

  const roiDenominator = input.annualPassPrice > 0 ? input.annualPassPrice : goWildBestTotal;
  const roiBestPct = roiDenominator > 0 ? (netSavingsBest / roiDenominator) * 100 : 0;
  const roiExpectedPct = roiDenominator > 0 ? (netSavingsExpected / roiDenominator) * 100 : 0;

  const perTripSavingsBest = baselineTotalPerTrip - bestCaseVariableTrip;
  const perTripSavingsExpected = baselineTotalPerTrip - expectedVariableTrip;

  const breakevenTripsBest =
    effectivePassCost === 0
      ? perTripSavingsBest > 0
        ? 1
        : null
      : perTripSavingsBest > 0
        ? round2(effectivePassCost / perTripSavingsBest)
        : null;

  const breakevenTripsExpected =
    effectivePassCost === 0
      ? perTripSavingsExpected > 0
        ? 1
        : null
      : perTripSavingsExpected > 0
        ? round2(effectivePassCost / perTripSavingsExpected)
        : null;

  // Trip-by-trip matrix (1..plannedRoundtrips)
  const tripMatrix: TripMatrixRow[] = [];
  for (let t = 1; t <= input.plannedRoundtrips; t++) {
    const cumBest = effectivePassCost + bestCaseVariableTrip * t;
    const cumExp = effectivePassCost + expectedVariableTrip * t;
    const cumBase = baselineTotalPerTrip * t;
    const savBest = cumBase - cumBest;
    const savExp = cumBase - cumExp;
    tripMatrix.push({
      tripNumber: t,
      cumulativeGoWildBest: round2(cumBest),
      cumulativeGoWildExpected: round2(cumExp),
      cumulativeBaseline: round2(cumBase),
      netSavingsBest: round2(savBest),
      netSavingsExpected: round2(savExp),
      effectiveCostPerTripBest: round2(cumBest / t),
      effectiveCostPerTripExpected: round2(cumExp / t),
      isBreakevenBest: savBest >= 0,
      isBreakevenExpected: savExp >= 0,
    });
  }

  // Monte Carlo simulation (1,000 trials) for booking availability + misconnect shocks
  const trials = 1000;
  const rng = mulberry32(hashInput(input));
  const savingsSamples: number[] = [];
  let beatCount = 0;

  for (let i = 0; i < trials; i++) {
    let annualCost = effectivePassCost + bestCaseVariableTrip * input.plannedRoundtrips;
    for (let t = 0; t < input.plannedRoundtrips; t++) {
      // Outbound & return legs
      if (rng() < input.fallbackLegProbability) {
        annualCost += fallbackIncrementalPerDirection;
      }
      if (rng() < input.fallbackLegProbability) {
        annualCost += fallbackIncrementalPerDirection;
      }
      // Hub misconnect shock
      if (
        connectionRisk.estimatedMisconnectProbability > 0 &&
        rng() < connectionRisk.estimatedMisconnectProbability
      ) {
        annualCost += input.unplannedOvernightCost;
      }
    }
    const trialSavings = baselineAnnualTotal - annualCost;
    if (trialSavings > 0) beatCount++;
    savingsSamples.push(trialSavings);
  }

  savingsSamples.sort((a, b) => a - b);
  const p90Savings = round2(savingsSamples[Math.floor(trials * 0.1)]); // 10th percentile = downside
  const p50Savings = round2(savingsSamples[Math.floor(trials * 0.5)]);
  const p10Savings = round2(savingsSamples[Math.floor(trials * 0.9)]); // 90th percentile = optimistic

  // Sensitivity curve across fallback probability 0% to 50% (steps of 5%)
  const sensitivityCurve: SensitivityPoint[] = [];
  for (let pct = 0; pct <= 50; pct += 5) {
    const p = pct / 100;
    const varCost =
      bestCaseVariableTrip +
      2 * p * fallbackIncrementalPerDirection +
      expectedMisconnectExtra;
    const annualGoWild = effectivePassCost + varCost * input.plannedRoundtrips;
    const netSav = baselineAnnualTotal - annualGoWild;
    const roi = roiDenominator > 0 ? (netSav / roiDenominator) * 100 : 0;
    sensitivityCurve.push({
      fallbackPct: pct,
      netAnnualSavings: round2(netSav),
      roiPct: round2(roi),
      effectiveCostPerTrip: round2(annualGoWild / input.plannedRoundtrips),
    });
  }

  const simulation: SimulationSummary = {
    trials,
    expectedAnnualSavings: round2(netSavingsExpected),
    expectedAnnualRoiPct: round2(roiExpectedPct),
    p10Savings,
    p50Savings,
    p90Savings,
    beatBaselineProbabilityPct: round2((beatCount / trials) * 100),
    sensitivityCurve,
  };

  return {
    input,
    perTrip: {
      segmentsPerRoundtrip: segments,
      passAmortized: round2(passAmortized),
      airfareAndTaxes: round2(airfareAndTaxes),
      ancillaries: round2(ancillaries),
      earlyBookingFees: round2(earlyBookingFees),
      lodging: round2(lodging),
      groundAndLayoverBuffer: round2(groundAndLayoverBuffer),
      forcedOvernight: round2(forcedOvernight),
      bestCaseFlightOnly: round2(bestCaseFlightOnly),
      bestCaseTotal: round2(bestCaseTotal),
      expectedFallbackExtra: round2(expectedFallbackExtra),
      expectedMisconnectExtra: round2(expectedMisconnectExtra),
      expectedTotal: round2(expectedTotal),
      baselineFlightOnly: round2(baselineFlightOnly),
      baselineTotal: round2(baselineTotalPerTrip),
    },
    annual: {
      effectivePassCost: round2(effectivePassCost),
      goWildBestTotal: round2(goWildBestTotal),
      goWildExpectedTotal: round2(goWildExpectedTotal),
      baselineTotal: round2(baselineAnnualTotal),
      netSavingsBest: round2(netSavingsBest),
      netSavingsExpected: round2(netSavingsExpected),
      roiBestPct: round2(roiBestPct),
      roiExpectedPct: round2(roiExpectedPct),
      effectiveCostPerRoundtripBest: round2(goWildBestTotal / input.plannedRoundtrips),
      effectiveCostPerRoundtripExpected: round2(goWildExpectedTotal / input.plannedRoundtrips),
      breakevenTripsBest,
      breakevenTripsExpected,
    },
    connectionRisk,
    simulation,
    tripMatrix,
  };
}

/**
 * Compact URL query-string serialization for shareable scenarios.
 */
export function encodeScenarioToParams(input: ScenarioInput): string {
  const params = new URLSearchParams();
  params.set('name', input.scenarioName);
  params.set('o', input.origin);
  params.set('d', input.destination);
  params.set('it', input.itineraryType);
  params.set('hub', input.connectionHub);
  params.set('lay', String(input.layoverMinutes));
  params.set('late', input.lateEveningArrival ? '1' : '0');
  params.set('fov', input.forcedOvernightLayover ? '1' : '0');
  params.set('fovc', String(input.layoverOvernightCost));
  params.set('pass', String(input.annualPassPrice));
  params.set('trips', String(input.plannedRoundtrips));
  params.set('sunk', input.passAlreadySunk ? '1' : '0');
  params.set('bf', String(input.baseFarePerSegment));
  params.set('tax', String(input.taxesFeesPerSegment));
  params.set('co', String(input.carryOnPerDirection));
  params.set('cb', String(input.checkedBagPerDirection));
  params.set('seat', String(input.seatOrBundlePerDirection));
  params.set('eb', input.earlyBookingEnabled ? '1' : '0');
  params.set('ebf', String(input.earlyBookingFeePerDirection));
  params.set('acc', input.accommodationMode);
  params.set('nts', String(input.nightsPerTrip));
  params.set('rate', String(input.nightlyLodgingRate));
  params.set('gnd', String(input.groundTransitPerTrip));
  params.set('buf', String(input.layoverBufferPerTrip));
  params.set('base', String(input.baselineRoundtripFare));
  params.set('bbag', String(input.baselineBaggageFees));
  params.set('fbp', String(Math.round(input.fallbackLegProbability * 100)));
  params.set('fbf', String(input.fallbackOneWayFare));
  params.set('uoc', String(input.unplannedOvernightCost));
  return params.toString();
}

export function decodeScenarioFromParams(search: string): ScenarioInput {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (!params.has('o') && !params.has('d') && !params.has('pass')) {
    return DEFAULT_SCENARIO;
  }

  const num = (key: string, fallback: number) => {
    const raw = params.get(key);
    if (raw === null) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const bool = (key: string, fallback: boolean) => {
    const raw = params.get(key);
    if (raw === null) return fallback;
    return raw === '1' || raw === 'true';
  };

  const candidate: ScenarioInput = {
    scenarioName: params.get('name') ?? DEFAULT_SCENARIO.scenarioName,
    origin: (params.get('o') ?? DEFAULT_SCENARIO.origin).toUpperCase(),
    destination: (params.get('d') ?? DEFAULT_SCENARIO.destination).toUpperCase(),
    itineraryType: (params.get('it') as ItineraryType) ?? DEFAULT_SCENARIO.itineraryType,
    connectionHub: (params.get('hub') ?? DEFAULT_SCENARIO.connectionHub).toUpperCase(),
    layoverMinutes: num('lay', DEFAULT_SCENARIO.layoverMinutes),
    lateEveningArrival: bool('late', DEFAULT_SCENARIO.lateEveningArrival),
    forcedOvernightLayover: bool('fov', DEFAULT_SCENARIO.forcedOvernightLayover),
    layoverOvernightCost: num('fovc', DEFAULT_SCENARIO.layoverOvernightCost),
    annualPassPrice: num('pass', DEFAULT_SCENARIO.annualPassPrice),
    plannedRoundtrips: Math.round(num('trips', DEFAULT_SCENARIO.plannedRoundtrips)),
    passAlreadySunk: bool('sunk', DEFAULT_SCENARIO.passAlreadySunk),
    baseFarePerSegment: num('bf', DEFAULT_SCENARIO.baseFarePerSegment),
    taxesFeesPerSegment: num('tax', DEFAULT_SCENARIO.taxesFeesPerSegment),
    carryOnPerDirection: num('co', DEFAULT_SCENARIO.carryOnPerDirection),
    checkedBagPerDirection: num('cb', DEFAULT_SCENARIO.checkedBagPerDirection),
    seatOrBundlePerDirection: num('seat', DEFAULT_SCENARIO.seatOrBundlePerDirection),
    earlyBookingEnabled: bool('eb', DEFAULT_SCENARIO.earlyBookingEnabled),
    earlyBookingFeePerDirection: num('ebf', DEFAULT_SCENARIO.earlyBookingFeePerDirection),
    accommodationMode:
      (params.get('acc') as ScenarioInput['accommodationMode']) ??
      DEFAULT_SCENARIO.accommodationMode,
    nightsPerTrip: Math.round(num('nts', DEFAULT_SCENARIO.nightsPerTrip)),
    nightlyLodgingRate: num('rate', DEFAULT_SCENARIO.nightlyLodgingRate),
    groundTransitPerTrip: num('gnd', DEFAULT_SCENARIO.groundTransitPerTrip),
    layoverBufferPerTrip: num('buf', DEFAULT_SCENARIO.layoverBufferPerTrip),
    baselineRoundtripFare: num('base', DEFAULT_SCENARIO.baselineRoundtripFare),
    baselineBaggageFees: num('bbag', DEFAULT_SCENARIO.baselineBaggageFees),
    fallbackLegProbability: num('fbp', DEFAULT_SCENARIO.fallbackLegProbability * 100) / 100,
    fallbackOneWayFare: num('fbf', DEFAULT_SCENARIO.fallbackOneWayFare),
    unplannedOvernightCost: num('uoc', DEFAULT_SCENARIO.unplannedOvernightCost),
  };

  const validated = validateScenarioInput(candidate);
  return validated.success ? validated.data : DEFAULT_SCENARIO;
}

export function formatScenarioCsv(result: CalculationResult): string {
  const esc = (v: string | number | boolean) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: string[] = [
    'Section,Metric,Value',
    `Scenario,Name,${esc(result.input.scenarioName)}`,
    `Scenario,Route,${esc(`${result.input.origin} -> ${result.input.destination} (${result.input.itineraryType})`)}`,
    `Scenario,Connection Hub,${esc(result.input.itineraryType === 'direct' ? 'None' : result.input.connectionHub)}`,
    `Annual Summary,GoWild Best-Case Total ($),${result.annual.goWildBestTotal}`,
    `Annual Summary,GoWild Expected-Value Total ($),${result.annual.goWildExpectedTotal}`,
    `Annual Summary,Baseline Cash Total ($),${result.annual.baselineTotal}`,
    `Annual Summary,Net Annual Savings Best-Case ($),${result.annual.netSavingsBest}`,
    `Annual Summary,Net Annual Savings Expected ($),${result.annual.netSavingsExpected}`,
    `Annual Summary,Annual ROI Best-Case (%),${result.annual.roiBestPct}`,
    `Annual Summary,Annual ROI Expected (%),${result.annual.roiExpectedPct}`,
    `Annual Summary,Breakeven Trips Best-Case,${result.annual.breakevenTripsBest ?? 'N/A'}`,
    `Annual Summary,Breakeven Trips Expected,${result.annual.breakevenTripsExpected ?? 'N/A'}`,
    `Risk,Connection Risk Score (0-100),${result.connectionRisk.score}`,
    `Risk,Connection Risk Tier,${esc(result.connectionRisk.tier)}`,
    `Risk,Beat Baseline Probability (%),${result.simulation.beatBaselineProbabilityPct}`,
    '',
    'Trip #,Cumulative GoWild Best ($),Cumulative GoWild Expected ($),Cumulative Baseline ($),Net Savings Best ($),Net Savings Expected ($),Effective Cost/Trip Best ($),Effective Cost/Trip Expected ($),Breakeven Best,Breakeven Expected',
  ];

  for (const row of result.tripMatrix) {
    lines.push(
      [
        row.tripNumber,
        row.cumulativeGoWildBest,
        row.cumulativeGoWildExpected,
        row.cumulativeBaseline,
        row.netSavingsBest,
        row.netSavingsExpected,
        row.effectiveCostPerTripBest,
        row.effectiveCostPerTripExpected,
        row.isBreakevenBest ? 'Yes' : 'No',
        row.isBreakevenExpected ? 'Yes' : 'No',
      ].join(','),
    );
  }

  return lines.join('\n');
}
