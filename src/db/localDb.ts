import { BackupPayload, Expense, Invoice, Product, ShopSettings } from '../types/pos';
import { getTodayDateKey } from '../utils/format';

const DB_NAME = 'AlNoorSartorialPOS_DB';
const DB_VERSION = 1;
const LS_MIRROR_KEY = 'alnoor_sartorial_pos_mirror_v1';

export const DEFAULT_SETTINGS: ShopSettings = {
  id: 'default',
  shopName: 'Al-Noor Fabrics & Menswear',
  shopAddress: 'Shop #14, Azam Cloth Market, Lahore',
  shopPhone: '0300-4128890',
  receiptFooter: 'Thank You for Shopping — Exchange within 7 days with receipt',
  adminPin: '1234',
  nextInvoiceSeq: 1001,
};

export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'prod_bos_001',
    code: 'BOS-001',
    name: 'Royal Golden Boski 8-Pound',
    category: 'Boski',
    unitType: 'meter',
    costPrice: 2400,
    sellingPrice: 3200,
    stock: 42.5,
    lowStockThreshold: 10,
    fabricNote: 'Pure spun silk finish · 56" width',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_cot_002',
    code: 'COT-002',
    name: 'Giza Egyptian Cotton Latha',
    category: 'Cotton',
    unitType: 'meter',
    costPrice: 950,
    sellingPrice: 1450,
    stock: 68.0,
    lowStockThreshold: 12,
    fabricNote: '100% combed cotton · crisp finish',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_wnw_003',
    code: 'WNW-003',
    name: 'Grace Tropical Wash & Wear',
    category: 'Wash & Wear',
    unitType: 'meter',
    costPrice: 820,
    sellingPrice: 1250,
    stock: 54.0,
    lowStockThreshold: 10,
    fabricNote: 'Wrinkle-resistant · Navy / Charcoal',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_khd_004',
    code: 'KHD-004',
    name: 'Kamalia Khaddar Winter Bolt',
    category: 'Khaddar',
    unitType: 'meter',
    costPrice: 780,
    sellingPrice: 1180,
    stock: 8.5,
    lowStockThreshold: 10,
    fabricNote: 'Handloom winter weave · Earth tones',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_krt_005',
    code: 'KRT-005',
    name: 'Executive Embroidered Kurta',
    category: 'Ready-made Kurta',
    unitType: 'piece',
    costPrice: 2800,
    sellingPrice: 4200,
    stock: 14,
    lowStockThreshold: 4,
    fabricNote: 'Stitched M / L / XL · Collar placket',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_sut_006',
    code: 'SUT-006',
    name: 'Charcoal Italian Wool 2-Piece',
    category: 'Ready-made Suit',
    unitType: 'piece',
    costPrice: 8500,
    sellingPrice: 12500,
    stock: 2,
    lowStockThreshold: 3,
    fabricNote: 'Super 120s blend · Tailored fit',
    updatedAt: new Date().toISOString(),
  },
];

export const SAMPLE_EXPENSES: Expense[] = [
  {
    id: 'exp_sample_1',
    title: 'Shop Tea & Customer Refreshment',
    category: 'Hospitality',
    amount: 450,
    date: getTodayDateKey(),
    note: 'Daily counter refreshment',
    createdAt: new Date().toISOString(),
  },
];

