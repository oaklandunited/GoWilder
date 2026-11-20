import { describe, expect, it } from 'vitest';
import {
  assessConnectionRisk,
  calculateScenario,
  decodeScenarioFromParams,
  encodeScenarioToParams,
  formatScenarioCsv,
} from '../shared/calculator.js';
import { CORRIDOR_PRESETS, DEFAULT_SCENARIO } from '../shared/presets.js';

describe('GoWild Compass Calculation Engine', () => {
  it('computes positive ROI and sensible breakeven for flagship FLL -> OAK via DEN preset', () => {
    const result = calculateScenario(DEFAULT_SCENARIO);

    expect(result.perTrip.segmentsPerRoundtrip).toBe(4);
    expect(result.annual.effectivePassCost).toBe(399);
    expect(result.annual.netSavingsBest).toBeGreaterThan(0);
    expect(result.annual.netSavingsExpected).toBeLessThan(result.annual.netSavingsBest);
    expect(result.annual.breakevenTripsBest).not.toBeNull();
    expect(result.tripMatrix).toHaveLength(DEFAULT_SCENARIO.plannedRoundtrips);
    expect(result.simulation.trials).toBe(1000);
    expect(result.simulation.sensitivityCurve.length).toBe(11);
  });

  it('excludes annual pass cost when passAlreadySunk is true', () => {
    const sunkResult = calculateScenario({
      ...DEFAULT_SCENARIO,
      passAlreadySunk: true,
    });
    const amortizedResult = calculateScenario({
      ...DEFAULT_SCENARIO,
      passAlreadySunk: false,
    });

    expect(sunkResult.annual.effectivePassCost).toBe(0);
    expect(sunkResult.perTrip.passAmortized).toBe(0);
    expect(sunkResult.annual.netSavingsBest - amortizedResult.annual.netSavingsBest).toBeCloseTo(
      DEFAULT_SCENARIO.annualPassPrice,
      1,
    );
  });

  it('scores nonstop routes as Low connection risk and tight late-night hub layovers as High/Critical', () => {
    const directRisk = assessConnectionRisk({
      ...DEFAULT_SCENARIO,
      itineraryType: 'direct',
    });
    expect(directRisk.tier).toBe('Low');
    expect(directRisk.estimatedMisconnectProbability).toBe(0);

    const tightLateRisk = assessConnectionRisk({
      ...DEFAULT_SCENARIO,
      itineraryType: 'one-stop',
      connectionHub: 'DEN',
      layoverMinutes: 55,
      lateEveningArrival: true,
      forcedOvernightLayover: false,
    });
    expect(tightLateRisk.score).toBeGreaterThanOrEqual(75);
    expect(tightLateRisk.tier).toBe('Critical');
    expect(tightLateRisk.expectedUnplannedOvernightPerTrip).toBeGreaterThan(0);
  });

  it('round-trips scenario inputs through URL query params cleanly', () => {
    const preset = CORRIDOR_PRESETS[2].input;
    const encoded = encodeScenarioToParams(preset);
    const decoded = decodeScenarioFromParams(`?${encoded}`);

    expect(decoded).toEqual(preset);
  });

  it('generates valid CSV with summary rows and trip matrix rows', () => {
    const result = calculateScenario(DEFAULT_SCENARIO);
    const csv = formatScenarioCsv(result);

    expect(csv).toContain('Section,Metric,Value');
    expect(csv).toContain('FLL -> OAK (one-stop)');
    expect(csv).toContain('Trip #,Cumulative GoWild Best ($)');
  });
});
