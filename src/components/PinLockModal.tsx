import React, { useEffect, useState } from 'react';
import { Delete, Lock, X } from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  expectedPin: string;
  targetLabel: string;
  onUnlock: () => void;
  onClose: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  expectedPin,
  targetLabel,
  onUnlock,
  onClose,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Backspace') {
        setError('');
        setPin((prev) => prev.slice(0, -1));
      } else if (/^[0-9]$/.test(e.key)) {
        pushDigit(e.key);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (!isOpen) return null;

  const pushDigit = (digit: string) => {
    setError('');
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      const next = prev + digit;
      if (next.length === 4) {
        setTimeout(() => {
          if (next === expectedPin) {
            onUnlock();
          } else {
            setError('Incorrect Admin PIN. Try again.');
            setPin('');
          }
        }, 90);
      }
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#0F172A] text-white flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Admin PIN Required</h3>
              <p className="text-xs text-[#64748B]">Enter 4-digit PIN to open {targetLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close PIN modal"
            className="h-11 w-11 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 4-dot PIN indicator */}
          <div className="flex items-center justify-center gap-4 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const filled = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-full border-2 transition-all ${
                    filled
                      ? 'bg-[#0F172A] border-[#0F172A] scale-110'
                      : 'bg-white border-slate-300'
                  }`}
                />
              );
            })}
          </div>

          {error ? (
            <div className="text-center text-xs font-semibold text-[#EF4444] bg-[#FEF2F2] border border-[#FECACA] rounded-lg py-2 px-3">
              {error}
            </div>
          ) : (
            <div className="text-center text-xs text-[#64748B]">
              Default PIN is <span className="font-mono font-semibold text-[#0F172A]">1234</span> (changeable in Settings)
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => pushDigit(d)}
                className="h-16 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 active:scale-[0.98] text-xl font-bold text-[#0F172A] tabular-nums transition-all"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPin('');
                setError('');
              }}
              className="h-16 rounded-xl border border-slate-200 bg-[#F8FAFC] hover:bg-slate-100 text-xs font-bold text-[#64748B]"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => pushDigit('0')}
              className="h-16 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 active:scale-[0.98] text-xl font-bold text-[#0F172A] tabular-nums transition-all"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => {
                setError('');
                setPin((prev) => prev.slice(0, -1));
              }}
              aria-label="Backspace"
              className="h-16 rounded-xl border border-slate-200 bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] flex items-center justify-center"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