export interface PosDatabaseState {
  products: Product[];
  invoices: Invoice[];
  expenses: Expense[];
  settings: ShopSettings;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('invoices')) {
        db.createObjectStore('invoices', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('expenses')) {
        db.createObjectStore('expenses', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

function readAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

function replaceStoreContents<T>(db: IDBDatabase, storeName: string, items: T[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function writeMirror(state: PosDatabaseState): void {
  try {
    localStorage.setItem(LS_MIRROR_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

function readMirror(): PosDatabaseState | null {
  try {
    const raw = localStorage.getItem(LS_MIRROR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PosDatabaseState;
    if (!parsed || !Array.isArray(parsed.products)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function loadPosDatabase(): Promise<PosDatabaseState> {
  try {
    const db = await openDatabase();
    const [products, invoices, expenses, settingsArr] = await Promise.all([
      readAllFromStore<Product>(db, 'products'),
      readAllFromStore<Invoice>(db, 'invoices'),
      readAllFromStore<Expense>(db, 'expenses'),
      readAllFromStore<ShopSettings>(db, 'settings'),
    ]);

    if (products.length === 0 && invoices.length === 0 && settingsArr.length === 0) {
      const mirror = readMirror();
      if (mirror && mirror.products.length > 0) {
        await savePosDatabase(mirror);
        db.close();
        return mirror;
      }
      const initial: PosDatabaseState = {
        products: SAMPLE_PRODUCTS,
        invoices: [],
        expenses: SAMPLE_EXPENSES,
        settings: DEFAULT_SETTINGS,
      };
      await savePosDatabase(initial);
      db.close();
      return initial;
    }

    const state: PosDatabaseState = {
      products,
      invoices: invoices.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      expenses: expenses.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      settings: settingsArr[0] ? { ...DEFAULT_SETTINGS, ...settingsArr[0] } : DEFAULT_SETTINGS,
    };
    writeMirror(state);
    db.close();
    return state;
  } catch {
    const mirror = readMirror();
    if (mirror) return mirror;
    const initial: PosDatabaseState = {
      products: SAMPLE_PRODUCTS,
      invoices: [],
      expenses: SAMPLE_EXPENSES,
      settings: DEFAULT_SETTINGS,
    };
    writeMirror(initial);
    return initial;
  }
}

export async function savePosDatabase(state: PosDatabaseState): Promise<void> {
  writeMirror(state);
  try {
    const db = await openDatabase();
    await Promise.all([
      replaceStoreContents(db, 'products', state.products),
      replaceStoreContents(db, 'invoices', state.invoices),
      replaceStoreContents(db, 'expenses', state.expenses),
      replaceStoreContents(db, 'settings', [state.settings]),
    ]);
    db.close();
  } catch {
    // Mirror in localStorage already saved
  }
}

export function buildBackupPayload(state: PosDatabaseState): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    products: state.products,
    invoices: state.invoices,
    expenses: state.expenses,
    settings: state.settings,
  };
}

export function parseBackupPayload(jsonText: string): PosDatabaseState {
  const data = JSON.parse(jsonText) as Partial<BackupPayload>;
  if (!data || !Array.isArray(data.products) || !Array.isArray(data.invoices)) {
    throw new Error('Invalid backup file: missing products or invoices arrays.');
  }

  const sanitizedProducts: Product[] = data.products.map((p) => ({
    id: String(p.id),
    code: String(p.code || 'SKU'),
    name: String(p.name || 'Unnamed Item'),
    category: String(p.category || 'Cotton'),
    unitType: p.unitType === 'piece' ? 'piece' : 'meter',
    costPrice: Number(p.costPrice) || 0,
    sellingPrice: Number(p.sellingPrice) || 0,
    stock: Number(p.stock) || 0,
    lowStockThreshold: Number(p.lowStockThreshold) || (p.unitType === 'piece' ? 3 : 10),
    fabricNote: p.fabricNote ? String(p.fabricNote) : undefined,
    updatedAt: p.updatedAt ? String(p.updatedAt) : new Date().toISOString(),
  }));

  const sanitizedInvoices: Invoice[] = data.invoices.map((inv) => ({
    ...inv,
    id: String(inv.id),
    invoiceNumber: String(inv.invoiceNumber),
    createdAt: String(inv.createdAt),
    items: Array.isArray(inv.items) ? inv.items : [],
    subtotal: Number(inv.subtotal) || 0,
    itemDiscountsTotal: Number(inv.itemDiscountsTotal) || 0,
    billDiscount: Number(inv.billDiscount) || 0,
    totalDiscount: Number(inv.totalDiscount) || 0,
    grandTotal: Number(inv.grandTotal) || 0,
    totalCost: Number(inv.totalCost) || 0,
    netProfit: Number(inv.netProfit) || 0,
  }));

  const sanitizedExpenses: Expense[] = Array.isArray(data.expenses)
    ? data.expenses.map((e) => ({
        id: String(e.id),
        title: String(e.title || 'Expense'),
        category: String(e.category || 'General'),
        amount: Number(e.amount) || 0,
        date: String(e.date || getTodayDateKey()),
        note: e.note ? String(e.note) : undefined,
        createdAt: String(e.createdAt || new Date().toISOString()),
      }))
    : [];

  const sanitizedSettings: ShopSettings = data.settings
    ? { ...DEFAULT_SETTINGS, ...data.settings, id: 'default' }
    : DEFAULT_SETTINGS;

  return {
    products: sanitizedProducts,
    invoices: sanitizedInvoices.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    expenses: sanitizedExpenses.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    settings: sanitizedSettings,
  };
}
