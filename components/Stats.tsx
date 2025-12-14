import React, { useMemo, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { InventoryItem, StockMovement, MovementType } from '../types';
import { Calendar, TrendingUp, Activity, Sparkles, AlertCircle, ChevronLeft, ChevronRight, Search, Filter, X } from 'lucide-react';
import { analyzeInventory } from '../services/geminiService';

interface AnalyticsProps {
  items: InventoryItem[];
  movements: StockMovement[];
}

export const Stats: React.FC<AnalyticsProps> = ({ items, movements }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Extract unique categories for filter dropdown
  const categories = useMemo(() => {
      const cats = new Set(items.map(i => i.category).filter(Boolean));
      return Array.from(cats).sort();
  }, [items]);

  // --- Data Processing Engine ---
  const { chartData, matrixData, topItems, totalYearlyUnits, yearlyValue } = useMemo(() => {
    
    // 0. Pre-compute item map for fast category lookup
    const itemMap = new Map(items.map(i => [i.id, i]));

    // 1. Filter movements: Year + Type OUT + Search + Category
    const yearlyMovements = movements.filter(m => {
        const d = new Date(m.date);
        const isYearMatch = d.getFullYear() === selectedYear;
        const isTypeMatch = m.type === MovementType.OUT;
        
        if (!isYearMatch || !isTypeMatch) return false;

        // Search Filter
        if (searchTerm && !m.itemName.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }

        // Category Filter
        if (selectedCategory) {
            const item = itemMap.get(m.itemId);
            // Fallback: if item not found by ID, allow it (or stricter: return false)
            // Here we check category match if item exists
            if (item && item.category !== selectedCategory) return false;
        }

        return true;
    });

    // 2. Identify Top 10 Items (of the filtered result)
    const itemVolumes = new Map<string, number>();
    yearlyMovements.forEach(m => {
        itemVolumes.set(m.itemName, (itemVolumes.get(m.itemName) || 0) + m.quantity);
    });
    
    // Sort and take top 10 names
    const topItemsList = Array.from(itemVolumes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10) // Changed from 5 to 10
        .map(e => e[0]);

    // 3. Prepare Monthly Data Structure (The Matrix & Chart)
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    
    // Initialize chart data structure
    const monthlyData = months.map((month, index) => {
        const entry: any = { name: month, index };
        topItemsList.forEach(item => entry[item] = 0);
        return entry;
    });

    // Initialize full matrix (all items that moved in the filtered set)
    const matrixMap = new Map<string, number[]>(); // itemName -> [janQty, febQty, ...]

    yearlyMovements.forEach(m => {
        const monthIndex = new Date(m.date).getMonth(); // 0-11
        
        // Populate Chart Data (only for Top 10)
        if (topItemsList.includes(m.itemName)) {
            monthlyData[monthIndex][m.itemName] += m.quantity;
        }

        // Populate Matrix Data (all filtered items)
        if (!matrixMap.has(m.itemName)) {
            matrixMap.set(m.itemName, new Array(12).fill(0));
        }
        const arr = matrixMap.get(m.itemName)!;
        arr[monthIndex] += m.quantity;
    });

    // Convert matrix map to array for rendering
    const matrixArray = Array.from(matrixMap.entries())
        .map(([name, data]) => ({ name, data, total: data.reduce((a, b) => a + b, 0) }))
        .sort((a, b) => b.total - a.total);

    // KPI Calcs
    const totalUnits = yearlyMovements.reduce((acc, m) => acc + m.quantity, 0);
    
    // Approximate value
    let val = 0;
    yearlyMovements.forEach(m => {
        const item = items.find(i => i.name === m.itemName);
        if(item) val += (item.price * m.quantity);
    });

    return { 
        chartData: monthlyData, 
        matrixData: matrixArray, 
        topItems: topItemsList,
        totalYearlyUnits: totalUnits,
        yearlyValue: val
    };
  }, [items, movements, selectedYear, searchTerm, selectedCategory]);

  // --- Extended Palette for Top 10 ---
  const colors = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#ef4444', // Red
    '#84cc16', // Lime
    '#3b82f6', // Blue
    '#d946ef', // Fuchsia
  ];

  const runAiAnalysis = async () => {
      setIsAnalyzing(true);
      const filterContext = selectedCategory ? `Categoria: ${selectedCategory}` : (searchTerm ? `Filtro: ${searchTerm}` : 'Generale');
      
      const seasonalitySummary = topItems.map((item, idx) => {
          let peakMonth = '';
          let maxQ = 0;
          chartData.forEach(d => {
              if (d[item] > maxQ) {
                  maxQ = d[item];
                  peakMonth = d.name;
              }
          });
          return `- ${item}: Picco a ${peakMonth} (${maxQ} pz)`;
      }).join('\n');

      const prompt = `
        Analizza i dati di vendita dell'anno ${selectedYear} (${filterContext}) per pianificare la produzione.
        
        Top Prodotti (fino a 10) e Stagionalità rilevata:
        ${seasonalitySummary || "Nessun dato rilevante trovato con i filtri correnti."}

        Totale volume annuo (selezione): ${totalYearlyUnits} pezzi.

        Il tuo compito:
        Agisci come un Supply Chain Manager Senior. 
        Analizza questi picchi e suggerisci quando iniziare ad accumulare scorte per i prodotti in esame.
        Se i dati sono scarsi, dai consigli generali su come gestire la categoria in questione.
        Sii sintetico, strategico e usa elenchi puntati.
      `;
      
      const res = await analyzeInventory([], [], prompt);
      setAiAnalysis(res);
      setIsAnalyzing(false);
  }

  const clearFilters = () => {
      setSearchTerm('');
      setSelectedCategory('');
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      
      {/* Header Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Analisi e Pianificazione</h2>
            <p className="text-slate-500">Trend stagionali per l'anno {selectedYear}.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            
            {/* Filters Group */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
                <div className="relative flex-1 sm:w-40">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input 
                        type="text" 
                        placeholder="Filtra nome..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-sm bg-transparent border-none focus:ring-0 placeholder:text-slate-400"
                    />
                </div>
                <div className="h-4 w-px bg-slate-200"></div>
                <div className="relative flex-1 sm:w-32">
                     <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full pl-2 pr-6 py-1.5 text-sm bg-transparent border-none focus:ring-0 text-slate-600 cursor-pointer appearance-none"
                     >
                         <option value="">Tutte le cat.</option>
                         {categories.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                     <Filter className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3 pointer-events-none" />
                </div>
                {(searchTerm || selectedCategory) && (
                    <button onClick={clearFilters} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-4 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
                <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-base text-slate-800 w-12 text-center tabular-nums">{selectedYear}</span>
                <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>

      {/* Compact Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Volumi {selectedYear}</p>
              <div className="flex items-baseline gap-2 mt-1">
                 <span className="text-2xl font-bold text-slate-800">{totalYearlyUnits}</span>
                 <span className="text-xs text-slate-500">pz usciti</span>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fatturato Stimato</p>
              <div className="flex items-baseline gap-2 mt-1">
                 <span className="text-2xl font-bold text-indigo-600">€ {yearlyValue.toLocaleString('it-IT', {notation: "compact"})}</span>
              </div>
          </div>
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-2 flex items-center justify-between">
              <div>
                 <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Top Performer {(searchTerm || selectedCategory) && '(Filtrato)'}</p>
                 <p className="text-base font-bold text-slate-800 truncate max-w-[200px]">{topItems[0] || "Nessun dato"}</p>
              </div>
              <div className="h-8 w-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                  <TrendingUp className="w-5 h-5" />
              </div>
          </div>
      </div>

      {/* MAIN CHART: Comparative Trends */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
            <div>
                <h3 className="text-lg font-bold text-slate-800">Trend di Vendita Mensile</h3>
                <p className="text-sm text-slate-500">
                    {searchTerm || selectedCategory 
                        ? `Analisi filtrata per "${searchTerm || selectedCategory}"` 
                        : "Confronto stagionalità dei Top 10 articoli."}
                </p>
            </div>
          </div>
          
          <div className="h-[450px] w-full">
            {topItems.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                        formatter={(value: number, name: string) => [value, name]}
                        sorter={(a: any, b: any) => b.value - a.value} // Sort tooltip by value
                    />
                    <Legend 
                        wrapperStyle={{ paddingTop: '20px' }} 
                        iconType="circle" 
                        formatter={(value) => <span className="text-xs font-medium text-slate-600 ml-1 mr-3">{value}</span>}
                    />
                    {topItems.map((item, index) => (
                        <Line 
                            key={item} 
                            type="monotone" 
                            dataKey={item} 
                            stroke={colors[index % colors.length]} 
                            strokeWidth={2.5}
                            dot={{ r: 3, strokeWidth: 1, fill: '#fff' }}
                            activeDot={{ r: 6 }}
                            connectNulls
                        />
                    ))}
                </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Activity className="w-12 h-12 mb-2 opacity-20" />
                    <p>Dati insufficienti per i filtri selezionati.</p>
                </div>
            )}
          </div>
      </div>

      {/* AI Strategy Card - MOVED HERE */}
      <div className="bg-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg backdrop-blur-sm border border-indigo-500/30">
                        <Sparkles className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white">AI Production Advisor</h3>
                        <p className="text-slate-400 text-sm">Analisi strategica basata sui dati {selectedYear} {(searchTerm || selectedCategory) && '(Filtrati)'}</p>
                    </div>
                </div>
                <button 
                    onClick={runAiAnalysis}
                    disabled={isAnalyzing || matrixData.length === 0}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-900/50 flex items-center gap-2"
                >
                    {isAnalyzing ? <Activity className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isAnalyzing ? 'Analizzo...' : 'Genera Strategia'}
                </button>
            </div>
            
            {aiAnalysis ? (
                 <div className="bg-slate-800/50 rounded-xl p-5 text-sm leading-relaxed whitespace-pre-line border border-slate-700 text-slate-300">
                    {aiAnalysis}
                 </div>
            ) : (
                <div className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 text-slate-400 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>Genera un report per ottenere consigli su quando riordinare i prodotti in base ai picchi stagionali rilevati nel grafico.</span>
                </div>
            )}
          </div>
      </div>

      {/* MATRIX VIEW: Production Planning Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <Calendar className="w-5 h-5 text-indigo-500" />
                 Matrice di Pianificazione
             </h3>
             <p className="text-sm text-slate-500">Analisi dettaglio uscite mese per mese.</p>
          </div>
          
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                          <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Articolo</th>
                          <th className="px-4 py-3 text-right text-indigo-600 font-bold bg-indigo-50/50">TOT</th>
                          {chartData.map(m => (
                              <th key={m.name} className="px-2 py-3 text-center w-12">{m.name}</th>
                          ))}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {matrixData.map((row) => (
                          <tr key={row.name} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-4 py-3 font-medium text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate max-w-[200px]" title={row.name}>
                                  {row.name}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-indigo-600 bg-indigo-50/30">
                                  {row.total}
                              </td>
                              {row.data.map((qty, idx) => (
                                  <td key={idx} className="px-2 py-3 text-center">
                                      {qty > 0 ? (
                                          <span className={`
                                              inline-block w-full py-1 rounded-md font-medium text-xs
                                              ${qty >= (row.total / 12) * 1.5 ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600'}
                                              ${qty === 0 ? 'text-slate-300' : ''}
                                          `}>
                                              {qty}
                                          </span>
                                      ) : (
                                          <span className="text-slate-200">-</span>
                                      )}
                                  </td>
                              ))}
                          </tr>
                      ))}
                      {matrixData.length === 0 && (
                          <tr>
                              <td colSpan={14} className="px-6 py-12 text-center text-slate-400">
                                  Nessun movimento trovato per i filtri selezionati nell'anno {selectedYear}.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
};