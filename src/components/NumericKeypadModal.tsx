import React, { useEffect, useState } from 'react';
import { Delete, X, Check } from 'lucide-react';
import { formatPKR } from '../utils/format';

export type KeypadMode = 'qty-meter' | 'qty-piece' | 'discount' | 'cash';

interface NumericKeypadModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  mode: KeypadMode;
  initialValue: number;
  maxValue?: number;
  maxLabel?: string;
  unitSuffix?: string;
  referenceSubtotal?: number;
  onConfirm: (value: number) => void;
  onClose: () => void;
}

export const NumericKeypadModal: React.FC<NumericKeypadModalProps> = ({
  isOpen,
  title,
  subtitle,
  mode,
  initialValue,
  maxValue,
  maxLabel,
  unitSuffix,
  referenceSubtotal = 0,
  onConfirm,
  onClose,
}) => {
  const allowDecimal = mode === 'qty-meter';
  const [raw, setRaw] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [discountType, setDiscountType] = useState<'pkr' | 'pct'>('pkr');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setDiscountType('pkr');
    if (initialValue > 0) {
      setRaw(String(initialValue));
    } else {
      setRaw('');
    }
  }, [isOpen, initialValue, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
        return;
      }
      if (e.key === 'Backspace') {
        handleBackspace();
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
        return;
      }
      if (e.key === '.' && allowDecimal) {
        handleDecimal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    setError('');
    setRaw((prev) => {
      if (prev === '0') return digit;
      if (prev.includes('.')) {
        const [, dec] = prev.split('.');
        if (dec && dec.length >= 2) return prev;
      }
      if (prev.length >= 8) return prev;
      return prev + digit;
    });
  };

  const handleDecimal = () => {
    if (!allowDecimal) return;
    setError('');
    setRaw((prev) => {
      if (!prev) return '0.';
      if (prev.includes('.')) return prev;
      return prev + '.';
    });
  };

  const handleBackspace = () => {
    setError('');
    setRaw((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError('');
    setRaw('');
  };

  const applyPreset = (val: number) => {
    setError('');
    setRaw(String(val));
  };

  const parsedRaw = raw === '' || raw === '.' ? 0 : parseFloat(raw);
  const computedValue =
    mode === 'discount' && discountType === 'pct'
      ? Math.round((referenceSubtotal * parsedRaw) / 100)
      : parsedRaw;

  const handleSubmit = () => {
    if (!Number.isFinite(computedValue) || computedValue < 0) {
      setError('Enter a valid positive number.');
      return;
    }
    if ((mode === 'qty-meter' || mode === 'qty-piece') && computedValue <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (maxValue !== undefined && computedValue > maxValue) {
      setError(maxLabel || `Maximum allowed is ${maxValue}`);
      return;
    }
    onConfirm(
      mode === 'qty-meter'
        ? Math.round(computedValue * 100) / 100
        : Math.round(computedValue)
    );
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200 bg-[#F8FAFC]">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-[#0F172A] truncate">{title}</h3>
            {subtitle && (
              <p className="text-xs font-medium text-[#64748B] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close keypad"
            className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Discount Mode Toggle */}
          {mode === 'discount' && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setDiscountType('pkr');
                  setError('');
                }}
                className={`min-h-[44px] rounded-md text-sm font-semibold transition-colors ${
                  discountType === 'pkr'
                    ? 'bg-[#0F172A] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Flat PKR
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscountType('pct');
                  setError('');
                }}
                className={`min-h-[44px] rounded-md text-sm font-semibold transition-colors ${
                  discountType === 'pct'
                    ? 'bg-[#0F172A] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Percentage (%)
              </button>
            </div>
          )}

          {/* Numeric Display */}
          <div className="bg-[#F1F5F9] border border-slate-200 rounded-xl px-4 py-3 flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              {mode === 'discount'
                ? discountType === 'pct'
                  ? 'Discount %'
                  : 'Discount PKR'
                : mode === 'cash'
                ? 'Cash Received'
                : 'Quantity'}
            </span>
            <div className="text-right">
              <span className="font-mono text-3xl font-bold text-[#0F172A] tabular-nums">
                {raw || '0'}
              </span>
              {unitSuffix && (
                <span className="ml-1.5 text-sm font-semibold text-[#64748B]">
                  {mode === 'discount' && discountType === 'pct' ? '%' : unitSuffix}
                </span>
              )}
            </div>
          </div>

          {mode === 'discount' && discountType === 'pct' && referenceSubtotal > 0 && (
            <div className="text-xs font-medium text-[#64748B] flex items-center justify-between px-1">
              <span>Calculated Deduction</span>
              <span className="font-mono font-semibold text-[#0F172A] tabular-nums">
                {formatPKR(computedValue)}
              </span>
            </div>
          )}

          {/* Quick Fabric Cut Presets */}
          {mode === 'qty-meter' && (
            <div className="grid grid-cols-4 gap-2">
              {[2.5, 4.0, 4.5, 7.0].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="min-h-[44px] rounded-lg border border-slate-200 bg-[#F8FAFC] hover:bg-[#0F172A] hover:text-white hover:border-[#0F172A] text-sm font-bold text-[#0F172A] tabular-nums transition-colors"
                >
                  {preset} m
                </button>
              ))}
            </div>
          )}

          {mode === 'qty-piece' && (
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 5].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="min-h-[44px] rounded-lg border border-slate-200 bg-[#F8FAFC] hover:bg-[#0F172A] hover:text-white hover:border-[#0F172A] text-sm font-bold text-[#0F172A] tabular-nums transition-colors"
                >
                  {preset} {preset === 1 ? 'pc' : 'pcs'}
                </button>
              ))}
            </div>
          )}

          {mode === 'cash' && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Exact', val: referenceSubtotal },
                { label: '1,000', val: 1000 },
                { label: '5,000', val: 5000 },
                { label: '10,000', val: 10000 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.val)}
                  className="min-h-[44px] rounded-lg border border-slate-200 bg-[#F8FAFC] hover:bg-[#0F172A] hover:text-white hover:border-[#0F172A] text-xs font-bold text-[#0F172A] tabular-nums transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="px-3 py-2 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#EF4444]">
              {error}
            </div>
          )}

          {/* 64px Touch Keypad Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            {keys.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleDigit(k)}
                className="h-16 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 active:scale-[0.98] text-xl font-bold text-[#0F172A] tabular-nums transition-all"
              >
                {k}
              </button>
            ))}

            {allowDecimal ? (
              <button
                type="button"
                onClick={handleDecimal}
                className="h-16 rounded-xl border border-slate-200 bg-[#F8FAFC] hover:bg-slate-100 active:scale-[0.98] text-2xl font-bold text-[#0F172A] transition-all"
              >
                .
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClear}
                className="h-16 rounded-xl border border-slate-200 bg-[#F8FAFC] hover:bg-slate-100 active:scale-[0.98] text-sm font-bold text-[#64748B] transition-all"
              >
                CLR
              </button>
            )}

            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-16 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 active:scale-[0.98] text-xl font-bold text-[#0F172A] tabular-nums transition-all"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              aria-label="Backspace"
              className="h-16 rounded-xl border border-slate-200 bg-[#F8FAFC] hover:bg-slate-100 active:scale-[0.98] text-[#0F172A] flex items-center justify-center transition-all"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleClear}
              className="min-h-[52px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-bold text-[#0F172A] transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="min-h-[52px] rounded-xl bg-[#10B981] hover:bg-[#059669] active:scale-[0.98] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Check className="w-5 h-5" />
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
