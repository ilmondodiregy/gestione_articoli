import React, { useState } from 'react';
import { InventoryItem, MovementType } from '../types';
import { Plus, Search, Edit2, Trash2, Image as ImageIcon, Sparkles, TrendingDown, TrendingUp, AlertCircle, X, Package, Loader2 } from 'lucide-react';
import { generateDescription, analyzeProductImage } from '../services/geminiService';

interface InventoryProps {
  items: InventoryItem[];
  onSave: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onAdjustStock: (id: string, qty: number, type: MovementType) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ items, onSave, onDelete, onAdjustStock }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({ 
      code: '', name: '', description: '', price: 0, cost: 0, 
      quantity: 0, minStock: 5, category: 'Generale', updatedAt: Date.now() 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) return;

    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : crypto.randomUUID(),
      updatedAt: Date.now(),
      ...formData as any
    };
    
    onSave(newItem);
    setIsModalOpen(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageData: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageAnalysis = async () => {
    if (!formData.imageData) return;
    setIsAnalyzingImage(true);
    try {
        const result = await analyzeProductImage(formData.imageData);
        setFormData(prev => ({
            ...prev,
            name: result.name || prev.name,
            category: result.category || prev.category,
            description: result.description || prev.description
        }));
    } catch (e) {
        console.error(e);
    } finally {
        setIsAnalyzingImage(false);
    }
  };

  const handleAiGenerate = async () => {
    if(formData.name && formData.category) {
        setIsGenerating(true);
        const desc = await generateDescription(formData.name, formData.category);
        setFormData(prev => ({...prev, description: desc }));
        setIsGenerating(false);
    }
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* Header & Toolbar */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Magazzino</h2>
            <p className="text-slate-500">Gestisci articoli, giacenze e anagrafica.</p>
          </div>
          <div className="flex gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Cerca articolo..." 
                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-full md:w-64 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={handleAddNew}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 whitespace-nowrap"
            >
                <Plus className="w-5 h-5" />
                <span className="hidden md:inline">Nuovo</span>
            </button>
          </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredItems.map(item => {
            const isLowStock = item.quantity <= item.minStock;
            return (
                <div key={item.id} className={`group bg-white rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden hover:shadow-xl hover:-translate-y-1 ${isLowStock ? 'border-rose-200 shadow-sm' : 'border-slate-200 shadow-sm'}`}>
                    {/* Card Header Image */}
                    <div className="h-48 bg-slate-100 relative overflow-hidden">
                        {item.imageData ? (
                            <img src={item.imageData} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">
                                <ImageIcon className="w-10 h-10 mb-2" />
                                <span className="text-xs">No Immagine</span>
                            </div>
                        )}
                        <div className="absolute top-3 left-3">
                            <span className="bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 shadow-sm">
                                {item.category}
                            </span>
                        </div>
                         <div className="absolute top-3 right-3 flex gap-2">
                             <button onClick={() => handleEdit(item)} className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:text-indigo-600 shadow-sm transition-colors">
                                 <Edit2 className="w-4 h-4" />
                             </button>
                             <button onClick={() => { if(confirm('Eliminare articolo?')) onDelete(item.id); }} className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:text-rose-600 shadow-sm transition-colors">
                                 <Trash2 className="w-4 h-4" />
                             </button>
                        </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col">
                        <div className="mb-auto">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-slate-800 text-lg leading-tight truncate pr-2" title={item.name}>{item.name}</h3>
                            </div>
                            <p className="text-xs text-slate-500 font-mono mb-3">{item.code}</p>
                            <p className="text-sm text-slate-600 line-clamp-2 mb-4 h-10">{item.description || "Nessuna descrizione."}</p>
                        </div>

                        <div className="flex items-end justify-between mt-4 pt-4 border-t border-slate-100">
                             <div>
                                <p className="text-xs text-slate-400 font-medium">Prezzo Unit.</p>
                                <p className="text-lg font-bold text-indigo-600">€ {item.price.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 font-medium mb-1">Giacenza</p>
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                                    isLowStock ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                }`}>
                                    {isLowStock && <AlertCircle className="w-3 h-3" />}
                                    <span className="font-bold text-sm">{item.quantity}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions Footer */}
                    <div className="bg-slate-50 p-3 grid grid-cols-2 gap-3 border-t border-slate-100">
                         <button 
                            onClick={() => onAdjustStock(item.id, 1, MovementType.OUT)}
                            className="flex items-center justify-center gap-2 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all font-medium text-sm"
                         >
                             <TrendingDown className="w-4 h-4" /> Scarico
                         </button>
                         <button 
                            onClick={() => onAdjustStock(item.id, 1, MovementType.IN)}
                            className="flex items-center justify-center gap-2 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all font-medium text-sm"
                         >
                             <TrendingUp className="w-4 h-4" /> Carico
                         </button>
                    </div>
                </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Package className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Nessun articolo trovato</p>
                <p className="text-sm">Prova a cambiare i filtri o aggiungi un nuovo articolo.</p>
            </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                  <h2 className="text-xl font-bold text-slate-800">{editingItem ? 'Modifica Articolo' : 'Nuovo Articolo'}</h2>
                  <p className="text-sm text-slate-500">Compila i dettagli del prodotto</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              
              <div className="flex gap-6 items-start">
                  <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Codice Univoco *</label>
                            <input required type="text" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="es. ART-001" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Categoria</label>
                            <input type="text" list="categories" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="Seleziona..." />
                            <datalist id="categories">
                                <option value="Elettronica" />
                                <option value="Abbigliamento" />
                                <option value="Casa" />
                                <option value="Accessori" />
                            </datalist>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Nome Prodotto *</label>
                            <input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium" />
                      </div>
                  </div>
                  
                  {/* Image Upload Compact */}
                  <div className="w-32 flex-shrink-0 flex flex-col items-center">
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5 w-full text-left">Foto</label>
                      <div className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden relative group hover:border-indigo-400 transition-colors cursor-pointer">
                           {formData.imageData ? (
                                <img src={formData.imageData} className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                    <ImageIcon className="w-8 h-8 mb-1" />
                                    <span className="text-[10px] uppercase font-bold">Carica</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                      
                      {formData.imageData && (
                          <button 
                            type="button"
                            onClick={handleImageAnalysis}
                            disabled={isAnalyzingImage}
                            className="mt-2 text-xs w-full flex items-center justify-center gap-1 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                          >
                              {isAnalyzingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              Auto-Fill
                          </button>
                      )}
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Prezzo Vendita (€)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                        <input type="number" step="0.01" value={formData.price || 0} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full border border-slate-200 pl-8 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono" />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Costo Acquisto (€)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                        <input type="number" step="0.01" value={formData.cost || 0} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})} className="w-full border border-slate-200 pl-8 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono" />
                    </div>
                </div>
              </div>

               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Quantità Attuale</label>
                    <input type="number" value={formData.quantity || 0} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white font-bold text-slate-800" />
                </div>
                 <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Scorta Minima Alert</label>
                    <input type="number" value={formData.minStock || 0} onChange={e => setFormData({...formData, minStock: parseInt(e.target.value)})} className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700">Descrizione</label>
                    <button type="button" onClick={handleAiGenerate} disabled={isGenerating} className="text-xs font-medium text-purple-600 flex items-center gap-1.5 hover:bg-purple-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50">
                        <Sparkles className="w-3.5 h-3.5" />
                        {isGenerating ? 'Sto scrivendo...' : 'Genera con AI'}
                    </button>
                </div>
                <textarea rows={3} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm leading-relaxed" placeholder="Descrizione dettagliata dell'articolo..." />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Annulla</button>
                <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-lg shadow-indigo-600/20 transition-all active:scale-95">Salva Articolo</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};