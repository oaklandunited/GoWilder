import { Plane } from 'lucide-react';
import type { CorridorPreset } from '@shared/types';

interface PresetBarProps {
  presets: CorridorPreset[];
  activePresetId: string | null;
  onSelect: (preset: CorridorPreset) => void;
}

export function PresetBar({ presets, activePresetId, onSelect }: PresetBarProps) {
  return (
    <section aria-label="Preset corridor templates" className="mb-6">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Plane className="h-3.5 w-3.5 text-[#0A6847]" />
          <span>Corridor Presets</span>
        </div>
        <span className="text-xs text-slate-400">Select a realistic baseline or customize below</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {presets.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset)}
              className={`group flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? 'border-[#0A6847] bg-emerald-50/70 shadow-xs ring-1 ring-[#0A6847]/20'
                  : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/70'
              }`}
            >
              <div className="mb-1 flex w-full items-center justify-between gap-1">
                <span className="font-mono-num text-xs font-bold tracking-tight text-slate-900">
                  {preset.label}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    isActive
                      ? 'bg-[#0A6847] text-white'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-800'
                  }`}
                >
                  {preset.badge}
                </span>
              </div>
              <p className="line-clamp-2 text-[11px] leading-snug text-slate-500">
                {preset.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
