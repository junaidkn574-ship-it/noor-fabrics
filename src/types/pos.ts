export type UnitType = 'meter' | 'piece';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unitType: UnitType;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  lowStockThreshold: number;
  fabricNote?: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  code: string;
  name: string;
  category: string;
  unitType: UnitType;
  costPrice: number;
  sellingPrice: number;
  qty: number;
  itemDiscount: number; // flat PKR discount on this line item
}

export interface InvoiceItem {
  productId: string;
  code: string;
  name: string;
  unitType: UnitType;
  qty: number;
  unitPrice: number;
  unitCost: number;
  itemDiscount: number;
  lineSubtotal: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  createdAt: string; // ISO string
  customerName?: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  itemDiscountsTotal: number;
  billDiscount: number;
  totalDiscount: number;
  grandTotal: number;
  totalCost: number;
  netProfit: number; // subtotal - totalCost - totalDiscount (equals grandTotal - totalCost)
  cashTendered?: number;
  changeDue?: number;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: string;
}

export interface ShopSettings {
  id: string;
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  receiptFooter: string;
  adminPin: string;
  nextInvoiceSeq: number;
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  products: Product[];
  invoices: Invoice[];
  expenses: Expense[];
  settings: ShopSettings;
}

export type AppTab = 'pos' | 'reports' | 'inventory' | 'expenses' | 'backup';

export type DateFilterPreset = 'today' | 'yesterday' | 'month' | 'all' | 'custom';
