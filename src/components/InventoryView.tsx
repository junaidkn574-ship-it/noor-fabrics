import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Edit3,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Product, UnitType } from '../types/pos';
import {
  formatPKR,
  formatQty,
  formatUnitLabel,
  generateId,
} from '../utils/format';

interface InventoryViewProps {
  products: Product[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

const PRESET_CATEGORIES = [
  'Boski',
  'Cotton',
  'Wash & Wear',
  'Khaddar',
  'Ready-made Kurta',
  'Ready-made Suit',
  'Wool & Suiting',
  'Accessories',
];

interface ProductFormState {
  id?: string;
  code: string;
  name: string;
  category: string;
  unitType: UnitType;
  costPrice: string;
  sellingPrice: string;
  stock: string;
  lowStockThreshold: string;
  fabricNote: string;
}

const emptyForm = (): ProductFormState => ({
  code: '',
  name: '',
  category: 'Cotton',
  unitType: 'meter',
  costPrice: '',
  sellingPrice: '',
  stock: '',
  lowStockThreshold: '10',
  fabricNote: '',
});

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onSaveProduct,
  onDeleteProduct,
}) => {
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [formError, setFormError] = useState('');
  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const lowCount = products.filter((p) => p.stock <= p.lowStockThreshold).length;
    const totalCostValue = products.reduce((sum, p) => sum + p.stock * p.costPrice, 0);
    const totalRetailValue = products.reduce((sum, p) => sum + p.stock * p.sellingPrice, 0);
    return {
      totalItems: products.length,
      lowCount,
      totalCostValue: Math.round(totalCostValue),
      totalRetailValue: Math.round(totalRetailValue),
    };
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (stockFilter === 'low' && p.stock > p.lowStockThreshold) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, search, stockFilter]);

  const openAddModal = () => {
    setForm(emptyForm());
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setForm({
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
      unitType: product.unitType,
      costPrice: String(product.costPrice),
      sellingPrice: String(product.sellingPrice),
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      fabricNote: product.fabricNote || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const category = form.category.trim() || 'Cotton';
    const costPrice = parseFloat(form.costPrice);
    const sellingPrice = parseFloat(form.sellingPrice);
    const stock = parseFloat(form.stock);
    const threshold = parseFloat(form.lowStockThreshold);

    if (!name) {
      setFormError('Product name is required.');
      return;
    }
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      setFormError('Enter a valid Cost Price (Kharid Rate).');
      return;
    }
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      setFormError('Enter a valid Selling Price (Farokht Rate).');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      setFormError('Enter a valid current stock quantity.');
      return;
    }

    const cleanCode =
      form.code.trim().toUpperCase() ||
      `${category.slice(0, 3).toUpperCase()}-${String(products.length + 101)}`;

    const saved: Product = {
      id: form.id || generateId('prod'),
      code: cleanCode,
      name,
      category,
      unitType: form.unitType,
      costPrice: Math.round(costPrice),
      sellingPrice: Math.round(sellingPrice),
      stock: form.unitType === 'meter' ? Math.round(stock * 100) / 100 : Math.round(stock),
      lowStockThreshold: Number.isFinite(threshold) && threshold >= 0 ? threshold : 5,
      fabricNote: form.fabricNote.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct(saved);
    setModalOpen(false);
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTarget) return;
    const addVal = parseFloat(restockAmount);
    if (!Number.isFinite(addVal) || addVal <= 0) return;
    const updatedStock =
      restockTarget.unitType === 'meter'
        ? Math.round((restockTarget.stock + addVal) * 100) / 100
        : Math.round(restockTarget.stock + addVal);

    onSaveProduct({
      ...restockTarget,
      stock: updatedStock,
      updatedAt: new Date().toISOString(),
    });
    setRestockTarget(null);
    setRestockAmount('');
  };

  const previewCost = parseFloat(form.costPrice) || 0;
  const previewSell = parseFloat(form.sellingPrice) || 0;
  const previewMargin = previewSell - previewCost;
  const previewMarginPct = previewSell > 0 ? Math.round((previewMargin / previewSell) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header & Summary Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            Inventory &amp; Cost Management
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Manage fabric bolts, ready-made suits, Kharid cost rates, and low-stock alerts.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="min-h-[48px] px-5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add New Product
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-semibold text-[#64748B]">Total Catalog Items</div>
          <div className="text-2xl font-extrabold text-[#0F172A] tabular-nums mt-1">
            {stats.totalItems}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-semibold text-[#64748B]">Stock Cost Value (Kharid)</div>
          <div className="text-2xl font-extrabold text-[#0F172A] tabular-nums mt-1">
            {formatPKR(stats.totalCostValue)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-semibold text-[#64748B]">Stock Retail Value (Farokht)</div>
          <div className="text-2xl font-extrabold text-[#10B981] tabular-nums mt-1">
            {formatPKR(stats.totalRetailValue)}
          </div>
        </div>
        <div
          className={`border rounded-2xl p-4 ${
            stats.lowCount > 0
              ? 'bg-[#FEF2F2] border-[#FECACA]'
              : 'bg-white border-slate-200'
          }`}
        >
          <div
            className={`text-xs font-semibold ${
              stats.lowCount > 0 ? 'text-[#EF4444]' : 'text-[#64748B]'
            }`}
          >
            Low-Stock Alerts
          </div>
          <div
            className={`text-2xl font-extrabold tabular-nums mt-1 flex items-center gap-2 ${
              stats.lowCount > 0 ? 'text-[#EF4444]' : 'text-[#0F172A]'
            }`}
          >
            {stats.lowCount > 0 && <AlertTriangle className="w-5 h-5" />}
            {stats.lowCount}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by item name, code, or category..."
            className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 bg-[#F8FAFC] text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setStockFilter('all')}
            className={`min-h-[42px] px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              stockFilter === 'all'
                ? 'bg-[#0F172A] text-white'
                : 'text-[#0F172A] hover:bg-slate-200'
            }`}
          >
            All ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('low')}
            className={`min-h-[42px] px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              stockFilter === 'low'
                ? 'bg-[#EF4444] text-white'
                : 'text-[#EF4444] hover:bg-red-100'
            }`}
          >
            Low Stock ({stats.lowCount})
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-bold text-[#64748B]">
                <th className="py-3.5 px-4">Product &amp; Code</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Unit</th>
                <th className="py-3.5 px-4 text-right">Cost (Kharid)</th>
                <th className="py-3.5 px-4 text-right">Selling (Farokht)</th>
                <th className="py-3.5 px-4 text-right">Profit / Unit</th>
                <th className="py-3.5 px-4 text-right">Current Stock</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#64748B]">
                    No inventory items match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isOut = p.stock <= 0;
                  const isLow = p.stock <= p.lowStockThreshold;
                  const unitProfit = p.sellingPrice - p.costPrice;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0F172A]">{p.name}</div>
                        <div className="text-xs text-[#64748B] font-mono mt-0.5">
                          {p.code}
                          {p.fabricNote ? ` · ${p.fabricNote}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#0F172A] font-medium whitespace-nowrap">
                        {p.category}
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                        {formatUnitLabel(p.unitType)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-[#64748B] tabular-nums whitespace-nowrap">
                        {formatPKR(p.costPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#0F172A] tabular-nums whitespace-nowrap">
                        {formatPKR(p.sellingPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#10B981] tabular-nums whitespace-nowrap">
                        +{formatPKR(unitProfit)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isLow ? (
                          <div className="inline-flex items-center gap-1.5 font-bold text-[#EF4444] tabular-nums">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>
                              {isOut ? 'Out of Stock (0)' : `Low: ${formatQty(p.stock, p.unitType)}`}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-[#0F172A] tabular-nums">
                            {formatQty(p.stock, p.unitType)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setRestockTarget(p);
                              setRestockAmount('');
                            }}
                            title="Add Stock"
                            className="h-10 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-[#0F172A] inline-flex items-center gap-1"
                          >
                            <PackagePlus className="w-3.5 h-3.5 text-[#10B981]" />
                            Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            aria-label={`Edit ${p.name}`}
                            className="h-10 w-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0F172A] inline-flex items-center justify-center"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {deleteConfirmId === p.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteProduct(p.id);
                                setDeleteConfirmId(null);
                              }}
                              className="h-10 px-3 rounded-lg bg-[#EF4444] text-white text-xs font-bold"
                            >
                              Confirm
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(p.id)}
                              aria-label={`Delete ${p.name}`}
                              className="h-10 w-10 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#EF4444] hover:bg-red-100 inline-flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-[#F8FAFC]">
              <h3 className="text-lg font-bold text-[#0F172A]">
                {form.id ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-10 w-10 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 overflow-y-auto space-y-4">
              {formError && (
                <div className="px-3.5 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#EF4444]">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Item Code / SKU
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g. BOS-007"
                    className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Pasha Platinum Wash & Wear"
                    className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    list="fabric-categories"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                  />
                  <datalist id="fabric-categories">
                    {PRESET_CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Unit Type
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#F1F5F9] rounded-xl">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, unitType: 'meter' })}
                      className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
                        form.unitType === 'meter'
                          ? 'bg-[#0F172A] text-white'
                          : 'text-[#0F172A]'
                      }`}
                    >
                      Per Meter
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, unitType: 'piece' })}
                      className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
                        form.unitType === 'piece'
                          ? 'bg-[#0F172A] text-white'
                          : 'text-[#0F172A]'
                      }`}
                    >
                      Per Suit / Piece
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Cost Price — Kharid Rate (PKR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    placeholder="e.g. 2400"
                    className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Selling Price — Farokht Rate (PKR) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                    placeholder="e.g. 3200"
                    className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                  />
                </div>
              </div>

              {previewSell > 0 && (
                <div className="px-4 py-2.5 rounded-xl bg-[#F1F5F9] text-xs font-semibold flex items-center justify-between">
                  <span className="text-[#64748B]">Estimated Margin per {form.unitType}</span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      previewMargin >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                    }`}
                  >
                    {formatPKR(previewMargin)} ({previewMarginPct}%)
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Current Stock ({form.unitType === 'meter' ? 'Meters' : 'Suits/Pieces'}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={form.unitType === 'meter' ? '0.01' : '1'}
                    required
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    placeholder={form.unitType === 'meter' ? 'e.g. 45.5' : 'e.g. 12'}
                    className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Low-Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={form.unitType === 'meter' ? '0.5' : '1'}
                    value={form.lowStockThreshold}
                    onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                    className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Fabric / Spec Note (Optional)
                </label>
                <input
                  type="text"
                  value={form.fabricNote}
                  onChange={(e) => setForm({ ...form, fabricNote: e.target.value })}
                  placeholder='e.g. 100% Egyptian Cotton · 56" width'
                  className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                />
              </div>

              <div className="pt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[48px] rounded-xl border border-slate-200 bg-white text-sm font-bold text-[#0F172A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold"
                >
                  {form.id ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Restock Modal */}
      {restockTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setRestockTarget(null)}
        >
          <div
            className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Add Incoming Stock</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                {restockTarget.name} · Current:{' '}
                <span className="font-bold text-[#0F172A]">
                  {formatQty(restockTarget.stock, restockTarget.unitType)}
                </span>
              </p>
            </div>
            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <input
                type="number"
                min="0.01"
                step={restockTarget.unitType === 'meter' ? '0.01' : '1'}
                autoFocus
                required
                value={restockAmount}
                onChange={(e) => setRestockAmount(e.target.value)}
                placeholder={`Quantity to add (${
                  restockTarget.unitType === 'meter' ? 'meters' : 'pieces'
                })`}
                className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-base font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRestockTarget(null)}
                  className="min-h-[48px] rounded-xl border border-slate-200 text-sm font-bold text-[#0F172A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold"
                >
                  Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
