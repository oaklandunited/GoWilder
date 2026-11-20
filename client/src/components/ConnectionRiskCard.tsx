import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import type { CalculationResult } from '@shared/types';

interface ConnectionRiskCardProps {
  result: CalculationResult;
}

export function ConnectionRiskCard({ result }: ConnectionRiskCardProps) {
  const { connectionRisk, input } = result;

  const tierStyles = {
    Low: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      bar: 'bg-emerald-600',
      icon: CheckCircle2,
    },
    Moderate: {
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      bar: 'bg-amber-500',
      icon: Clock,
    },
    High: {
      badge: 'bg-orange-50 text-orange-800 border-orange-200',
      bar: 'bg-orange-500',
      icon: AlertTriangle,
    },
    Critical: {
      badge: 'bg-rose-50 text-rose-800 border-rose-200',
      bar: 'bg-rose-600',
      icon: ShieldAlert,
    },
  }[connectionRisk.tier];

  const Icon = tierStyles.icon;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Connection Buffer &amp; Misconnect Risk
          </h2>
          <p className="text-xs text-slate-500">
            {input.itineraryType === 'direct'
              ? `${input.origin} → ${input.destination} nonstop routing`
              : `${input.origin} → ${input.connectionHub} → ${input.destination} (${input.layoverMinutes}m layover)`}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tierStyles.badge}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {connectionRisk.tier} Risk ({connectionRisk.score}/100)
        </span>
      </div>

      {/* Risk score meter */}
      <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${tierStyles.bar}`}
          style={{ width: `${connectionRisk.score}%` }}
        />
      </div>

      {/* Key metrics */}
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
        <div>
          <div className="text-[11px] text-slate-500">Hub MCT</div>
          <div className="font-mono-num mt-0.5 text-sm font-semibold text-slate-900">
            {input.itineraryType === 'direct' ? 'N/A' : `${connectionRisk.hubMinimumConnectionMinutes}m`}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">Misconnect Prob</div>
          <div className="font-mono-num mt-0.5 text-sm font-semibold text-slate-900">
            {(connectionRisk.estimatedMisconnectProbability * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">Exp. Overnight / Trip</div>
          <div className="font-mono-num mt-0.5 text-sm font-semibold text-slate-900">
            ${connectionRisk.expectedUnplannedOvernightPerTrip.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Advisories */}
      <ul className="mt-3.5 space-y-1.5">
        {connectionRisk.advisories.map((note, idx) => (
          <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
