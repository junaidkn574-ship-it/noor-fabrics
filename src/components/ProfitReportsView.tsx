import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Eye,
  Printer,
  RotateCcw,
  Search,
  TrendingUp,
} from 'lucide-react';
import { DateFilterPreset, Expense, Invoice } from '../types/pos';
import {
  formatDateTime,
  formatPKR,
  formatQty,
  getTodayDateKey,
  matchesDatePreset,
} from '../utils/format';

interface ProfitReportsViewProps {
  invoices: Invoice[];
  expenses: Expense[];
  onReprintInvoice: (invoice: Invoice) => void;
  onPreviewInvoice: (invoice: Invoice) => void;
  onVoidInvoice: (invoiceId: string) => void;
}

export const ProfitReportsView: React.FC<ProfitReportsViewProps> = ({
  invoices,
  expenses,
  onReprintInvoice,
  onPreviewInvoice,
  onVoidInvoice,
}) => {
  const [preset, setPreset] = useState<DateFilterPreset>('today');
  const [customDate, setCustomDate] = useState<string>(getTodayDateKey());
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null);

  const periodInvoices = useMemo(() => {
    return invoices.filter((inv) => matchesDatePreset(inv.createdAt, preset, customDate));
  }, [invoices, preset, customDate]);

  const periodExpenses = useMemo(() => {
    return expenses.filter((exp) => matchesDatePreset(exp.date, preset, customDate));
  }, [expenses, preset, customDate]);

  const summary = useMemo(() => {
    let grossSubtotal = 0;
    let totalDiscount = 0;
    let totalSales = 0;
    let totalCost = 0;
    let netProfit = 0;

    for (const inv of periodInvoices) {
      grossSubtotal += inv.subtotal;
      totalDiscount += inv.totalDiscount;
      totalSales += inv.grandTotal;
      totalCost += inv.totalCost;
      netProfit += inv.netProfit;
    }

    const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
    const operatingNet = netProfit - totalExpenses;
    const marginPct = totalSales > 0 ? Math.round((netProfit / totalSales) * 100) : 0;

    return {
      grossSubtotal: Math.round(grossSubtotal),
      totalDiscount: Math.round(totalDiscount),
      totalSales: Math.round(totalSales),
      totalCost: Math.round(totalCost),
      netProfit: Math.round(netProfit),
      totalExpenses: Math.round(totalExpenses),
      operatingNet: Math.round(operatingNet),
      invoiceCount: periodInvoices.length,
      marginPct,
    };
  }, [periodInvoices, periodExpenses]);

  const bestSelling = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        name: string;
        code: string;
        unitType: 'meter' | 'piece';
        qtySold: number;
        revenue: number;
        profit: number;
      }
    >();

    for (const inv of periodInvoices) {
      for (const item of inv.items) {
        const existing = map.get(item.productId);
        const itemCost = item.qty * item.unitCost;
        const itemProfit = item.lineTotal - itemCost;
        if (existing) {
          existing.qtySold += item.qty;
          existing.revenue += item.lineTotal;
          existing.profit += itemProfit;
        } else {
          map.set(item.productId, {
            productId: item.productId,
            name: item.name,
            code: item.code,
            unitType: item.unitType,
            qtySold: item.qty,
            revenue: item.lineTotal,
            profit: itemProfit,
          });
        }
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [periodInvoices]);

  const searchedInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    if (!q) return periodInvoices;
    return periodInvoices.filter((inv) => {
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.customerName || '').toLowerCase().includes(q) ||
        (inv.customerPhone || '').toLowerCase().includes(q) ||
        inv.items.some((it) => it.name.toLowerCase().includes(q))
      );
    });
  }, [periodInvoices, invoiceSearch]);

  const periodTitle =
    preset === 'today'
      ? "Today's"
      : preset === 'yesterday'
      ? "Yesterday's"
      : preset === 'month'
      ? "This Month's"
      : preset === 'custom'
      ? `${customDate}`
      : 'All-Time';

  return (
    <div className="space-y-5">
      {/* Header + Date Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            Profit &amp; Sales Analytics
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Track daily revenue, Kharid cost, Net Profit (Sales − Cost − Discount), and past receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-xl overflow-x-auto">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom Date' },
              ] as { id: DateFilterPreset; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPreset(tab.id)}
                className={`min-h-[42px] px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  preset === tab.id
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#0F172A] hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="min-h-[44px] pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-[#0F172A] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-bold text-[#64748B]">
            {periodTitle} Total Sales (Kul Bikri)
          </div>
          <div className="text-3xl font-extrabold text-[#0F172A] tabular-nums mt-1.5">
            {formatPKR(summary.totalSales)}
          </div>
          <div className="text-xs text-[#64748B] mt-2 tabular-nums">
            Gross: {formatPKR(summary.grossSubtotal)} · Disc: {formatPKR(summary.totalDiscount)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-bold text-[#64748B]">
            {periodTitle} Total Cost (Asal Qeemat)
          </div>
          <div className="text-3xl font-extrabold text-[#0F172A] tabular-nums mt-1.5">
            {formatPKR(summary.totalCost)}
          </div>
          <div className="text-xs text-[#64748B] mt-2">
            Purchase cost of sold fabric &amp; suits
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-bold text-[#64748B]">
            {periodTitle} Net Profit (Khalis Munafa)
          </div>
          <div
            className={`text-3xl font-extrabold tabular-nums mt-1.5 ${
              summary.netProfit >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
            }`}
          >
            {formatPKR(summary.netProfit)}
          </div>
          <div className="text-xs text-[#64748B] mt-2 tabular-nums">
            Margin: {summary.marginPct}% · Expenses: {formatPKR(summary.totalExpenses)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-bold text-[#64748B]">
            Total Invoices &amp; After-Expense Net
          </div>
          <div className="text-3xl font-extrabold text-[#0F172A] tabular-nums mt-1.5">
            {summary.invoiceCount}
          </div>
          <div className="text-xs text-[#64748B] mt-2 tabular-nums">
            Net after expenses:{' '}
            <span className="font-bold text-[#0F172A]">{formatPKR(summary.operatingNet)}</span>
          </div>
        </div>
      </div>

      {/* Best Selling Items + Past Receipts */}
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5 items-start">
        {/* Best Selling Items */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Best Selling Items</h2>
              <p className="text-xs text-[#64748B]">{periodTitle} top performers</p>
            </div>
            <TrendingUp className="w-5 h-5 text-[#10B981]" />
          </div>

          {bestSelling.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#64748B]">
              No sales recorded for this period yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {bestSelling.map((item, idx) => (
                <div key={item.productId} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#0F172A] truncate">
                      {idx + 1}. {item.name}
                    </div>
                    <div className="text-xs text-[#64748B] tabular-nums mt-0.5">
                      {item.code} · Sold: {formatQty(item.qtySold, item.unitType)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-[#0F172A] tabular-nums">
                      {formatPKR(item.revenue)}
                    </div>
                    <div className="text-xs font-semibold text-[#10B981] tabular-nums">
                      +{formatPKR(item.profit)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Receipts Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Past Sales Receipts</h2>
              <p className="text-xs text-[#64748B] tabular-nums">
                Showing {searchedInvoices.length} receipts for {periodTitle}
              </p>
            </div>
            <div className="relative sm:w-64">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="Search Invoice # or customer..."
                className="w-full min-h-[42px] pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-bold text-[#64748B]">
                  <th className="py-3 px-4">Invoice &amp; Time</th>
                  <th className="py-3 px-4">Items / Customer</th>
                  <th className="py-3 px-4 text-right">Total Sale</th>
                  <th className="py-3 px-4 text-right">Cost</th>
                  <th className="py-3 px-4 text-right">Net Profit</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {searchedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#64748B]">
                      No invoices found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  searchedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-[#0F172A]">
                          {inv.invoiceNumber}
                        </div>
                        <div className="text-xs text-[#64748B] tabular-nums mt-0.5">
                          {formatDateTime(inv.createdAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#0F172A] text-xs sm:text-sm">
                          {inv.items
                            .map((i) => `${i.name} (${formatQty(i.qty, i.unitType)})`)
                            .join(', ')}
                        </div>
                        {(inv.customerName || inv.totalDiscount > 0) && (
                          <div className="text-xs text-[#64748B] mt-0.5">
                            {inv.customerName ? `Customer: ${inv.customerName}` : 'Walk-in'}
                            {inv.totalDiscount > 0 && ` · Disc: ${formatPKR(inv.totalDiscount)}`}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#0F172A] tabular-nums whitespace-nowrap">
                        {formatPKR(inv.grandTotal)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#64748B] tabular-nums whitespace-nowrap">
                        {formatPKR(inv.totalCost)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#10B981] tabular-nums whitespace-nowrap">
                        {formatPKR(inv.netProfit)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPreviewInvoice(inv)}
                            title="Preview Receipt"
                            className="h-10 w-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0F172A] inline-flex items-center justify-center"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onReprintInvoice(inv)}
                            className="h-10 px-3 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Re-print
                          </button>
                          {voidConfirmId === inv.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                onVoidInvoice(inv.id);
                                setVoidConfirmId(null);
                              }}
                              className="h-10 px-3 rounded-lg bg-[#EF4444] text-white text-xs font-bold"
                            >
                              Confirm Void
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setVoidConfirmId(inv.id)}
                              title="Void invoice & restore stock"
                              className="h-10 w-10 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#EF4444] hover:bg-red-100 inline-flex items-center justify-center"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
