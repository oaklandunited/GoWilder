import {
  BedDouble,
  Briefcase,
  Compass,
  DollarSign,
  ShieldAlert,
  Ticket,
} from 'lucide-react';
import {
  ACCOMMODATION_DEFAULTS,
  QUICK_DESTINATIONS,
  QUICK_HUBS,
  QUICK_ORIGINS,
} from '@shared/presets';
import type { AccommodationMode, ItineraryType, ScenarioInput } from '@shared/types';

interface ScenarioFormProps {
  input: ScenarioInput;
  onChange: (patch: Partial<ScenarioInput>) => void;
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 5000,
  step = 1,
  prefix = '$',
  hint,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-700">
        <span>{label}</span>
        {hint && <span className="text-[11px] font-normal text-slate-400">{hint}</span>}
      </div>
      <div className="relative flex items-center">
        {prefix && (
          <span className="pointer-events-none absolute left-2.5 text-xs font-medium text-slate-400">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            if (!Number.isNaN(parsed)) {
              onChange(Math.max(min, Math.min(max, parsed)));
            }
          }}
          className={`font-mono-num w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pr-2.5 text-sm text-slate-900 transition focus:border-[#0A6847] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A6847]/15 ${
            prefix ? 'pl-6' : 'pl-2.5'
          }`}
        />
      </div>
    </label>
  );
}

