import { ArrowDownRight, ArrowUpRight, Calculator, Repeat, ShieldCheck, TrendingUp } from 'lucide-react';
import type { CalculationResult } from '@shared/types';

interface KpiStripProps {
  result: CalculationResult;
}

function fmtUsd(value: number, signed = false): string {
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (value < 0) return `-$${abs}`;
  if (signed && value > 0) return `+$${abs}`;
  return `$${abs}`;
}

export function KpiStrip({ result }: KpiStripProps) {
  const { annual, simulation, perTrip } = result;
  const positiveExpected = annual.netSavingsExpected >= 0;

  return (
    <section aria-label="Key ROI metrics" className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {/* Net Annual Savings (Expected vs Best-Case) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Expected Annual Savings</span>
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              positiveExpected
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {positiveExpected ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {positiveExpected ? 'Beats Cash' : 'Loses to Cash'}
          </span>
        </div>
        <div
          className={`font-mono-num mt-2 text-2xl font-bold tracking-tight ${
            positiveExpected ? 'text-emerald-700' : 'text-rose-600'
          }`}
        >
          {fmtUsd(annual.netSavingsExpected, true)}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
          <span>Best-case (0% fallback)</span>
          <span className="font-mono-num font-semibold text-slate-700">
            {fmtUsd(annual.netSavingsBest, true)}
          </span>
        </div>
      </div>

      {/* Annual ROI & Win Rate */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Expected Pass ROI</span>
          <TrendingUp className="h-4 w-4 text-[#0A6847]" />
        </div>
        <div className="font-mono-num mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {annual.roiExpectedPct >= 0 ? '+' : ''}
          {annual.roiExpectedPct.toFixed(0)}%
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Win prob ({simulation.trials} sims)
          </span>
          <span className="font-mono-num font-semibold text-slate-800">
            {simulation.beatBaselineProbabilityPct.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Breakeven Trips */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Breakeven Trips</span>
          <Repeat className="h-4 w-4 text-[#0A6847]" />
        </div>
        <div className="font-mono-num mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {annual.breakevenTripsExpected !== null
            ? `${Math.ceil(annual.breakevenTripsExpected)} trips`
            : 'Never'}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
          <span>Exact expected / best-case</span>
          <span className="font-mono-num font-semibold text-slate-700">
            {annual.breakevenTripsExpected !== null ? annual.breakevenTripsExpected.toFixed(1) : '—'}
            {' / '}
            {annual.breakevenTripsBest !== null ? annual.breakevenTripsBest.toFixed(1) : '—'}
          </span>
        </div>
      </div>

      {/* Effective Cost per Roundtrip */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Effective Cost / Trip</span>
          <Calculator className="h-4 w-4 text-[#0A6847]" />
        </div>
        <div className="font-mono-num mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {fmtUsd(annual.effectiveCostPerRoundtripExpected)}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
          <span>Baseline cash / trip</span>
          <span className="font-mono-num font-semibold text-slate-700">
            {fmtUsd(perTrip.baselineTotal)}
          </span>
        </div>
      </div>
    </section>
  );
}
