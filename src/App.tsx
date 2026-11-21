import { useCallback, useEffect, useState } from 'react';
import { Lock, Unlock, CheckCircle2, Printer, X } from 'lucide-react';
import {
  DEFAULT_SETTINGS,
  loadPosDatabase,
  PosDatabaseState,
  SAMPLE_EXPENSES,
  SAMPLE_PRODUCTS,
  savePosDatabase,
} from './db/localDb';
import {
  AppTab,
  CartItem,
  Expense,
  Invoice,
  Product,
  ShopSettings,
} from './types/pos';
import { formatPKR, generateId, roundQty } from './utils/format';
import { PosTerminal } from './components/PosTerminal';
import { InventoryView } from './components/InventoryView';
import { ProfitReportsView } from './components/ProfitReportsView';
import { ExpensesView } from './components/ExpensesView';
import { BackupSettingsView } from './components/BackupSettingsView';
import { PinLockModal } from './components/PinLockModal';
import { ReceiptPreviewModal, ThermalReceiptContent } from './components/ThermalReceipt';

const PROTECTED_TABS: AppTab[] = ['reports', 'inventory', 'expenses', 'backup'];

const NAV_ITEMS: { id: AppTab; label: string; protected: boolean }[] = [
  { id: 'pos', label: 'POS Billing', protected: false },
  { id: 'reports', label: 'Profit & Reports', protected: true },
  { id: 'inventory', label: 'Inventory', protected: true },
  { id: 'expenses', label: 'Expenses', protected: true },
  { id: 'backup', label: 'Backup & Settings', protected: true },
];

