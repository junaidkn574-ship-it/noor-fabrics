import React, { useMemo, useState } from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { DateFilterPreset, Expense } from '../types/pos';
import {
  formatPKR,
  generateId,
  getTodayDateKey,
  matchesDatePreset,
} from '../utils/format';

interface ExpensesViewProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

const EXPENSE_CATEGORIES = [
  'Tailoring / Alteration',
  'Shop Rent',
  'Electricity & Generator',
  'Hospitality / Tea',
  'Packaging & Bags',
  'Staff Salary',
  'Transport / Freight',
  'General Maintenance',
];

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [preset, setPreset] = useState<DateFilterPreset>('month');
  const [customDate, setCustomDate] = useState(getTodayDateKey());
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayDateKey());
  const [note, setNote] = useState('');

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => matchesDatePreset(e.date, preset, customDate));
  }, [expenses, preset, customDate]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!title.trim() || !Number.isFinite(numAmount) || numAmount <= 0) return;

    onAddExpense({
      id: generateId('exp'),
      title: title.trim(),
      category,
      amount: Math.round(numAmount),
      date: date || getTodayDateKey(),
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    setTitle('');
    setAmount('');
    setNote('');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            Shop Expenses Ledger
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Record daily shop overheads permanently in local storage alongside sales.
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
                className="min-h-[44px] pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-[#0F172A] tabular-nums"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start">
        {/* Add Expense Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
        >
          <h2 className="text-base font-bold text-[#0F172A]">Log New Expense</h2>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
              Expense Description *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Tailor Stitching Bill"
              className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                Amount (PKR) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1500"
                className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
              Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Receipt or paid-to details"
              className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[50px] rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Save Expense
          </button>
        </form>

        {/* Expenses List */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Recorded Expenses</h2>
              <p className="text-xs text-[#64748B] tabular-nums">
                {filteredExpenses.length} entries
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-[#64748B]">Period Total</div>
              <div className="text-xl font-extrabold text-[#EF4444] tabular-nums">
                {formatPKR(totalAmount)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-bold text-[#64748B]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#64748B]">
                      No expenses recorded for this period.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-mono text-xs text-[#64748B] tabular-nums whitespace-nowrap">
                        {exp.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0F172A]">{exp.title}</div>
                        {exp.note && (
                          <div className="text-xs text-[#64748B] mt-0.5">{exp.note}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#0F172A] whitespace-nowrap">
                        {exp.category}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#0F172A] tabular-nums whitespace-nowrap">
                        {formatPKR(exp.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(exp.id)}
                          aria-label={`Delete ${exp.title}`}
                          className="h-10 w-10 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#EF4444] hover:bg-red-100 inline-flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
