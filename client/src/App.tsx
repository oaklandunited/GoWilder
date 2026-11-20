import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Compass,
  Download,
  FileJson,
  Info,
  RotateCcw,
  Share2,
} from 'lucide-react';
import {
  calculateScenario,
  decodeScenarioFromParams,
  encodeScenarioToParams,
  formatScenarioCsv,
} from '@shared/calculator';
import { CORRIDOR_PRESETS, DEFAULT_SCENARIO } from '@shared/presets';
import type { CorridorPreset, ScenarioInput } from '@shared/types';
import { ChartsPanel } from './components/ChartsPanel';
import { ConnectionRiskCard } from './components/ConnectionRiskCard';
import { KpiStrip } from './components/KpiStrip';
import { PresetBar } from './components/PresetBar';
import { ScenarioForm } from './components/ScenarioForm';
import { TripMatrixTable } from './components/TripMatrixTable';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [input, setInput] = useState<ScenarioInput>(() =>
    decodeScenarioFromParams(window.location.search),
  );
  const [activePresetId, setActivePresetId] = useState<string | null>(() =>
    window.location.search ? null : CORRIDOR_PRESETS[0].id,
  );
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => calculateScenario(input), [input]);

  // Keep URL query params synced for effortless bookmarking/sharing
  useEffect(() => {
    const qs = encodeScenarioToParams(input);
    const nextUrl = `${window.location.pathname}?${qs}`;
    window.history.replaceState(null, '', nextUrl);
  }, [input]);

  const handlePatch = (patch: Partial<ScenarioInput>) => {
    setActivePresetId(null);
    setInput((prev) => ({ ...prev, ...patch }));
  };

  const handlePresetSelect = (preset: CorridorPreset) => {
    setActivePresetId(preset.id);
    setInput({ ...preset.input });
  };

  const handleReset = () => {
    setActivePresetId(CORRIDOR_PRESETS[0].id);
    setInput({ ...DEFAULT_SCENARIO });
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy shareable scenario URL:', url);
    }
  };

  const handleExportCsv = async () => {
    const slug = `${input.origin}-${input.destination}`.toLowerCase();
    try {
      const res = await fetch('/api/export/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const blob = await res.blob();
        triggerBlobDownload(blob, `gowild-compass-${slug}.csv`);
        return;
      }
    } catch {
      // Fallback to client-side CSV generation if offline
    }
    const csv = formatScenarioCsv(result);
    triggerBlobDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `gowild-compass-${slug}.csv`);
  };

  const handleExportJson = async () => {
    const slug = `${input.origin}-${input.destination}`.toLowerCase();
    try {
      const res = await fetch('/api/export/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const blob = await res.blob();
        triggerBlobDownload(blob, `gowild-compass-${slug}.json`);
        return;
      }
    } catch {
      // Fallback to client-side JSON generation if offline
    }
    const json = JSON.stringify(result, null, 2);
    triggerBlobDownload(
      new Blob([json], { type: 'application/json;charset=utf-8' }),
      `gowild-compass-${slug}.json`,
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0A6847] text-white shadow-xs">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900">
                  GoWild Compass
                </h1>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0A6847] ring-1 ring-emerald-200">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Frontier GoWild! Pass ROI, Connection Risk &amp; Trip Economics Modeler
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <FileJson className="h-3.5 w-3.5" />
              JSON
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A6847] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#085439]"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? 'Link Copied' : 'Share Scenario'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <PresetBar
          presets={CORRIDOR_PRESETS}
          activePresetId={activePresetId}
          onSelect={handlePresetSelect}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Control Rail */}
          <aside className="lg:col-span-4">
            <ScenarioForm input={input} onChange={handlePatch} />
          </aside>

          {/* Right Analytics Canvas */}
          <div className="space-y-5 lg:col-span-8">
            <KpiStrip result={result} />
            <ChartsPanel result={result} />
            <ConnectionRiskCard result={result} />
            <TripMatrixTable rows={result.tripMatrix} />
          </div>
        </div>
      </main>

      {/* Disclaimer Footer */}
      <footer className="mt-10 border-t border-slate-200/80 bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-xs text-slate-500 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p className="max-w-3xl leading-relaxed">
              <strong className="font-semibold text-slate-700">Estimate Disclaimer:</strong> GoWild
              Compass is an independent planning tool and is not affiliated with Frontier Airlines.
              GoWild! Pass rules, blackout dates, domestic day-before booking windows, taxes, carrier
              fees, baggage pricing, and seat availability change frequently. All figures are
              estimates for scenario modeling and not live fare guarantees.
            </p>
          </div>
          <div className="shrink-0 text-[11px] text-slate-400">
            Stateless · Zero PII · Cloud Run Ready
          </div>
        </div>
      </footer>
    </div>
  );
}
