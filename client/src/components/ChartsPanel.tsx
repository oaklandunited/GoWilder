import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CalculationResult } from '@shared/types';

interface ChartsPanelProps {
  result: CalculationResult;
}

type ChartTab = 'breakeven' | 'breakdown' | 'sensitivity';

function currencyTick(v: number) {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v}`;
}

export function ChartsPanel({ result }: ChartsPanelProps) {
  const [tab, setTab] = useState<ChartTab>('breakeven');
  const { tripMatrix, perTrip, simulation, input } = result;

  const breakdownData = [
    {
      name: 'GoWild! Best',
      Pass: perTrip.passAmortized,
      'Fare & Taxes': perTrip.airfareAndTaxes,
      'Bags & Early': perTrip.ancillaries + perTrip.earlyBookingFees,
      'Lodging & Ground':
        perTrip.lodging + perTrip.groundAndLayoverBuffer + perTrip.forcedOvernight,
      'Risk Buffer': 0,
    },
    {
      name: 'GoWild! Expected',
      Pass: perTrip.passAmortized,
      'Fare & Taxes': perTrip.airfareAndTaxes,
      'Bags & Early': perTrip.ancillaries + perTrip.earlyBookingFees,
      'Lodging & Ground':
        perTrip.lodging + perTrip.groundAndLayoverBuffer + perTrip.forcedOvernight,
      'Risk Buffer': perTrip.expectedFallbackExtra + perTrip.expectedMisconnectExtra,
    },
    {
      name: 'Baseline Cash',
      Pass: 0,
      'Fare & Taxes': input.baselineRoundtripFare,
      'Bags & Early': input.baselineBaggageFees,
      'Lodging & Ground': perTrip.lodging + input.groundTransitPerTrip,
      'Risk Buffer': 0,
    },
  ];

  const currentFallbackPct = Math.round(input.fallbackLegProbability * 100);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Trip Economics &amp; Simulation</h2>
          <p className="text-xs text-slate-500">
            Compare cumulative cash outlay, per-trip cost anatomy, and booking-window fallback risk
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Chart views"
          className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-medium"
        >
          {(
            [
              ['breakeven', 'Breakeven Curve'],
              ['breakdown', 'Per-Trip Breakdown'],
              ['sensitivity', 'Fallback Sensitivity'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                tab === key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px] w-full">
        {tab === 'breakeven' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tripMatrix} margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="tripNumber"
                tickFormatter={(v) => `T${v}`}
                tick={{ fontSize: 12, fill: '#64748B' }}
              />
              <YAxis tickFormatter={currencyTick} tick={{ fontSize: 12, fill: '#64748B' }} />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                labelFormatter={(label) => `After Trip #${label}`}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="cumulativeBaseline"
                name="Baseline Cash"
                stroke="#64748B"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="cumulativeGoWildExpected"
                name="GoWild! Expected"
                stroke="#0A6847"
                strokeWidth={2.5}
                dot={{ r: 3.5 }}
              />
              <Line
                type="monotone"
                dataKey="cumulativeGoWildBest"
                name="GoWild! Best-Case"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 2.5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {tab === 'breakdown' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdownData} margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#334155' }} />
              <YAxis tickFormatter={currencyTick} tick={{ fontSize: 12, fill: '#64748B' }} />
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Pass" stackId="a" fill="#064E3B" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Fare & Taxes" stackId="a" fill="#0A6847" />
              <Bar dataKey="Bags & Early" stackId="a" fill="#10B981" />
              <Bar dataKey="Lodging & Ground" stackId="a" fill="#94A3B8" />
              <Bar dataKey="Risk Buffer" stackId="a" fill="#F59E0B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {tab === 'sensitivity' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={simulation.sensitivityCurve}
              margin={{ top: 10, right: 16, left: 4, bottom: 4 }}
            >
              <defs>
                <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0A6847" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#0A6847" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="fallbackPct"
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 12, fill: '#64748B' }}
              />
              <YAxis tickFormatter={currencyTick} tick={{ fontSize: 12, fill: '#64748B' }} />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Net Annual Savings']}
                labelFormatter={(label) => `Fallback Cash-Fare Rate: ${label}% of legs`}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="4 4" />
              <ReferenceLine
                x={Math.min(50, Math.round(currentFallbackPct / 5) * 5)}
                stroke="#0F172A"
                strokeDasharray="3 3"
                label={{
                  value: `Current (${currentFallbackPct}%)`,
                  position: 'top',
                  fill: '#0F172A',
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="netAnnualSavings"
                name="Net Annual Savings"
                stroke="#0A6847"
                strokeWidth={2.5}
                fill="url(#savingsFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monte Carlo Distribution Strip */}
      <div className="mt-4 grid grid-cols-3 gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center">
        <div>
          <div className="text-[11px] font-medium text-slate-500">Downside (P90)</div>
          <div
            className={`font-mono-num mt-0.5 text-sm font-bold ${
              simulation.p90Savings >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {simulation.p90Savings >= 0 ? '+' : '-'}$
            {Math.abs(simulation.p90Savings).toLocaleString()}
          </div>
        </div>
        <div className="border-x border-slate-200/80">
          <div className="text-[11px] font-medium text-slate-500">Median (P50)</div>
          <div
            className={`font-mono-num mt-0.5 text-sm font-bold ${
              simulation.p50Savings >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {simulation.p50Savings >= 0 ? '+' : '-'}$
            {Math.abs(simulation.p50Savings).toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500">Optimistic (P10)</div>
          <div
            className={`font-mono-num mt-0.5 text-sm font-bold ${
              simulation.p10Savings >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {simulation.p10Savings >= 0 ? '+' : '-'}$
            {Math.abs(simulation.p10Savings).toLocaleString()}
          </div>
        </div>
      </div>
    </section>
  );
}