export default function App() {
  const [dbState, setDbState] = useState<PosDatabaseState | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('pos');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [pendingProtectedTab, setPendingProtectedTab] = useState<AppTab | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [lastCompletedInvoice, setLastCompletedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    let active = true;
    loadPosDatabase().then((loaded) => {
      if (active) setDbState(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const persistState = useCallback((updater: (prev: PosDatabaseState) => PosDatabaseState) => {
    setDbState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      void savePosDatabase(next);
      return next;
    });
  }, []);

  const triggerThermalPrint = useCallback((invoice: Invoice) => {
    setPrintInvoice(invoice);
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
      }, 60);
    });
  }, []);

  const handleNavClick = (tab: AppTab) => {
    if (PROTECTED_TABS.includes(tab) && !isAdminUnlocked) {
      setPendingProtectedTab(tab);
      setPinModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleAdminActionClick = () => {
    if (isAdminUnlocked) {
      setIsAdminUnlocked(false);
      if (PROTECTED_TABS.includes(activeTab)) {
        setActiveTab('pos');
      }
    } else {
      setPendingProtectedTab(null);
      setPinModalOpen(true);
    }
  };

  const handlePinUnlocked = () => {
    setIsAdminUnlocked(true);
    setPinModalOpen(false);
    if (pendingProtectedTab) {
      setActiveTab(pendingProtectedTab);
      setPendingProtectedTab(null);
    }
  };

  const handleCompleteSale = ({
    cart,
    billDiscount,
    customerName,
    customerPhone,
    cashTendered,
  }: {
    cart: CartItem[];
    billDiscount: number;
    customerName: string;
    customerPhone: string;
    cashTendered?: number;
  }): Invoice | null => {
    if (!dbState || cart.length === 0) return null;

    const items = cart.map((c) => {
      const lineSubtotal = Math.round(c.qty * c.sellingPrice);
      const itemDiscount = Math.min(Math.round(c.itemDiscount), lineSubtotal);
      const lineTotal = Math.max(0, lineSubtotal - itemDiscount);
      return {
        productId: c.productId,
        code: c.code,
        name: c.name,
        unitType: c.unitType,
        qty: c.qty,
        unitPrice: c.sellingPrice,
        unitCost: c.costPrice,
        itemDiscount,
        lineSubtotal,
        lineTotal,
      };
    });

    const subtotal = items.reduce((s, it) => s + it.lineSubtotal, 0);
    const itemDiscountsTotal = items.reduce((s, it) => s + it.itemDiscount, 0);
    const afterItem = Math.max(0, subtotal - itemDiscountsTotal);
    const clampedBillDisc = Math.min(Math.round(billDiscount), afterItem);
    const totalDiscount = itemDiscountsTotal + clampedBillDisc;
    const grandTotal = Math.max(0, subtotal - totalDiscount);
    const totalCost = Math.round(
      items.reduce((s, it) => s + it.qty * it.unitCost, 0)
    );
    const netProfit = subtotal - totalCost - totalDiscount;
    const changeDue =
      cashTendered !== undefined && cashTendered > grandTotal
        ? Math.round(cashTendered - grandTotal)
        : 0;

    const seq = dbState.settings.nextInvoiceSeq || 1001;
    const invoice: Invoice = {
      id: generateId('inv'),
      invoiceNumber: `INV-${seq}`,
      createdAt: new Date().toISOString(),
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      items,
      subtotal,
      itemDiscountsTotal,
      billDiscount: clampedBillDisc,
      totalDiscount,
      grandTotal,
      totalCost,
      netProfit,
      cashTendered,
      changeDue: cashTendered ? changeDue : undefined,
    };

    const qtyByProd = new Map<string, number>();
    for (const item of items) {
      qtyByProd.set(item.productId, (qtyByProd.get(item.productId) || 0) + item.qty);
    }

    persistState((prev) => ({
      ...prev,
      products: prev.products.map((p) => {
        const sold = qtyByProd.get(p.id);
        if (!sold) return p;
        const remaining = Math.max(0, roundQty(p.stock - sold, p.unitType));
        return { ...p, stock: remaining, updatedAt: new Date().toISOString() };
      }),
      invoices: [invoice, ...prev.invoices],
      settings: {
        ...prev.settings,
        nextInvoiceSeq: seq + 1,
      },
    }));

    setLastCompletedInvoice(invoice);
    triggerThermalPrint(invoice);
    return invoice;
  };

  const handleSaveProduct = (product: Product) => {
    persistState((prev) => {
      const exists = prev.products.some((p) => p.id === product.id);
      const products = exists
        ? prev.products.map((p) => (p.id === product.id ? product : p))
        : [product, ...prev.products];
      return { ...prev, products };
    });
  };

  const handleDeleteProduct = (productId: string) => {
    persistState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== productId),
    }));
  };

  const handleVoidInvoice = (invoiceId: string) => {
    persistState((prev) => {
      const target = prev.invoices.find((inv) => inv.id === invoiceId);
      if (!target) return prev;

      const restoreByProd = new Map<string, number>();
      for (const item of target.items) {
        restoreByProd.set(
          item.productId,
          (restoreByProd.get(item.productId) || 0) + item.qty
        );
      }

      return {
        ...prev,
        products: prev.products.map((p) => {
          const addBack = restoreByProd.get(p.id);
          if (!addBack) return p;
          return {
            ...p,
            stock: roundQty(p.stock + addBack, p.unitType),
            updatedAt: new Date().toISOString(),
          };
        }),
        invoices: prev.invoices.filter((inv) => inv.id !== invoiceId),
      };
    });
  };

  const handleAddExpense = (expense: Expense) => {
    persistState((prev) => ({
      ...prev,
      expenses: [expense, ...prev.expenses],
    }));
  };

  const handleDeleteExpense = (id: string) => {
    persistState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  };

  const handleUpdateSettings = (settings: ShopSettings) => {
    persistState((prev) => ({ ...prev, settings }));
  };

  const handleRestoreBackup = (restored: PosDatabaseState) => {
    setDbState(restored);
    void savePosDatabase(restored);
  };

  const handleResetSampleData = () => {
    const fresh: PosDatabaseState = {
      products: SAMPLE_PRODUCTS,
      invoices: [],
      expenses: SAMPLE_EXPENSES,
      settings: dbState ? { ...DEFAULT_SETTINGS, adminPin: dbState.settings.adminPin } : DEFAULT_SETTINGS,
    };
    setDbState(fresh);
    void savePosDatabase(fresh);
  };

  if (!dbState) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-sm font-semibold text-[#64748B]">Loading offline shop database...</div>
      </div>
    );
  }

  const pendingLabel =
    NAV_ITEMS.find((n) => n.id === pendingProtectedTab)?.label || 'Admin Area';

  return (
    <>
      <div id="app-shell" className="min-h-screen flex flex-col bg-[#F8FAFC]">
        {/* Top Bar Contract: 3 clean zones separated by gap-8 */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className="text-lg font-extrabold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0 text-left"
          >
            {dbState.settings.shopName}
          </button>

          {/* Zone 2: Concise single-line navigation tabs */}
          <nav
            aria-label="Primary Navigation"
            className="flex items-center gap-4 lg:gap-6 overflow-x-auto no-scrollbar"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              const showLock = item.protected && !isAdminUnlocked;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`relative py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'text-[#0F172A]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {showLock && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#0F172A] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleAdminActionClick}
              className={`min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                isAdminUnlocked
                  ? 'bg-[#0F172A] hover:bg-[#1E293B] text-white'
                  : 'border border-slate-200 bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A]'
              }`}
            >
              {isAdminUnlocked ? (
                <>
                  <Unlock className="w-4 h-4 text-[#10B981]" />
                  <span>Lock Admin</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Admin Unlock</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Sale Completed Banner (Quick Re-print / Preview) */}
        {lastCompletedInvoice && activeTab === 'pos' && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#006c49]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Invoice <span className="font-mono font-bold">{lastCompletedInvoice.invoiceNumber}</span> saved ({formatPKR(lastCompletedInvoice.grandTotal)}). Stock updated.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => triggerThermalPrint(lastCompletedInvoice)}
                className="min-h-[36px] px-3 rounded-lg bg-[#0F172A] text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Re-print 80mm
              </button>
              <button
                type="button"
                onClick={() => setPreviewInvoice(lastCompletedInvoice)}
                className="min-h-[36px] px-3 rounded-lg border border-emerald-300 bg-white text-[#006c49] text-xs font-bold"
              >
                View Receipt
              </button>
              <button
                type="button"
                onClick={() => setLastCompletedInvoice(null)}
                aria-label="Dismiss banner"
                className="h-9 w-9 rounded-lg text-[#006c49] hover:bg-emerald-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-5">
          {activeTab === 'pos' && (
            <PosTerminal
              products={dbState.products}
              onCompleteSale={handleCompleteSale}
            />
          )}

          {activeTab === 'reports' && isAdminUnlocked && (
            <ProfitReportsView
              invoices={dbState.invoices}
              expenses={dbState.expenses}
              onReprintInvoice={triggerThermalPrint}
              onPreviewInvoice={(inv) => setPreviewInvoice(inv)}
              onVoidInvoice={handleVoidInvoice}
            />
          )}

          {activeTab === 'inventory' && isAdminUnlocked && (
            <InventoryView
              products={dbState.products}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {activeTab === 'expenses' && isAdminUnlocked && (
            <ExpensesView
              expenses={dbState.expenses}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activeTab === 'backup' && isAdminUnlocked && (
            <BackupSettingsView
              dbState={dbState}
              onUpdateSettings={handleUpdateSettings}
              onRestoreBackup={handleRestoreBackup}
              onResetSampleData={handleResetSampleData}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <PinLockModal
        isOpen={pinModalOpen}
        expectedPin={dbState.settings.adminPin}
        targetLabel={pendingLabel}
        onUnlock={handlePinUnlocked}
        onClose={() => {
          setPinModalOpen(false);
          setPendingProtectedTab(null);
        }}
      />

      <ReceiptPreviewModal
        invoice={previewInvoice}
        settings={dbState.settings}
        onPrint={(inv) => triggerThermalPrint(inv)}
        onClose={() => setPreviewInvoice(null)}
      />

      {/* Dedicated 80mm Print Container (Hidden on screen, visible only in @media print) */}
      <div id="thermal-receipt-print" aria-hidden="true">
        {printInvoice && (
          <ThermalReceiptContent invoice={printInvoice} settings={dbState.settings} />
        )}
      </div>
    </>
  );
}
