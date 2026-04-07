
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { COUNTRIES, REGIONS } from './constants';
import { Region, CountryMacroData, CountryConfig } from './types';
import { fetchMacroData } from './services/geminiService';
import CountryCard from './components/CountryCard';

const STORAGE_KEY = 'macro_hub_cache_v1';

const App: React.FC = () => {
  const [activeRegion, setActiveRegion] = useState<Region>(Region.NorthAmerica);
  const [isModalMaximized, setIsModalMaximized] = useState(false);
  
  // Load initial cache from localStorage
  const [dataCache, setDataCache] = useState<Record<string, CountryMacroData>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });
  
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'predictive' | 'realtime' | 'confirming' | 'digital'>('predictive');
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  
  // A lock to prevent multiple simultaneous requests across the app
  const isRequestingRef = useRef(false);

  // Persistence effect
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataCache));
  }, [dataCache]);

  const filteredCountries = useMemo(() => 
    COUNTRIES.filter(c => c.region === activeRegion), 
  [activeRegion]);

  const handleFetch = useCallback(async (country: CountryConfig, retryCount = 0) => {
    if (dataCache[country.id] || loadingIds.has(country.id)) return;
    
    // Prevent multiple concurrent requests to protect quota
    if (isRequestingRef.current && retryCount === 0) {
      setError("Synchronizer Busy: Another request is currently in progress.");
      return;
    }

    isRequestingRef.current = true;
    setLoadingIds(prev => new Set(prev).add(country.id));
    setError(null);

    try {
      const data = await fetchMacroData(country.name);
      setDataCache(prev => ({ ...prev, [country.id]: data }));
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("QUOTA_EXHAUSTED")) {
        if (retryCount < 1) {
          setError(`Rate limit hit for ${country.name}. Auto-retrying in 10s...`);
          await new Promise(r => setTimeout(r, 10000));
          isRequestingRef.current = false;
          setLoadingIds(prev => {
            const next = new Set(prev);
            next.delete(country.id);
            return next;
          });
          return handleFetch(country, retryCount + 1);
        }
        setError("API Quota Exhausted: The Free Tier limit has been reached. Please wait ~60s.");
      } else {
        setError(`Sync error for ${country.name}. Try again later.`);
      }
    } finally {
      isRequestingRef.current = false;
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(country.id);
        return next;
      });
    }
  }, [dataCache, loadingIds]);

  const syncAllInRegion = async () => {
    const toFetch = filteredCountries.filter(c => !dataCache[c.id] && !loadingIds.has(c.id));
    if (toFetch.length === 0) return;
    
    setError(null);
    for (const country of toFetch) {
      while (isRequestingRef.current) {
        await new Promise(r => setTimeout(r, 1000));
      }
      await handleFetch(country);
      if (toFetch.indexOf(country) < toFetch.length - 1) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  };

  const clearCache = () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      // Auto-reset after 3 seconds if not clicked again
      setTimeout(() => setIsConfirmingClear(false), 3000);
      return;
    }
    setDataCache({});
    localStorage.removeItem(STORAGE_KEY);
    setIsConfirmingClear(false);
  };

  const selectedData = selectedCountryId ? dataCache[selectedCountryId] : null;

  const handleCloseModal = () => {
    setSelectedCountryId(null);
    setIsModalMaximized(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.1)] z-20">
        <div className="p-10">
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-white italic shadow-xl shadow-indigo-600/30 group-hover:rotate-12 transition-transform">M</div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">MacroHub</h1>
              <p className="text-[8px] text-indigo-400 font-mono tracking-[0.2em] uppercase font-bold mt-1">Intelligence Layer v4.4</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-2 overflow-y-auto no-scrollbar">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 px-4 flex items-center">
            <span className="w-8 h-[1px] bg-slate-800 mr-3"></span>
            Markets
          </div>
          {REGIONS.map(region => (
            <button
              key={region}
              onClick={() => setActiveRegion(region)}
              className={`w-full text-left px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-between group ${
                activeRegion === region 
                ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-900/50 scale-[1.03] translate-x-1' 
                : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>{region}</span>
              <div className={`w-2 h-2 rounded-full transition-all ${activeRegion === region ? 'bg-white animate-pulse' : 'bg-slate-700 opacity-0 group-hover:opacity-100'}`}></div>
            </button>
          ))}
        </nav>
        
        <div className="p-8 space-y-4">
          <button 
            onClick={clearCache}
            className={`w-full py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
              isConfirmingClear 
              ? 'border-rose-500 bg-rose-500/10 text-rose-500 animate-pulse' 
              : 'border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-rose-400'
            }`}
          >
            {isConfirmingClear ? 'Confirm Purge?' : 'Purge Local Cache'}
          </button>
          <div className="bg-slate-800/40 rounded-3xl p-5 border border-slate-700/30">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">Rate Limit Mitigation</p>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Using Flash model for better reliability. Sequentially syncing with 5s buffers.</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 md:p-16 overflow-auto relative">
        <header className="mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-10 border-b border-slate-200/60 pb-12">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white"></div>
                <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white"></div>
                <div className="w-6 h-6 rounded-full bg-rose-500 border-2 border-white"></div>
              </div>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Market Dynamics / {activeRegion}</span>
            </div>
            <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-none mb-6">
              Global <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Analysis</span>
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 mt-4">
               <p className="text-slate-500 text-lg font-medium leading-relaxed opacity-70">
                Synchronizing predictive metrics with increased safety buffers.
              </p>
              <button 
                onClick={syncAllInRegion}
                disabled={isRequestingRef.current}
                className={`whitespace-nowrap px-6 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg ${isRequestingRef.current ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
              >
                {isRequestingRef.current ? 'Sync in Progress...' : 'Sync Region Domain'}
              </button>
            </div>
          </div>
          {error && (
            <div className="bg-white border-2 border-rose-100 p-6 rounded-[2.5rem] shadow-[0_20px_60px_rgba(244,63,94,0.2)] flex items-center space-x-5 animate-in slide-in-from-right-10">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-3xl">⚠️</div>
              <div className="max-w-xs">
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Quota / Rate Feedback</p>
                <p className="text-xs font-bold text-slate-700 leading-snug">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">✕</button>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-10">
          {filteredCountries.map(country => {
            const data = dataCache[country.id];
            const isLoading = loadingIds.has(country.id);

            if (isLoading) {
              return (
                <div key={country.id} className="h-[420px] rounded-[2.5rem] bg-white border border-slate-100 animate-pulse p-10 flex flex-col space-y-8 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="h-10 bg-slate-100 rounded-2xl w-2/3"></div>
                    <div className="w-4 h-4 bg-indigo-400 rounded-full animate-ping"></div>
                  </div>
                  <div className="flex-1 space-y-6">
                    <div className="h-32 bg-slate-50/50 rounded-3xl"></div>
                    <div className="h-12 bg-slate-50/50 rounded-2xl"></div>
                  </div>
                  <p className="text-[10px] font-black text-slate-300 uppercase text-center tracking-widest">Scanning {country.name} Data...</p>
                </div>
              );
            }

            if (!data) return (
               <button 
                key={country.id}
                onClick={() => handleFetch(country)}
                className="h-[420px] rounded-[2.5rem] bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-10 space-y-6 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all group overflow-hidden relative shadow-sm"
               >
                 <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-indigo-50/0 group-hover:to-indigo-50/30 transition-all"></div>
                 <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:rotate-[15deg] transition-all duration-500 shadow-xl shadow-slate-100 z-10">
                    <svg className="w-8 h-8 text-slate-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                 </div>
                 <div className="text-center z-10">
                   <span className="text-slate-900 text-xl font-black uppercase tracking-tighter block mb-2">{country.name}</span>
                   <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] group-hover:text-indigo-600 transition-colors">Request Synthesis</p>
                 </div>
               </button>
            );

            return (
              <CountryCard 
                key={country.id} 
                countryName={country.name}
                data={data} 
                onClick={() => setSelectedCountryId(country.id)}
              />
            );
          })}
        </div>
      </main>

      {/* Deep Dive Modal */}
      {selectedCountryId && selectedData && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-50 flex items-center justify-center p-0 lg:p-12 animate-in fade-in duration-300">
          <div className={`bg-white transition-all duration-500 ease-in-out flex flex-col shadow-[0_0_120px_rgba(0,0,0,0.5)] border border-white/20 ${isModalMaximized ? 'w-full h-full rounded-none' : 'rounded-[3.5rem] w-full max-w-[90rem] h-full overflow-hidden'}`}>
            {/* Modal Header */}
            <div className="px-12 py-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/30 shrink-0">
              <div className="flex items-center space-x-10">
                <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-4xl font-black text-white shadow-[0_20px_40px_rgba(79,70,229,0.3)] rotate-[-2deg] hover:rotate-0 transition-transform">
                  {selectedData.countryName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-4 mb-1">
                    <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black rounded-full uppercase tracking-widest">{selectedData.currency}</span>
                    <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest flex items-center">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div> Market Insight Report
                    </span>
                  </div>
                  <h2 className="text-5xl font-black text-slate-900 leading-none tracking-tighter">{selectedData.countryName}</h2>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right hidden sm:block mr-6">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated GDP</p>
                  <p className="text-xl font-black text-indigo-600">{selectedData.currentGDP}</p>
                </div>
                
                {/* Maximize Toggle */}
                <button 
                  onClick={() => setIsModalMaximized(!isModalMaximized)}
                  className="bg-white border-2 border-slate-100 p-4 rounded-2xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-md group"
                  title={isModalMaximized ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isModalMaximized ? (
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 9L4 4m0 0l4-4m-4 4h10m5 5l5 5m0 0l-5 5m5-5H10" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                  )}
                </button>

                <button 
                  onClick={handleCloseModal}
                  className="bg-white border-2 border-slate-100 p-4 rounded-2xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-md group"
                >
                  <svg className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Modal Navigation */}
              <div className="w-72 border-r border-slate-100 flex flex-col bg-slate-50/50 p-6 space-y-2 overflow-y-auto no-scrollbar shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-4">Indicator Domains</p>
                {[
                  { id: 'predictive', label: 'Leading', desc: 'Predictive signals', color: 'bg-rose-500' },
                  { id: 'realtime', label: 'Coincident', desc: 'Real-time performance', color: 'bg-blue-500' },
                  { id: 'confirming', label: 'Lagging', desc: 'Historical confirmation', color: 'bg-emerald-500' },
                  { id: 'digital', label: 'Digital', desc: 'Modern high-speed metrics', color: 'bg-indigo-600' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full text-left px-5 py-4 rounded-[1.5rem] transition-all group flex items-start space-x-3 ${
                      activeTab === tab.id 
                      ? 'bg-white shadow-xl shadow-slate-200 border-2 border-indigo-100 scale-105 z-10' 
                      : 'hover:bg-white/60 hover:translate-x-1'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${tab.color} ${activeTab === tab.id ? 'animate-pulse' : 'opacity-40'}`}></div>
                    <div>
                      <p className={`text-[12px] font-black uppercase tracking-widest ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-400'}`}>{tab.label}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">{tab.desc}</p>
                    </div>
                  </button>
                ))}

                <div className="mt-8 space-y-4 pt-8 border-t border-slate-200">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center px-4 mb-2">
                    Sources
                  </h4>
                  <div className="space-y-2">
                    {selectedData.sources.map((source, i) => (
                      <a 
                        key={i} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex flex-col p-3 rounded-xl bg-white border border-slate-100 hover:border-indigo-200 transition-all group"
                      >
                        <span className="text-[9px] font-black text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{source.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-auto p-12 space-y-12 bg-white no-scrollbar">
                <div className="space-y-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Indicator Trend Matrix</h3>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1.5">{activeTab} analysis (2021-2026)</p>
                    </div>
                    <div className="flex items-center space-x-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div> Expanding</div>
                      <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-rose-500 mr-2"></div> Contracting</div>
                    </div>
                  </div>

                  <div className="rounded-[2.5rem] border border-slate-100 shadow-[0_30px_80px_rgba(0,0,0,0.05)] overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                          <th className="px-10 py-6">Year</th>
                          {activeTab === 'predictive' && (
                            <>
                              <th className="px-6 py-6">PMI Index</th>
                              <th className="px-6 py-6">Cons. Confidence</th>
                              <th className="px-6 py-6">Equity Mkt (%)</th>
                              <th className="px-6 py-6">Yield Config</th>
                            </>
                          )}
                          {activeTab === 'realtime' && (
                            <>
                              <th className="px-6 py-6">GDP Dev (%)</th>
                              <th className="px-6 py-6">Retail Rev (%)</th>
                              <th className="px-6 py-6">Digital Flow (%)</th>
                              <th className="px-6 py-6">Industrial O/P</th>
                            </>
                          )}
                          {activeTab === 'confirming' && (
                            <>
                              <th className="px-6 py-6">CPI (Infl) %</th>
                              <th className="px-6 py-6">PPI (Whol) %</th>
                              <th className="px-6 py-6">Unemp. Rate</th>
                              <th className="px-6 py-6">Interest rate</th>
                            </>
                          )}
                          {activeTab === 'digital' && (
                            <>
                              <th className="px-6 py-6">AI Productivity</th>
                              <th className="px-6 py-6">E-comm Penet.</th>
                              <th className="px-6 py-6">Cyber Budget</th>
                              <th className="px-6 py-6">Gig Economy</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selectedData.historicalData.map(row => (
                          <tr key={row.year} className="hover:bg-indigo-50/10 transition-colors group">
                            <td className="px-10 py-5 font-black text-slate-900 text-lg bg-slate-50/10">{row.year}</td>
                            {activeTab === 'predictive' && (
                              <>
                                <td className={`px-6 py-5 font-black text-xl ${row.pmi > 50 ? 'text-emerald-600' : 'text-rose-500'}`}>{row.pmi}</td>
                                <td className="px-6 py-5 font-black text-xl text-slate-800">{row.cci}</td>
                                <td className={`px-6 py-5 font-black text-xl ${row.stockMarketPerf > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{row.stockMarketPerf > 0 ? '+' : ''}{row.stockMarketPerf}%</td>
                                <td className="px-6 py-5">
                                  <span className="px-3 py-1.5 rounded-full bg-slate-100 text-[9px] font-black uppercase text-indigo-700 tracking-widest">{row.yieldCurve}</span>
                                </td>
                              </>
                            )}
                            {activeTab === 'realtime' && (
                              <>
                                <td className="px-6 py-5 font-black text-xl text-slate-900">{row.gdpGrowth}%</td>
                                <td className="px-6 py-5 font-black text-xl text-indigo-600">{row.retailSales > 0 ? '+' : ''}{row.retailSales}%</td>
                                <td className="px-6 py-5 font-black text-xl text-indigo-600">+{row.digitalTransactionVol}%</td>
                                <td className="px-6 py-5 font-black text-xl text-slate-400">{row.industrialProduction}%</td>
                              </>
                            )}
                            {activeTab === 'confirming' && (
                              <>
                                <td className="px-6 py-5 font-black text-xl text-rose-500">{row.cpi}%</td>
                                <td className="px-6 py-5 font-black text-xl text-slate-700">{row.ppi}%</td>
                                <td className="px-6 py-5 font-black text-xl text-rose-600">{row.unemploymentRate}%</td>
                                <td className="px-6 py-5 font-black text-xl text-indigo-700">{row.interestRate}%</td>
                              </>
                            )}
                            {activeTab === 'digital' && (
                              <>
                                <td className="px-6 py-5">
                                  <div className="flex items-center space-x-3">
                                    <span className="font-black text-xl text-indigo-600">{row.aiProductivityIndex}</span>
                                    <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${row.aiProductivityIndex}%` }}></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-5 font-black text-xl text-slate-800">{row.ecommercePenetration}%</td>
                                <td className="px-6 py-5 font-black text-xl text-slate-800">+{row.cyberResilienceSpending}%</td>
                                <td className="px-6 py-5 font-black text-xl text-slate-800">{row.gigEconomyPart}%</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-12 border-t border-slate-100">
                   <h4 className="text-xl font-black text-slate-900 tracking-tighter mb-6">Citations & Grounding</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {selectedData.sources.map((source, i) => (
                       <a 
                         key={i} 
                         href={source.uri} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="group p-5 rounded-3xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/20 transition-all flex items-center space-x-4"
                       >
                         <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15l2 2 4-4" /></svg>
                         </div>
                         <p className="text-[11px] font-black text-slate-800 leading-snug group-hover:text-indigo-700 transition-colors uppercase tracking-tight line-clamp-2">{source.title}</p>
                       </a>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
