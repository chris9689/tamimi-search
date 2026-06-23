import React, { useState, useCallback, useRef } from 'react';
import { useConfig } from '../context/ConfigContext';
import { runBenchmark, type BenchmarkRun, type BenchmarkSpec } from '../utils/benchmarkRunner';
import { downloadReport } from '../utils/benchmarkReport';
import { Download, Play, AlertCircle, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

// ─── Default config stored in localStorage ───────────────────────────────────

const STORAGE_KEY = 'dy_benchmark_spec';

const DEFAULT_SPEC: BenchmarkSpec = {
  queries: [
    'sukienka',
    'klapki',
    'spodenki',
    'top',
    'pizama damska',
    'spodenki damskie',
    'spodnie',
    'pizama',
    'szorty',
    'klapki damskie',
    'spodnica',
    'stroj kapielowy',
    'sukienka damska',
    'spodnie damskie',
    'kolarki',
    'torebka',
    'szorty damskie',
    'koszula',
    'posciel',
    'dywan',
    'akcesoria szkolne pusheen',
    'sukienka w kwiaty na wieczór koktajlowy',
    'Styl nordycki',
    'Wełna bluza',
    'akcesoria plażowe',
    {
      text: 'bluza',
      affinityProfiles: [
        { name: 'czerwony', profile: { color: { czerwony: 1000 } } },
        { name: 'niebieski', profile: { color: { niebieski: 1000 } } },
      ],
    },
  ],
  itemsToShow: 6,
  configurations: [
    {
      name: 'Baseline',
      description: 'Default settings — all override keys shown for reference',
      overrides: {
        // Search behaviour
        strategy: 'SEMANTIC_SEARCH',   // 'SEMANTIC_SEARCH' | 'KEYWORD_SEARCH'
        suggestMode: true,
        translationEnabled: false,
        plpSearchMode: false,
        explainMode: false,
        sortByEnabled: false,

        // KNN / retrieval
        k: 100,
        numCandidates: 500,
        imageBoost: 0.5,
        imageKnnThreshold: 0.8,
        textKnnThreshold: 0.7,

        // Results
        itemsPerPage: 12,
        maxProducts: 1000,

        // Bucket size (optional)
        useBucketSize: false,
        bucketSize: 10,

        // Search formula (optional)
        useSearchFormula: false,
        searchFormula: '',

        // Locale (optional)
        useLocale: false,
        locale: 'en_US',

        // Affinity boosting (optional — or use per-query affinityProfiles instead)
        useAffinityBoosting: false,
        affinityBoostWeight: 80,

        // Dynamic boosting (optional)
        useDynamicBoosting: false,
        dynamicBoostingFactors: [
          { field: 'categories', value: 'example', matchType: 'IS', weight: 50 },
        ],

        // Context
        language: 'pl_PL',
        ctxType: 'HOMEPAGE',
        geoCode: 'PL',
        geoRegionCode: 'PL',
      },
    },
    {
      name: 'Translation + High Candidates',
      description: 'Translation enabled, more KNN candidates for better recall',
      overrides: {
        translationEnabled: true,
        numCandidates: 1000,
        k: 200,
        language: 'pl_PL',
        geoCode: 'PL',
        geoRegionCode: 'PL',
      },
    },
  ],
};

function loadSpec(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ?? JSON.stringify(DEFAULT_SPEC, null, 2);
  } catch {
    return JSON.stringify(DEFAULT_SPEC, null, 2);
  }
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function timingClass(ms: number): string {
  if (ms < 500) return 'text-green-600 border-green-400';
  if (ms < 2000) return 'text-amber-600 border-amber-400';
  return 'text-red-600 border-red-400';
}

function statusClass(code: number | null): string {
  if (code === null) return 'text-gray-500 border-gray-300';
  if (code >= 200 && code < 300) return 'text-green-600 border-green-400';
  if (code >= 400 && code < 500) return 'text-amber-600 border-amber-400';
  return 'text-red-600 border-red-400';
}

// ─── BenchmarkPage ────────────────────────────────────────────────────────────

export const BenchmarkPage: React.FC = () => {
  const { config } = useConfig();

  const [specJson, setSpecJson] = useState<string>(loadSpec);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number; label: string } | null>(null);
  const [result, setResult] = useState<BenchmarkRun | null>(null);
  const [expandedConfigs, setExpandedConfigs] = useState(false);
  const abortRef = useRef(false);

  // Persist JSON edits to localStorage
  const handleJsonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSpecJson(val);
    try {
      JSON.parse(val);
      setJsonError(null);
      localStorage.setItem(STORAGE_KEY, val);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }, []);

  const handleRun = useCallback(async () => {
    let spec: BenchmarkSpec;
    try {
      spec = JSON.parse(specJson) as BenchmarkSpec;
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
      return;
    }

    if (!Array.isArray(spec.queries) || spec.queries.length === 0) {
      setJsonError('"queries" must be a non-empty array');
      return;
    }
    if (!Array.isArray(spec.configurations) || spec.configurations.length === 0) {
      setJsonError('"configurations" must be a non-empty array');
      return;
    }

    abortRef.current = false;
    setRunning(true);
    setResult(null);
    setProgress({ completed: 0, total: spec.queries.length * spec.configurations.length, label: '' });

    try {
      const run = await runBenchmark(config, spec, (completed, total, label) => {
        setProgress({ completed, total, label });
      });
      setResult(run);
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }, [specJson, config]);

  const handleDownload = useCallback(() => {
    if (result) downloadReport(result);
  }, [result]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            <ArrowLeft size={14} /> Back to Search
          </a>
          <span className="text-gray-200">|</span>
          <h1 className="text-sm font-bold uppercase tracking-widest">Search Benchmark</h1>
        </div>
        {result && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors"
          >
            <Download size={14} /> Download Report
          </button>
        )}
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
        {/* Config Editor */}
        <section className="bg-white border border-gray-200 rounded-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-widest">Benchmark Configuration</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Edit JSON below. Each configuration's <code className="bg-gray-100 px-1 rounded">overrides</code> are merged on top of the current app config.
              </p>
            </div>
            <button
              onClick={handleRun}
              disabled={running || !!jsonError}
              className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Play size={13} />
              {running ? 'Running…' : 'Run Benchmark'}
            </button>
          </div>

          <div className="p-5">
            <textarea
              value={specJson}
              onChange={handleJsonChange}
              spellCheck={false}
              rows={20}
              className={`w-full font-mono text-[12px] bg-gray-50 border rounded-sm p-4 outline-none resize-y focus:bg-white transition-colors ${
                jsonError ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-black'
              }`}
            />
            {jsonError && (
              <div className="mt-2 flex items-start gap-2 text-red-600 text-[11px]">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}
          </div>

          {/* Current app config reference */}
          <div className="border-t border-gray-100">
            <button
              onClick={() => setExpandedConfigs((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
            >
              <span>Current app config (available keys for overrides)</span>
              {expandedConfigs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {expandedConfigs && (
              <pre className="px-5 pb-4 text-[11px] font-mono bg-gray-50 overflow-x-auto text-gray-600">
                {JSON.stringify(config, null, 2)}
              </pre>
            )}
          </div>
        </section>

        {/* Progress */}
        {running && progress && (
          <div className="bg-white border border-gray-200 rounded-sm px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest">
                Running… {progress.completed}/{progress.total}
              </span>
              <span className="text-[11px] text-gray-400 animate-pulse">{progress.label}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-black transition-all duration-300"
                style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Results */}
        {result && <BenchmarkResults run={result} />}
      </main>
    </div>
  );
};

const BenchmarkResults: React.FC<{ run: BenchmarkRun }> = ({ run }) => {
  const { spec, cells, rowKeys } = run;

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-widest">
          Results — {run.runAt.toLocaleString()}
        </h2>
        <span className="text-[11px] text-gray-400">
          {rowKeys.length} rows × {spec.configurations.length} configurations
        </span>
      </div>

      {rowKeys.map((rowKey) => {
        const rowCells = spec.configurations.map((cfg) =>
          cells.find((c) => c.rowKey === rowKey && c.configName === cfg.name),
        );
        const firstCell = rowCells.find(Boolean);
        const affinityProfileName = firstCell?.affinityProfileName;

        return (
          <div key={rowKey} className="bg-white border border-gray-200 rounded-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Query: </span>
              <span className="text-[13px] font-bold text-blue-600">"{firstCell?.query ?? rowKey}"</span>
              {affinityProfileName && (
                <span className="text-[10px] font-bold bg-violet-100 text-violet-700 rounded px-2 py-0.5">
                  persona: {affinityProfileName}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {spec.configurations.map((cfg) => (
                      <th
                        key={cfg.name}
                        className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest border-b border-r border-gray-100 bg-white whitespace-nowrap"
                        style={{ minWidth: 220 }}
                      >
                        {cfg.name}
                        {cfg.description && (
                          <div className="font-normal normal-case tracking-normal text-[10px] text-gray-400 mt-0.5">
                            {cfg.description}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {rowCells.map((cell, i) => (
                      <td
                        key={i}
                        className="align-top px-4 py-4 border-r border-gray-100 last:border-r-0"
                        style={{ minWidth: 220 }}
                      >
                        {!cell ? (
                          <span className="text-[11px] text-gray-400">No data</span>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 ${timingClass(cell.durationMs)}`}>
                                {cell.durationMs}ms
                              </span>
                              <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 ${statusClass(cell.statusCode)}`}>
                                {cell.statusCode ?? 'ERR'}
                              </span>
                              <span className="text-[10px] font-bold border rounded px-1.5 py-0.5 text-gray-500 border-gray-200">
                                {cell.totalResults.toLocaleString()} results
                              </span>
                            </div>
                            {cell.error && (
                              <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5 mb-2">
                                {cell.error}
                              </div>
                            )}
                            {cell.products.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {cell.products.map((p, pi) => (
                                  <a
                                    key={pi}
                                    href={p.url !== '#' ? p.url : undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-[72px] flex flex-col group"
                                    title={p.title}
                                  >
                                    <div className="w-[72px] h-[96px] bg-gray-100 overflow-hidden">
                                      {p.imageUrl ? (
                                        <img
                                          src={p.imageUrl}
                                          alt={p.title}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-300 uppercase">
                                          No img
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-[9px] mt-1 text-gray-600 leading-tight line-clamp-2">{p.title}</p>
                                    <p className="text-[9px] font-bold text-gray-800">{p.price}</p>
                                  </a>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
};
