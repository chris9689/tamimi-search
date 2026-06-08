import { useState } from 'react';
import { useConfig, DYConfig, DynamicBoostingFactor } from '../context/ConfigContext';
import { useRequestLog } from '../context/RequestLogContext';
import { X, Terminal, Save, Database, RefreshCw, Globe, Cpu, Search, Layout, Codepen, Copy, Check, ImagePlus, ChevronDown, Plus, Trash2, Key, Eye, EyeOff, RefreshCcw, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';

export const ConfigPanel = ({ onClose }: { onClose: () => void }) => {
  const { config, setConfig, lastRequestPayload } = useConfig();
  const { log: requestLog, loggedFetch, clearLog } = useRequestLog();
  const [localConfig, setLocalConfig] = useState<DYConfig>(config);
  const [activeTab, setActiveTab] = useState<'config' | 'payload' | 'network'>('config');
  const [copied, setCopied] = useState(false);
  const [showDynamicBoosting, setShowDynamicBoosting] = useState(false);
  const [showAffinityBoosting, setShowAffinityBoosting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [widgets, setWidgets] = useState<Array<{ id: number; name: string; strategy: string }>>([]);
  const [fetchingWidgets, setFetchingWidgets] = useState(false);
  const [widgetFetchError, setWidgetFetchError] = useState<string | null>(null);

  const fetchWidgets = async () => {
    if (!localConfig.sectionId) {
      setWidgetFetchError('Section ID is required');
      return;
    }
    if (!localConfig.feedId) {
      setWidgetFetchError('Enter a Feed ID first, then fetch widgets');
      return;
    }
    setFetchingWidgets(true);
    setWidgetFetchError(null);
    try {
      const res = await loggedFetch(
        `https://recs-worker.use1.dynamicyield.com/api/v1/section/${localConfig.sectionId}/feed/${localConfig.feedId}/widgets`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch widgets');
      setWidgets(data.widgets ?? []);
      if ((data.widgets ?? []).length === 0) setWidgetFetchError('No widgets found for this section/feed');
    } catch (e) {
      setWidgetFetchError(e instanceof Error ? e.message : String(e));
    } finally {
      setFetchingWidgets(false);
    }
  };

  const handleSave = () => {
    setConfig(localConfig);
    onClose();
  };

  const handleReset = () => {
    localStorage.removeItem('dy_sinsay_config');
    window.location.reload();
  };

  const handleCopyRequest = () => {
    if (lastRequestPayload) {
      navigator.clipboard.writeText(JSON.stringify(lastRequestPayload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const updateField = (field: keyof DYConfig, value: any) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const addDynamicBoostingFactor = () => {
    const next: DynamicBoostingFactor[] = [
      ...(localConfig.dynamicBoostingFactors || []),
      {
        field: '',
        value: '',
        matchType: 'IS',
        weight: 0,
      },
    ];
    updateField('dynamicBoostingFactors', next);
  };

  const removeDynamicBoostingFactor = (idx: number) => {
    const next = (localConfig.dynamicBoostingFactors || []).filter((_, factorIdx) => factorIdx !== idx);
    updateField('dynamicBoostingFactors', next);
  };

  const updateDynamicBoostingFactor = (
    idx: number,
    field: keyof DynamicBoostingFactor,
    value: string | number
  ) => {
    const next = (localConfig.dynamicBoostingFactors || []).map((factor, factorIdx) => {
      if (factorIdx !== idx) {
        return factor;
      }

      if (field === 'weight') {
        const numeric = typeof value === 'number' ? value : Number(value);
        return { ...factor, weight: Math.max(-100, Math.min(100, Number.isNaN(numeric) ? 0 : numeric)) };
      }

      return { ...factor, [field]: value };
    });

    updateField('dynamicBoostingFactors', next);
  };

  const handleLogoUpload = (file: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateField('logoUrl', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-100 flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-xl bg-[#0f0f0f] border-l border-white/10 text-gray-300 h-full p-8 font-mono text-[10px] overflow-y-auto custom-scrollbar"
      >
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <div className="flex flex-col">
            <h2 className="text-green-500 text-base flex items-center gap-2 font-bold tracking-tight">
              <Terminal size={20}/> DY_PREVIEW_DEBUG_v3
            </h2>
            <div className="flex gap-4 mt-2">
              <button 
                onClick={() => setActiveTab('config')}
                className={`text-[9px] uppercase tracking-wider font-bold transition-colors ${activeTab === 'config' ? 'text-white border-b border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Configuration
              </button>
              <button 
                onClick={() => setActiveTab('payload')}
                className={`text-[9px] uppercase tracking-wider font-bold transition-colors ${activeTab === 'payload' ? 'text-white border-b border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Request Inspector
              </button>
              <button
                onClick={() => setActiveTab('network')}
                className={`text-[9px] uppercase tracking-wider font-bold transition-colors flex items-center gap-1 ${activeTab === 'network' ? 'text-white border-b border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Wifi size={9} /> Network
                {requestLog.length > 0 && (
                  <span className="ml-0.5 bg-zinc-700 text-zinc-300 rounded-full px-1.5 py-0.5 text-[7px]">{requestLog.length}</span>
                )}
              </button>
            </div>
          </div>
          <button onClick={onClose} className="hover:text-white transition-colors p-2 hover:bg-white/5 rounded">
            <X size={24} />
          </button>
        </div>

        {activeTab === 'config' ? (
          <div className="space-y-10 pb-20">
            {/* Section: API Keys & Branding */}
            <section>
              <SectionHeader icon={<Key size={14}/>} title="API Keys & Branding" />
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1.5 px-0.5">
                    <label className="text-zinc-400 font-bold uppercase tracking-tighter text-[9px]">Experience API Key</label>
                    <span className="text-zinc-600 italic text-[8px]">Used for Visual Search &amp; Shopping Muse</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2.5 pr-10 rounded text-zinc-100 focus:border-green-500/50 focus:bg-zinc-800/50 outline-none transition-all placeholder:text-zinc-700"
                      value={localConfig.experienceApiKey}
                      placeholder="Using server env var (VISUALSEARCH_API_KEY)"
                      onChange={e => updateField('experienceApiKey', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {localConfig.experienceApiKey && (
                    <button
                      type="button"
                      onClick={() => updateField('experienceApiKey', '')}
                      className="mt-1.5 text-[8px] text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      ✕ Clear override — revert to server env var
                    </button>
                  )}
                </div>
                <div>
                  <ConfigField
                    label="Logo URL"
                    value={localConfig.logoUrl}
                    onChange={(v: string) => updateField('logoUrl', v)}
                    description="URL or data URI"
                  />
                  <label className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded border border-zinc-700 hover:border-zinc-500 text-zinc-300 cursor-pointer uppercase text-[9px] font-bold tracking-wider">
                    <ImagePlus size={12} /> Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>
            </section>

            {/* Section: Core API */}
            <section>
              <SectionHeader icon={<Database size={14}/>} title="Core API Resolution" />
              <div className="grid grid-cols-2 gap-4">
                <ConfigField label="Section ID" value={localConfig.sectionId} onChange={(v: string) => updateField('sectionId', v)} />
                <ConfigField label="Feed ID" value={localConfig.feedId} onChange={(v: string) => updateField('feedId', v)} description="Required — find in DY UI → Assets → Feeds" /><div className="col-span-2">
                  <div className="flex justify-between mb-1.5 px-0.5">
                    <label className="text-zinc-400 font-bold uppercase tracking-tighter text-[9px]">Widget ID</label>
                    <button
                      type="button"
                      onClick={fetchWidgets}
                      disabled={fetchingWidgets}
                      className="flex items-center gap-1 text-[8px] uppercase font-bold tracking-wider text-zinc-500 hover:text-green-400 disabled:opacity-40 transition-colors"
                    >
                      <RefreshCcw size={10} className={fetchingWidgets ? 'animate-spin' : ''} />
                      {fetchingWidgets ? 'Fetching…' : 'Fetch from API'}
                    </button>
                  </div>
                  {widgets.length > 0 ? (
                    <select
                      value={localConfig.widgetId}
                      onChange={e => updateField('widgetId', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2.5 rounded text-zinc-100 focus:border-green-500/50 outline-none transition-all text-[11px]"
                    >
                      <option value="">— select a widget —</option>
                      {widgets.map(w => {
                        let strategyKey = w.name;
                        try { strategyKey = JSON.parse(w.strategy)?.key ?? w.name; } catch {}
                        return <option key={w.id} value={String(w.id)}>{w.name} ({strategyKey})</option>;
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2.5 rounded text-zinc-100 focus:border-green-500/50 focus:bg-zinc-800/50 outline-none transition-all placeholder:text-zinc-700"
                      value={localConfig.widgetId}
                      onChange={e => updateField('widgetId', e.target.value)}
                    />
                  )}
                  {widgetFetchError && <p className="mt-1 text-[9px] text-red-400">{widgetFetchError}</p>}
                  <p className="mt-1.5 text-[8px] text-zinc-600 italic">Optional — leave blank to use request parameters directly. Widgets pre-configure strategy, filters &amp; ranking.</p>
                </div>
              </div>
            </section>

            {/* Section: Strategy & Search */}
            <section>
              <SectionHeader icon={<Search size={14}/>} title="Search & Strategy" />
              <div className="grid grid-cols-2 gap-4">
                <ConfigField label="Strategy" value={localConfig.strategy} onChange={(v: string) => updateField('strategy', v)} />
                <ConfigField label="Max Products" type="number" value={localConfig.maxProducts} onChange={(v: string) => updateField('maxProducts', parseInt(v))} />
                <ConfigField label="Items Per Page" type="number" value={localConfig.itemsPerPage} onChange={(v: string) => updateField('itemsPerPage', parseInt(v))} />
                <div className="flex items-center gap-2 col-span-2">
                  <Toggle label="Bucket Size" checked={localConfig.useBucketSize} onChange={(v: boolean) => updateField('useBucketSize', v)} />
                  {localConfig.useBucketSize && (
                    <ConfigField label="" type="number" value={localConfig.bucketSize} onChange={(v: string) => updateField('bucketSize', parseInt(v))} className="flex-1" />
                  )}
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <Toggle label="Search Formula" checked={localConfig.useSearchFormula} onChange={(v: boolean) => updateField('useSearchFormula', v)} />
                  {localConfig.useSearchFormula && (
                    <input type="text" value={localConfig.searchFormula} onChange={(e) => updateField('searchFormula', e.target.value)} className="flex-1 bg-black/30 border border-gray-700 rounded px-2 py-1 text-[9px]" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 col-span-2">
                  <Toggle label="Suggest Mode" checked={localConfig.suggestMode} onChange={(v: boolean) => updateField('suggestMode', v)} />
                  <Toggle label="Explain Mode" checked={localConfig.explainMode} onChange={(v: boolean) => updateField('explainMode', v)} />
                  <Toggle label="Translation" checked={localConfig.translationEnabled} onChange={(v: boolean) => updateField('translationEnabled', v)} />
                  <Toggle label="PLP Mode" checked={localConfig.plpSearchMode} onChange={(v: boolean) => updateField('plpSearchMode', v)} />
                  <Toggle label="Sort by Popularity" checked={localConfig.sortByEnabled} onChange={(v: boolean) => updateField('sortByEnabled', v)} />
                </div>
              </div>
            </section>

            {/* Section: KNN & AI Parameters */}
            <section>
              <SectionHeader icon={<Cpu size={14}/>} title="Semantic & KNN Parameters" />
              <div className="grid grid-cols-2 gap-4">
                <ConfigField label="K (Neighbors)" type="number" value={localConfig.k} onChange={(v: string) => updateField('k', parseInt(v))} />
                <ConfigField label="Num Candidates" type="number" value={localConfig.numCandidates} onChange={(v: string) => updateField('numCandidates', parseInt(v))} />
                <ConfigField label="Text KNN Threshold" type="number" step="0.01" value={localConfig.textKnnThreshold} onChange={(v: string) => updateField('textKnnThreshold', parseFloat(v))} />
                <ConfigField label="Image KNN Threshold" type="number" step="0.01" value={localConfig.imageKnnThreshold} onChange={(v: string) => updateField('imageKnnThreshold', parseFloat(v))} />
                <ConfigField label="Image Boost" type="number" step="0.1" value={localConfig.imageBoost} onChange={(v: string) => updateField('imageBoost', parseFloat(v))} />
              </div>
            </section>

            {/* Section: Context & Geo */}
            <section>
              <SectionHeader icon={<Globe size={14}/>} title="Localization & Environment" />
              <div className="grid grid-cols-2 gap-4">
                <ConfigField label="Context Type (type)" value={localConfig.ctxType} onChange={(v: string) => updateField('ctxType', v)} description="e.g. HOMEPAGE" />
                <ConfigField label="Language (lng)" value={localConfig.language} onChange={(v: string) => updateField('language', v)} />
                <div className="flex items-center gap-2 col-span-2">
                  <Toggle label="Locale" checked={localConfig.useLocale} onChange={(v: boolean) => updateField('useLocale', v)} />
                  {localConfig.useLocale && (
                    <input type="text" value={localConfig.locale} onChange={(e) => updateField('locale', e.target.value)} className="flex-1 bg-black/30 border border-gray-700 rounded px-2 py-1 text-[9px]" />
                  )}
                </div>
                <ConfigField label="Geo Code" value={localConfig.geoCode} onChange={(v: string) => updateField('geoCode', v)} />
                <ConfigField label="Geo Region" value={localConfig.geoRegionCode} onChange={(v: string) => updateField('geoRegionCode', v)} />
                <ConfigField label="Visitor ID (uid)" value={localConfig.uid} onChange={(v: string) => updateField('uid', v)} className="col-span-2" />
                <ConfigField label="Currency" value={localConfig.currency} onChange={(v: string) => updateField('currency', v.toUpperCase())} />
                <div className="col-span-2">
                  <ConfigField
                    label="Category Path"
                    value={localConfig.categoryPath}
                    onChange={(v: string) => updateField('categoryPath', v)}
                    description="Format: Sinsay / Women / Search"
                  />
                </div>
              </div>
            </section>

            {/* Section: Mapping */}
            <section>
              <SectionHeader icon={<Layout size={14}/>} title="Field Priority Mapping" />
              <div className="space-y-4">
                <ConfigField 
                  label="Title (priority list)" 
                  value={localConfig.mapping.title.join(', ')} 
                  onChange={(v: string) => setLocalConfig({...localConfig, mapping: {...localConfig.mapping, title: v.split(',').map((s: string) => s.trim())}})} 
                />
                <ConfigField 
                  label="Images (priority list)" 
                  value={localConfig.mapping.image.join(', ')} 
                  onChange={(v: string) => setLocalConfig({...localConfig, mapping: {...localConfig.mapping, image: v.split(',').map((s: string) => s.trim())}})} 
                />
                <ConfigField 
                  label="Price (priority list)" 
                  value={localConfig.mapping.price.join(', ')} 
                  onChange={(v: string) => setLocalConfig({...localConfig, mapping: {...localConfig.mapping, price: v.split(',').map((s: string) => s.trim())}})} 
                />
              </div>
            </section>

            <section>
              <SectionHeader icon={<Search size={14}/>} title="Priority Boosting" />
              <div className="space-y-4">
                <div className="rounded border border-zinc-800 bg-black/20">
                  <button
                    type="button"
                    onClick={() => setShowDynamicBoosting((prev) => !prev)}
                    className="w-full px-3 py-2 flex items-center justify-between text-left"
                  >
                    <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-300">Dynamic Attribute Boosting</span>
                    <ChevronDown size={14} className={`transition-transform ${showDynamicBoosting ? 'rotate-180' : ''}`} />
                  </button>

                  {showDynamicBoosting ? (
                    <div className="px-3 pb-3 space-y-3 border-t border-zinc-800">
                      <div className="pt-3 flex items-center justify-between gap-2">
                        <Toggle
                          label="Enable Dynamic Boosting"
                          checked={localConfig.useDynamicBoosting}
                          onChange={(v: boolean) => updateField('useDynamicBoosting', v)}
                        />
                        <button
                          type="button"
                          onClick={addDynamicBoostingFactor}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500 text-[9px] uppercase font-bold"
                        >
                          <Plus size={12} /> Add Filter
                        </button>
                      </div>

                      <p
                        className="text-[9px] text-zinc-500"
                        title="Boosts products where a specific attribute matches a value. matchType options: IS (exact match), CONTAINS (substring), IS_NOT (exclusion). weight range: -100-100. Higher = stronger boost."
                      >
                        Boosts products where a specific attribute matches a value.
                      </p>

                      {(localConfig.dynamicBoostingFactors || []).map((factor, idx) => (
                        <div key={`dynamic-factor-${idx}`} className="rounded border border-zinc-800 p-2 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <ConfigField
                              label="Field"
                              value={factor.field}
                              onChange={(v: string) => updateDynamicBoostingFactor(idx, 'field', v)}
                            />
                            <ConfigField
                              label="Value"
                              value={factor.value}
                              onChange={(v: string) => updateDynamicBoostingFactor(idx, 'value', v)}
                            />
                            <div>
                              <div className="flex justify-between mb-1.5 px-0.5">
                                <label className="text-zinc-400 font-bold uppercase tracking-tighter text-[9px]">Match Type</label>
                              </div>
                              <select
                                value={factor.matchType}
                                onChange={(e) => updateDynamicBoostingFactor(idx, 'matchType', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2.5 rounded text-zinc-100 focus:border-green-500/50 focus:bg-zinc-800/50 outline-none transition-all"
                              >
                                <option value="IS">IS</option>
                                <option value="CONTAINS">CONTAINS</option>
                                <option value="IS_NOT">IS_NOT</option>
                              </select>
                            </div>
                            <ConfigField
                              label="Weight (-100 to 100)"
                              type="number"
                              value={factor.weight}
                              onChange={(v: string) => updateDynamicBoostingFactor(idx, 'weight', Number(v))}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDynamicBoostingFactor(idx)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-zinc-700 hover:border-red-500 text-[9px] uppercase font-bold text-zinc-400 hover:text-red-400"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded border border-zinc-800 bg-black/20">
                  <button
                    type="button"
                    onClick={() => setShowAffinityBoosting((prev) => !prev)}
                    className="w-full px-3 py-2 flex items-center justify-between text-left"
                  >
                    <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-300">Affinity Boosting</span>
                    <ChevronDown size={14} className={`transition-transform ${showAffinityBoosting ? 'rotate-180' : ''}`} />
                  </button>

                  {showAffinityBoosting ? (
                    <div className="px-3 pb-3 space-y-3 border-t border-zinc-800">
                      <div className="pt-3">
                        <Toggle
                          label="Enable Affinity Boosting"
                          checked={localConfig.useAffinityBoosting}
                          onChange={(v: boolean) => updateField('useAffinityBoosting', v)}
                        />
                      </div>

                      <ConfigField
                        label="Affinity Weight (-100 to 100)"
                        type="number"
                        value={localConfig.affinityBoostWeight}
                        onChange={(v: string) => updateField('affinityBoostWeight', Math.max(-100, Math.min(100, Number(v) || 0)))}
                      />

                      <div>
                        <div className="flex justify-between mb-1.5 px-0.5">
                          <label className="text-zinc-400 font-bold uppercase tracking-tighter text-[9px]">Affinity Profile JSON</label>
                        </div>
                        <textarea
                          value={localConfig.affinityProfileJson}
                          onChange={(e) => updateField('affinityProfileJson', e.target.value)}
                          rows={8}
                          className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2.5 rounded text-zinc-100 focus:border-green-500/50 focus:bg-zinc-800/50 outline-none transition-all placeholder:text-zinc-700 resize-y"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="sticky bottom-0 bg-[#0f0f0f] pt-6 pb-2 border-t border-gray-800 flex flex-col gap-3">
              <button 
                onClick={handleSave}
                className="w-full bg-sinsay-red hover:bg-[#b00000] text-white font-bold py-4 rounded uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Save size={18} /> Update API Session
              </button>
              <button 
                onClick={handleReset}
                className="w-full bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-500 py-3 rounded flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw size={14} /> Factory Reset
              </button>
            </div>
          </div>
        ) : activeTab === 'payload' ? (
          <div className="pb-20">
            <div className="flex justify-between items-center mb-4">
              <SectionHeader icon={<Codepen size={14}/>} title="Final Request Payload" />
              {lastRequestPayload && (
                <button 
                  onClick={handleCopyRequest}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all text-[9px] uppercase font-bold ${
                    copied 
                    ? 'bg-green-500/20 border-green-500/50 text-green-500' 
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {copied ? <Check size={12}/> : <Copy size={12}/>}
                  {copied ? 'Copied' : 'Copy Payload'}
                </button>
              )}
            </div>
            <p className="text-zinc-500 text-[9px] mb-4">Copy-paste this payload into API clients for direct testing.</p>
            <div className="relative bg-black/40 border border-white/5 p-4 rounded-lg overflow-x-auto group">
              <pre className="text-green-500/80 text-[9px] selection:bg-green-500/20">
                {lastRequestPayload ? JSON.stringify(lastRequestPayload, null, 2) : "// No request captured yet. Perform a search first."}
              </pre>
            </div>
          </div>
        ) : (
          <NetworkTab log={requestLog} onClear={clearLog} />
        )}
      </motion.div>
    </div>
  );
};

const SectionHeader = ({ icon, title }: any) => (
  <h3 className="text-zinc-500 mb-6 uppercase flex items-center gap-2 font-bold tracking-[0.2em] text-[9px]">
    {icon} {title}
  </h3>
);

const ConfigField = ({ label, value, onChange, description, type = "text", step, className = "" }: any) => (
  <div className={className}>
    <div className="flex justify-between mb-1.5 px-0.5">
      <label className="text-zinc-400 font-bold uppercase tracking-tighter text-[9px]">{label}</label>
      {description && <span className="text-zinc-600 italic text-[8px]">{description}</span>}
    </div>
    <input 
      type={type}
      step={step}
      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2.5 rounded text-zinc-100 focus:border-green-500/50 focus:bg-zinc-800/50 outline-none transition-all placeholder:text-zinc-700"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const Toggle = ({ label, checked, onChange }: any) => (
  <label className="flex items-center gap-2 cursor-pointer group">
    <div 
      onClick={() => onChange(!checked)}
      className={`relative w-8 h-4 rounded-full transition-colors ${checked ? 'bg-green-600' : 'bg-zinc-800'}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
    <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors uppercase text-[9px] font-bold">{label}</span>
  </label>
);

import { useState as useLocalState } from 'react';
import { RequestLogEntry } from '../context/RequestLogContext';

const NetworkTab = ({ log, onClear }: { log: RequestLogEntry[]; onClear: () => void }) => {
  const [selected, setSelected] = useLocalState<string | null>(log[0]?.id ?? null);
  const entry = log.find(e => e.id === selected) ?? log[0] ?? null;

  return (
    <div className="pb-20 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <SectionHeader icon={<Wifi size={14}/>} title="Network Log" />
        {log.length > 0 && (
          <button
            onClick={onClear}
            className="text-[8px] uppercase font-bold tracking-wider text-zinc-600 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {log.length === 0 ? (
        <p className="text-zinc-600 text-[9px]">No requests yet. Perform a search to see traffic.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Request list */}
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {log.map((e, i) => (
              <button
                key={e.id}
                onClick={() => setSelected(e.id)}
                className={`w-full text-left px-3 py-2 rounded flex items-center gap-3 transition-colors ${selected === e.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <span className="text-[7px] text-zinc-600 shrink-0 w-5">#{log.length - i}</span>
                <span className={`text-[8px] font-bold uppercase w-6 shrink-0 ${e.error ? 'text-red-400' : e.status && e.status >= 400 ? 'text-orange-400' : 'text-green-400'}`}>
                  {e.status ?? '…'}
                </span>
                <span className="text-[8px] font-bold text-zinc-400 w-8 shrink-0">{e.method}</span>
                <span className="text-[8px] text-zinc-300 truncate flex-1">{e.url}</span>
                {e.durationMs != null && (
                  <span className="text-[8px] text-zinc-600 shrink-0">{e.durationMs}ms</span>
                )}
                <span className="text-[7px] text-zinc-600 shrink-0">{e.timestamp.toLocaleTimeString()}</span>
              </button>
            ))}
          </div>

          {/* Detail pane */}
          {entry && (
            <div className="border border-white/5 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-black/30 text-[8px] text-zinc-500 font-mono border-b border-white/5">
                <span className="text-zinc-300 font-bold">{entry.method}</span>
                {' '}{entry.url}
                {entry.status != null && (
                  <span className={`ml-3 font-bold ${entry.status >= 400 ? 'text-orange-400' : 'text-green-400'}`}>
                    {entry.status} {entry.statusText}
                  </span>
                )}
                {entry.durationMs != null && <span className="ml-3 text-zinc-600">{entry.durationMs}ms</span>}
              </div>
              <div className="flex flex-col">
                {(['request', 'response', 'headers'] as const).map(pane => (
                  <DetailPane key={pane} label={pane} entry={entry} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DetailPane = ({ label, entry }: { label: 'request' | 'response' | 'headers'; entry: RequestLogEntry }) => {
  const [open, setOpen] = useLocalState(label !== 'headers');
  const content = label === 'request' ? entry.requestBody
    : label === 'headers' ? (Object.keys(entry.responseHeaders).length > 0 ? entry.responseHeaders : null)
    : (entry.error ?? entry.responseBody);
  const isEmpty = content == null;

  return (
    <div className="border-t border-white/5 first:border-t-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-[8px] uppercase font-bold tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors bg-black/20"
      >
        {label === 'request' ? 'Request Body' : label === 'headers' ? 'Response Headers' : 'Response Body'}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="p-3 overflow-x-auto max-h-72 custom-scrollbar">
          {isEmpty ? (
            <span className="text-zinc-700 text-[8px]">—</span>
          ) : (
            <pre className={`text-[8px] leading-relaxed whitespace-pre-wrap break-all ${label === 'response' && entry.error ? 'text-red-400' : 'text-green-400/80'}`}>
              {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
