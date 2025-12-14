export enum MovementType {
  IN = 'IN', // Carico
  OUT = 'OUT' // Scarico
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  quantity: number;
  minStock: number;
  category: string;
  imageData?: string; // Base64 image
  updatedAt: number;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: MovementType;
  quantity: number;
  date: number;
  reason?: string;
}

export interface DriveConfig {
  clientId: string;
  apiKey: string; // Needed for Picker API or direct REST calls if not using GSI exclusively
  folderId?: string;
  lastSync?: number;
}

export interface AppState {
  items: InventoryItem[];
  movements: StockMovement[];
  config: DriveConfig;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastError?: string;
  successMessage?: string;
}