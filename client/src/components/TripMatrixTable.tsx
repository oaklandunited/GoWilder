import { CheckCircle2, MinusCircle } from 'lucide-react';
import type { TripMatrixRow } from '@shared/types';

interface TripMatrixTableProps {
  rows: TripMatrixRow[];
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

export function TripMatrixTable({ rows }: TripMatrixTableProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Trip-by-Trip Cost Matrix</h2>
        <p className="text-xs text-slate-500">
          Cumulative spend and effective roundtrip cost from Trip #1 through your annual target
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3 text-right">GoWild! Expected</th>
              <th className="px-4 py-3 text-right">Baseline Cash</th>
              <th className="px-4 py-3 text-right">Net Savings (Exp.)</th>
              <th className="px-4 py-3 text-right">Eff. Cost / Trip</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.tripNumber} className="hover:bg-slate-50/60">
                <td className="font-mono-num px-4 py-2.5 font-semibold text-slate-800">
                  #{row.tripNumber}
                </td>
                <td className="font-mono-num px-4 py-2.5 text-right text-slate-700">
                  {fmtUsd(row.cumulativeGoWildExpected)}
                </td>
                <td className="font-mono-num px-4 py-2.5 text-right text-slate-500">
                  {fmtUsd(row.cumulativeBaseline)}
                </td>
                <td
                  className={`font-mono-num px-4 py-2.5 text-right font-semibold ${
                    row.netSavingsExpected >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {fmtUsd(row.netSavingsExpected, true)}
                </td>
                <td className="font-mono-num px-4 py-2.5 text-right text-slate-700">
                  {fmtUsd(row.effectiveCostPerTripExpected)}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {row.isBreakevenExpected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Profitable
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                      <MinusCircle className="h-3 w-3" />
                      Amortizing
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
