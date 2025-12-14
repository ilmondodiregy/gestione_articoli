import React, { useState, useMemo } from 'react';
import { StockMovement, MovementType } from '../types';
import { ArrowUpRight, ArrowDownLeft, Calendar, Search, Filter, X, FileSpreadsheet, FileText } from 'lucide-react';
import { exportService } from '../services/exportService';

interface MovementsHistoryProps {
  movements: StockMovement[];
}

export const MovementsHistory: React.FC<MovementsHistoryProps> = ({ movements }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter and Sort Logic
  const filteredMovements = useMemo(() => {
    return movements.filter(mov => {
      // Text Search
      const matchesText = mov.itemName.toLowerCase().includes(searchTerm.toLowerCase());

      // Date Range Logic
      let matchesDate = true;
      if (startDate) {
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        if (mov.date < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        if (mov.date > end) matchesDate = false;
      }

      return matchesText && matchesDate;
    }).sort((a, b) => b.date - a.date); // Always sort desc
  }, [movements, searchTerm, startDate, endDate]);

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = searchTerm || startDate || endDate;

  const handleExportExcel = () => {
    exportService.exportMovementsToExcel(filteredMovements);
  };

  const handleExportPdf = () => {
    const filterInfo = hasActiveFilters ? `Dal ${startDate || 'Inizio'} al ${endDate || 'Oggi'} - Ricerca: "${searchTerm}"` : 'Tutto lo storico';
    exportService.exportMovementsToPdf(filteredMovements, filterInfo);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Storico Movimenti</h2>
          <p className="text-slate-500">Registro completo di carichi e scarichi.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
                <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button 
                onClick={handleExportPdf}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
                <FileText className="w-4 h-4" /> PDF
            </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
            
            {/* Search Input */}
            <div className="flex-1 w-full md:w-auto">
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block ml-1">Cerca Articolo</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Nome..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    />
                </div>
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex-1 md:w-40">
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block ml-1">Da Data</label>
                    <div className="relative">
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-600"
                        />
                    </div>
                </div>
                <div className="pt-6 text-slate-300">-</div>
                <div className="flex-1 md:w-40">
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block ml-1">A Data</label>
                    <div className="relative">
                         <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-600"
                        />
                    </div>
                </div>
            </div>

            {/* Clear Button */}
            {hasActiveFilters && (
                <button 
                    onClick={clearFilters}
                    className="mb-[1px] px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <X className="w-4 h-4" />
                    <span className="hidden md:inline">Reset</span>
                </button>
            )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Data & Ora</th>
                <th className="px-6 py-4">Articolo</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-right">Quantità</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        {hasActiveFilters ? (
                            <div className="flex flex-col items-center gap-2">
                                <Filter className="w-8 h-8 opacity-20" />
                                <p>Nessun movimento trovato con questi filtri.</p>
                                <button onClick={clearFilters} className="text-indigo-600 hover:underline">Rimuovi filtri</button>
                            </div>
                        ) : (
                            "Nessun movimento registrato."
                        )}
                    </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-mono whitespace-nowrap">
                        {new Date(mov.date).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                        {mov.itemName}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            mov.type === MovementType.IN 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                            {mov.type === MovementType.IN 
                                ? <><ArrowUpRight className="w-3 h-3" /> CARICO</> 
                                : <><ArrowDownLeft className="w-3 h-3" /> SCARICO</>
                            }
                        </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold text-lg ${
                         mov.type === MovementType.IN ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                        {mov.type === MovementType.IN ? '+' : '-'}{mov.quantity}
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="text-center text-xs text-slate-400">
         Visualizzati {filteredMovements.length} su {movements.length} movimenti totali
      </div>
    </div>
  );
};