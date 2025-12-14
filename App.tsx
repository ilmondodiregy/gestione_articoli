import React, { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { SyncWizard } from './components/SyncWizard';
import { Stats } from './components/Stats';
import { MovementsHistory } from './components/MovementsHistory';
import { storage } from './services/storage';
import { InventoryItem, StockMovement, DriveConfig, MovementType } from './types';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [config, setConfig] = useState<DriveConfig>({ clientId: '', apiKey: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await storage.init();
      const [loadedItems, loadedMovements, loadedConfig] = await Promise.all([
        storage.getItems(),
        storage.getMovements(),
        storage.getConfig()
      ]);
      setItems(loadedItems);
      setMovements(loadedMovements);
      setConfig(loadedConfig);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleSaveItem = async (item: InventoryItem) => {
    await storage.saveItem(item);
    setItems(prev => {
        const idx = prev.findIndex(i => i.id === item.id);
        if (idx >= 0) {
            const newArr = [...prev];
            newArr[idx] = item;
            return newArr;
        }
        return [...prev, item];
    });
  };

  const handleDeleteItem = async (id: string) => {
    await storage.deleteItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleStockAdjustment = async (id: string, qty: number, type: MovementType) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newQty = type === MovementType.IN ? item.quantity + qty : item.quantity - qty;
    if (newQty < 0) {
        alert("Giacenza insufficiente!");
        return;
    }

    const updatedItem = { ...item, quantity: newQty, updatedAt: Date.now() };
    const movement: StockMovement = {
        id: crypto.randomUUID(),
        itemId: id,
        itemName: item.name,
        type,
        quantity: qty,
        date: Date.now()
    };

    await storage.saveItem(updatedItem);
    await storage.addMovement(movement);

    setItems(prev => prev.map(i => i.id === id ? updatedItem : i));
    setMovements(prev => [...prev, movement]);
  };

  const handleConfigSave = async (newConfig: DriveConfig) => {
    await storage.saveConfig(newConfig);
    setConfig(newConfig);
  };

  const handleBackup = async () => {
      const json = await storage.exportDatabase();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `magazzino_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const newConfig = { ...config, lastSync: Date.now() };
      handleConfigSave(newConfig);
  };

  const handleRestore = async (jsonContent: string) => {
      await storage.importDatabase(jsonContent);
      window.location.reload();
  };

  if (isLoading) {
    return (
        <div className="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium animate-pulse">Caricamento Magazzino Pro...</p>
        </div>
    );
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      
      {activeTab === 'dashboard' && (
        <Dashboard 
            items={items} 
            movements={movements} 
            onNavigateToInventory={() => setActiveTab('inventory')} 
        />
      )}

      {activeTab === 'inventory' && (
        <Inventory 
            items={items} 
            onSave={handleSaveItem} 
            onDelete={handleDeleteItem}
            onAdjustStock={handleStockAdjustment}
        />
      )}

      {activeTab === 'analytics' && (
        <Stats items={items} movements={movements} />
      )}

      {activeTab === 'movements' && (
        <MovementsHistory movements={movements} />
      )}

      {activeTab === 'settings' && (
        <SyncWizard 
            config={config} 
            onConfigSave={handleConfigSave}
            onBackup={handleBackup}
            onRestore={handleRestore}
        />
      )}

    </Layout>
  );
};

export default App;