export function ScenarioForm({ input, onChange }: ScenarioFormProps) {
  const handleAccommodationMode = (mode: AccommodationMode) => {
    onChange({
      accommodationMode: mode,
      nightlyLodgingRate: ACCOMMODATION_DEFAULTS[mode],
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Route & Layover */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Compass className="h-3.5 w-3.5 text-[#0A6847]" />
          <span>Route, Corridor &amp; Layover</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Origin IATA</label>
            <input
              type="text"
              maxLength={3}
              value={input.origin}
              onChange={(e) =>
                onChange({ origin: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })
              }
              className="font-mono-num w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-slate-900 focus:border-[#0A6847] focus:bg-white focus:outline-none"
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {QUICK_ORIGINS.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onChange({ origin: code })}
                  className={`font-mono-num rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                    input.origin === code
                      ? 'bg-[#0A6847] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Destination IATA</label>
            <input
              type="text"
              maxLength={3}
              value={input.destination}
              onChange={(e) =>
                onChange({ destination: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })
              }
              className="font-mono-num w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-slate-900 focus:border-[#0A6847] focus:bg-white focus:outline-none"
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {QUICK_DESTINATIONS.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onChange({ destination: code })}
                  className={`font-mono-num rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                    input.destination === code
                      ? 'bg-[#0A6847] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Itinerary Type */}
        <div className="mt-3.5">
          <div className="mb-1 text-xs font-medium text-slate-700">Itinerary Structure</div>
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
            {(
              [
                ['direct', 'Direct (2 seg)'],
                ['one-stop', '1-Stop (4 seg)'],
                ['multi-leg', 'Multi (6 seg)'],
              ] as [ItineraryType, string][]
            ).map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => onChange({ itineraryType: type })}
                className={`rounded-lg py-1.5 text-xs font-medium transition ${
                  input.itineraryType === type
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Hub & Layover options when not direct */}
        {input.itineraryType !== 'direct' && (
          <div className="mt-3.5 space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-700">Connection Hub</span>
              <div className="flex flex-wrap gap-1">
                {QUICK_HUBS.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onChange({ connectionHub: code })}
                    className={`font-mono-num rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                      input.connectionHub === code
                        ? 'bg-[#0A6847] text-white'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">Layover Duration</span>
                <span className="font-mono-num font-semibold text-slate-900">
                  {input.layoverMinutes} min ({(input.layoverMinutes / 60).toFixed(1)}h)
                </span>
              </div>
              <input
                type="range"
                min={35}
                max={360}
                step={5}
                value={input.layoverMinutes}
                onChange={(e) => onChange({ layoverMinutes: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center justify-between text-xs text-slate-700">
                <span>Late-evening arrival (higher overnight risk)</span>
                <input
                  type="checkbox"
                  checked={input.lateEveningArrival}
                  onChange={(e) => onChange({ lateEveningArrival: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 accent-[#0A6847]"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between text-xs text-slate-700">
                <span>Forced overnight layover at hub</span>
                <input
                  type="checkbox"
                  checked={input.forcedOvernightLayover}
                  onChange={(e) => onChange({ forcedOvernightLayover: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 accent-[#0A6847]"
                />
              </label>
            </div>

            {input.forcedOvernightLayover && (
              <NumberField
                label="Planned Hub Overnight Cost"
                value={input.layoverOvernightCost}
                onChange={(val) => onChange({ layoverOvernightCost: val })}
                max={1000}
              />
            )}
          </div>
        )}
      </section>

      {/* 2. Pass Amortization */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Ticket className="h-3.5 w-3.5 text-[#0A6847]" />
          <span>GoWild! Pass Amortization</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Annual Pass Price"
            value={input.annualPassPrice}
            onChange={(val) => onChange({ annualPassPrice: val })}
            max={2500}
          />
          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Roundtrips / Yr</span>
              <span className="font-mono-num font-bold text-[#0A6847]">
                {input.plannedRoundtrips}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={24}
              step={1}
              value={input.plannedRoundtrips}
              onChange={(e) => onChange({ plannedRoundtrips: Number(e.target.value) })}
              className="mt-2 w-full"
            />
          </div>
        </div>

        <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span>Pass already purchased (treat as sunk cost)</span>
          <input
            type="checkbox"
            checked={input.passAlreadySunk}
            onChange={(e) => onChange({ passAlreadySunk: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 accent-[#0A6847]"
          />
        </label>
      </section>

      {/* 3. Fares, Bags & Booking Window */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Briefcase className="h-3.5 w-3.5 text-[#0A6847]" />
          <span>Per-Segment Fees &amp; Ancillaries</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Base Fare / Seg"
            value={input.baseFarePerSegment}
            onChange={(val) => onChange({ baseFarePerSegment: val })}
            step={0.01}
            max={200}
          />
          <NumberField
            label="Taxes & Fees / Seg"
            value={input.taxesFeesPerSegment}
            onChange={(val) => onChange({ taxesFeesPerSegment: val })}
            step={0.5}
            max={150}
          />
          <NumberField
            label="Carry-On / Dir"
            value={input.carryOnPerDirection}
            onChange={(val) => onChange({ carryOnPerDirection: val })}
            max={150}
          />
          <NumberField
            label="Checked Bag / Dir"
            value={input.checkedBagPerDirection}
            onChange={(val) => onChange({ checkedBagPerDirection: val })}
            max={150}
          />
          <NumberField
            label="Seat / Bundle / Dir"
            value={input.seatOrBundlePerDirection}
            onChange={(val) => onChange({ seatOrBundlePerDirection: val })}
            max={200}
          />
          <NumberField
            label="Early Booking / Dir"
            value={input.earlyBookingFeePerDirection}
            onChange={(val) => onChange({ earlyBookingFeePerDirection: val })}
            max={200}
          />
        </div>

        <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span>Use Paid Early Booking (instead of day-before window)</span>
          <input
            type="checkbox"
            checked={input.earlyBookingEnabled}
            onChange={(e) => onChange({ earlyBookingEnabled: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 accent-[#0A6847]"
          />
        </label>
      </section>

      {/* 4. Lodging & Ground */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <BedDouble className="h-3.5 w-3.5 text-[#0A6847]" />
          <span>Accommodation &amp; Ground</span>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
          {(
            [
              ['hostel', 'Hostel'],
              ['hotel', 'Hotel'],
              ['family', 'Family ($0)'],
            ] as [AccommodationMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleAccommodationMode(mode)}
              className={`rounded-lg py-1.5 text-xs font-medium transition ${
                input.accommodationMode === mode
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Nights / Trip"
            value={input.nightsPerTrip}
            onChange={(val) => onChange({ nightsPerTrip: Math.round(val) })}
            prefix=""
            max={30}
          />
          <NumberField
            label="Nightly Rate"
            value={input.accommodationMode === 'family' ? 0 : input.nightlyLodgingRate}
            onChange={(val) => onChange({ nightlyLodgingRate: val })}
            max={1000}
          />
          <NumberField
            label="Airport Transit / Trip"
            value={input.groundTransitPerTrip}
            onChange={(val) => onChange({ groundTransitPerTrip: val })}
            max={500}
          />
          <NumberField
            label="Layover Food / Lounge"
            value={input.layoverBufferPerTrip}
            onChange={(val) => onChange({ layoverBufferPerTrip: val })}
            max={300}
          />
        </div>
      </section>

      {/* 5. Baseline Cash & Availability Risk */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <DollarSign className="h-3.5 w-3.5 text-[#0A6847]" />
          <span>Baseline Cash &amp; Availability Risk</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Baseline RT Cash Fare"
            value={input.baselineRoundtripFare}
            onChange={(val) => onChange({ baselineRoundtripFare: val })}
            max={3000}
          />
          <NumberField
            label="Baseline Bag Fees (RT)"
            value={input.baselineBaggageFees}
            onChange={(val) => onChange({ baselineBaggageFees: val })}
            max={500}
          />
        </div>

        <div className="mt-3.5 rounded-xl border border-amber-200/70 bg-amber-50/40 p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-950">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              Fallback Cash-Fare Probability
            </span>
            <span className="font-mono-num font-bold text-amber-900">
              {Math.round(input.fallbackLegProbability * 100)}% of legs
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={60}
            step={1}
            value={Math.round(input.fallbackLegProbability * 100)}
            onChange={(e) => onChange({ fallbackLegProbability: Number(e.target.value) / 100 })}
            className="w-full"
          />
          <p className="mt-1 text-[11px] leading-snug text-amber-900/75">
            Probability a day-before GoWild! seat is sold out or blacked out, forcing a last-minute
            cash ticket.
          </p>

          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <NumberField
              label="Fallback 1-Way Fare"
              value={input.fallbackOneWayFare}
              onChange={(val) => onChange({ fallbackOneWayFare: val })}
              max={1500}
            />
            <NumberField
              label="Misconnect Hotel Cost"
              value={input.unplannedOvernightCost}
              onChange={(val) => onChange({ unplannedOvernightCost: val })}
              max={1000}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
