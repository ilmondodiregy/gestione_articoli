import { InventoryItem, StockMovement, DriveConfig } from '../types';

const DB_NAME = 'MagazzinoProDB';
const DB_VERSION = 1;

class StorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject('Error opening DB');
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('movements')) {
          const movementStore = db.createObjectStore('movements', { keyPath: 'id' });
          movementStore.createIndex('itemId', 'itemId', { unique: false });
          movementStore.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains('config')) {
           db.createObjectStore('config', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };
    });
  }

  // --- Generic Helpers ---

  private getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) throw new Error('DB not initialized');
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  private getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Items ---

  async getItems(): Promise<InventoryItem[]> {
    await this.ensureInit();
    return this.getAll<InventoryItem>('items');
  }

  async saveItem(item: InventoryItem): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const store = this.getStore('items', 'readwrite');
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteItem(id: string): Promise<void> {
    await this.ensureInit();
     return new Promise((resolve, reject) => {
      const store = this.getStore('items', 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Movements ---

  async getMovements(): Promise<StockMovement[]> {
    await this.ensureInit();
    return this.getAll<StockMovement>('movements');
  }

  async addMovement(movement: StockMovement): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const store = this.getStore('movements', 'readwrite');
      const request = store.put(movement);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Config ---

  async getConfig(): Promise<DriveConfig> {
    await this.ensureInit();
    return new Promise((resolve) => {
      const store = this.getStore('config', 'readonly');
      const request = store.get('driveConfig');
      request.onsuccess = () => resolve(request.result ? request.result.value : { clientId: '', apiKey: '' });
      request.onerror = () => resolve({ clientId: '', apiKey: '' });
    });
  }

  async saveConfig(config: DriveConfig): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const store = this.getStore('config', 'readwrite');
      const request = store.put({ key: 'driveConfig', value: config });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Backup/Restore Helpers ---

  async exportDatabase(): Promise<string> {
    const items = await this.getItems();
    const movements = await this.getMovements();
    const config = await this.getConfig();
    return JSON.stringify({ items, movements, config, version: 1, exportedAt: Date.now() });
  }

  async importDatabase(jsonString: string): Promise<void> {
    await this.ensureInit();
    try {
      const data = JSON.parse(jsonString);
      if (!data.items || !data.movements) throw new Error("Invalid Backup File");

      // Clear existing data? Or Merge? For simplicity in restore: Overwrite/Merge logic.
      // We will loop and put to overwrite by ID.
      
      const tx = this.db!.transaction(['items', 'movements', 'config'], 'readwrite');
      
      const itemStore = tx.objectStore('items');
      const moveStore = tx.objectStore('movements');
      const configStore = tx.objectStore('config');

      data.items.forEach((item: any) => itemStore.put(item));
      data.movements.forEach((mov: any) => moveStore.put(mov));
      if (data.config) configStore.put({ key: 'driveConfig', value: data.config });

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  private async ensureInit() {
    if (!this.db) {
      await this.init();
    }
  }
}

export const storage = new StorageService();