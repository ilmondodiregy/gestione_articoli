import React, { useMemo } from 'react';
import { InventoryItem, StockMovement, MovementType } from '../types';
import { AlertTriangle, TrendingUp, TrendingDown, Package, DollarSign, ArrowRight, Activity } from 'lucide-react';
import { AiAssistant } from './AiAssistant';

interface DashboardProps {
  items: InventoryItem[];
  movements: StockMovement[];
  onNavigateToInventory: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ items, movements, onNavigateToInventory }) => {
  
  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalValue = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const lowStockItems = items.filter(i => i.quantity <= i.minStock);
    const totalStock = items.reduce((acc, item) => acc + item.quantity, 0);
    
    // Last 5 movements
    const recentMovements = [...movements].sort((a, b) => b.date - a.date).slice(0, 5);

    return { totalItems, totalValue, lowStockItems, totalStock, recentMovements };
  }, [items, movements]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Panoramica Operativa</h2>
        <p className="text-slate-500">Benvenuto nel tuo gestionale. Ecco la situazione attuale.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                    <DollarSign className="w-6 h-6" />
                </div>
            </div>
            <p className="text-sm font-medium text-slate-500">Valore Magazzino</p>
            <h3 className="text-2xl font-bold text-slate-800">€ {stats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                    <Package className="w-6 h-6" />
                </div>
            </div>
            <p className="text-sm font-medium text-slate-500">Totale Referenze</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.totalItems}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                    <Activity className="w-6 h-6" />
                </div>
            </div>
            <p className="text-sm font-medium text-slate-500">Pezzi Totali</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.totalStock}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-all ring-2 ring-transparent hover:ring-rose-100">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stats.lowStockItems.length > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                    <AlertTriangle className="w-6 h-6" />
                </div>
            </div>
            <p className="text-sm font-medium text-slate-500">Sotto Scorta</p>
            <h3 className={`text-2xl font-bold ${stats.lowStockItems.length > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {stats.lowStockItems.length} <span className="text-sm text-slate-400 font-normal">articoli</span>
            </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: AI & Recent */}
        <div className="lg:col-span-2 space-y-8">
            {/* AI Assistant Widget */}
            <AiAssistant items={items} movements={movements} />

            {/* Recent Activity Feed */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Ultimi Movimenti</h3>
                </div>
                <div className="p-0 overflow-auto">
                    {stats.recentMovements.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <p>Nessun movimento recente.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {stats.recentMovements.map(mov => (
                                <div key={mov.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        mov.type === MovementType.IN ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                    }`}>
                                        {mov.type === MovementType.IN ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{mov.itemName}</p>
                                        <p className="text-xs text-slate-500">{new Date(mov.date).toLocaleString('it-IT')}</p>
                                    </div>
                                    <div className={`text-sm font-bold ${
                                        mov.type === MovementType.IN ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                        {mov.type === MovementType.IN ? '+' : '-'}{mov.quantity}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Right Column: Low Stock */}
        <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 flex flex-col overflow-hidden h-full">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                        Sotto Scorta
                    </h3>
                    <button onClick={onNavigateToInventory} className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1">
                        Vedi <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-0 overflow-auto max-h-[600px]">
                    {stats.lowStockItems.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Tutto ok! Nessun articolo sotto scorta minima.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Articolo</th>
                                    <th className="px-4 py-3 text-right">Q.tà</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stats.lowStockItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-medium text-slate-800">
                                            {item.name}
                                            <span className="block text-xs text-slate-400">Min: {item.minStock}</span>
                                        </td>
                                        <td className="px-4 py-3 text-rose-600 font-bold text-right">{item.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};